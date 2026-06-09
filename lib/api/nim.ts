/**
 * Proveedor NVIDIA NIM para reflexión espiritual.
 * API compatible con OpenAI — autenticación Bearer, SSE con choices[0].delta.content.
 *
 * Gestión de rate limit (40 RPM): reintentos automáticos con espera. El caller
 * puede suscribirse a `onRateLimited` para mostrar al usuario un aviso.
 */

import { Config } from "@/lib/utils/config";
import { ok, err, tryCatch, type Result } from "./result";
import { apiCache, TTL_24H } from "./cache";
import type { MensajeChatLocal } from "./chat";
import type { LecturaDelDia } from "./biblia";

// ─── Constantes ───────────────────────────────────────────────────────────────

const NIM_CHAT_URL    = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL           = "meta/llama-3.1-8b-instruct";
const MAX_TOKENS_CHAT = 600;
const MAX_TOKENS_CITA = 80;
const MAX_CHARS_CITA  = 500;
const MAX_RETRIES     = 2;
// Espera máxima por intento aunque retry-after diga más (ms)
const MAX_ESPERA_MS   = 30_000;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CitaInspiradaNIM = {
  texto: string;
  fecha: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

function retryAfterMs(headers: Headers): number {
  const raw = headers.get("retry-after") ?? headers.get("x-ratelimit-reset-requests");
  const seg = parseInt(raw ?? "15", 10);
  return Math.min((isNaN(seg) ? 15 : seg) * 1000, MAX_ESPERA_MS);
}

// ─── System prompt ────────────────────────────────────────────────────────────

export function buildSystemPromptNIM(lectura: LecturaDelDia): string {
  const extracto = lectura.texto.slice(0, 800);
  return [
    "Eres un guía espiritual católico experto en lectio divina.",
    "Acompañas al usuario en la reflexión sobre la lectura del día MEDIANTE PREGUNTAS, no mediante explicaciones ni sermones.",
    `Lectura del día: "${extracto}"`,
    "Reglas que debes seguir siempre:",
    "- Cada respuesta termina con UNA sola pregunta breve que invite a profundizar.",
    "- Máximo 60 palabras por respuesta.",
    "- Habla de tú, con calidez y cercanía.",
    "- No expliques teología salvo que el usuario lo pida explícitamente.",
    "- Si el usuario comparte algo personal, acógelo primero antes de preguntar.",
    "- Responde siempre en español.",
    "Cuando recibas 'Inicia la reflexión', abre con una sola pregunta sobre lo que este texto puede despertar en el usuario hoy.",
  ].join(" ");
}

// ─── Streaming chat ───────────────────────────────────────────────────────────

/**
 * Envía mensajes al modelo NIM y devuelve un generador asíncrono con fragmentos
 * de texto. Reintenta automáticamente hasta MAX_RETRIES veces si recibe 429.
 *
 * @param onRateLimited  Llamado con `true` al entrar en espera, `false` al salir.
 */
export async function* enviarMensajeChatNIM(
  mensajes:       MensajeChatLocal[],
  systemPrompt:   string,
  signal?:        AbortSignal,
  onRateLimited?: (esperando: boolean) => void,
): AsyncGenerator<string, void, unknown> {
  const key = Config.nvidiaApiKey;
  if (!key) {
    yield "La API key de NVIDIA NIM no está configurada.";
    return;
  }

  let intentos = 0;

  while (true) {
    const response = await fetch(NIM_CHAT_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: MAX_TOKENS_CHAT,
        stream:     true,
        messages: [
          { role: "system", content: systemPrompt },
          ...mensajes.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
      signal,
    });

    // ── Rate limit: esperar y reintentar ──────────────────────────────────────
    if (response.status === 429 && intentos < MAX_RETRIES) {
      intentos++;
      const esperaMs = retryAfterMs(response.headers);
      onRateLimited?.(true);
      await sleep(esperaMs, signal);
      onRateLimited?.(false);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    // ── Streaming vía ReadableStream (Hermes / RN 0.76+) ─────────────────────
    if (response.body) {
      const reader  = (response.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") return;

            try {
              const event = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
              };
              const chunk = event.choices?.[0]?.delta?.content;
              if (chunk) yield chunk;
            } catch {
              // línea SSE mal formada — ignorar
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      return;
    }

    // ── Fallback: sin ReadableStream, parsea la respuesta completa ────────────
    const text = await response.text();
    let fullText = "";
    for (const line of text.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;
      try {
        const event = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const chunk = event.choices?.[0]?.delta?.content;
        if (chunk) fullText += chunk;
      } catch {
        // ignorar
      }
    }
    if (fullText) yield fullText;
    return;
  }
}

// ─── Cita contemplativa (sin streaming) ──────────────────────────────────────

/**
 * Genera una frase contemplativa (≤20 palabras) a partir del Evangelio del día.
 * Reintenta silenciosamente hasta MAX_RETRIES veces si recibe 429.
 */
export async function generarCitaNIM(
  textoEvangelio: string,
  date: Date = new Date(),
): Promise<Result<CitaInspiradaNIM>> {
  const apiKey = Config.nvidiaApiKey;
  if (!apiKey) return err("NVIDIA_NIM_API_KEY no está configurada");

  const fecha    = date.toISOString().split("T")[0];
  const cacheKey = `cita-nim:${fecha}`;

  const cached = apiCache.get<CitaInspiradaNIM>(cacheKey);
  if (cached) return ok(cached);

  return tryCatch(async () => {
    const fragmento = textoEvangelio.slice(0, MAX_CHARS_CITA).trim();
    let intentos    = 0;

    while (true) {
      const res = await fetch(NIM_CHAT_URL, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model:      MODEL,
          max_tokens: MAX_TOKENS_CITA,
          stream:     false,
          messages: [
            {
              role:    "user",
              content:
                "Del siguiente fragmento del Evangelio del día, escribe UNA SOLA frase " +
                "contemplativa en español de máximo 20 palabras. Debe ser serena, profunda " +
                "y apta para la oración. Solo devuelve la frase, sin comillas ni explicaciones.\n\n" +
                `Evangelio:\n${fragmento}`,
            },
          ],
        }),
      });

      if (res.status === 429 && intentos < MAX_RETRIES) {
        intentos++;
        await sleep(retryAfterMs(res.headers));
        continue;
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`NIM API respondió ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const data  = await res.json();
      const texto = (data?.choices?.[0]?.message?.content as string | undefined)?.trim();

      if (!texto) throw new Error("La API devolvió una respuesta vacía");

      const cita: CitaInspiradaNIM = { texto, fecha };
      apiCache.set(cacheKey, cita, TTL_24H);
      return cita;
    }
  }, "generarCitaNIM");
}
