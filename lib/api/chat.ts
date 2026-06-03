/**
 * Chat de reflexión espiritual vía Anthropic Haiku con streaming SSE.
 *
 * ADVERTENCIA DE SEGURIDAD: La clave API viaja en el cliente.
 * En producción, enruta esta llamada a través de tu propio backend.
 */

import { Config } from "@/lib/utils/config";
import type { LecturaDelDia } from "./biblia";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type MensajeChatLocal = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const MODEL      = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 600;
const API_URL    = "https://api.anthropic.com/v1/messages";

// ─── System prompt ────────────────────────────────────────────────────────────

export function buildSystemPromptLectura(lectura: LecturaDelDia): string {
  const extracto = lectura.texto.slice(0, 800);
  return (
    "Eres un guía espiritual católico. " +
    `Ayuda al usuario a reflexionar sobre esta lectura del día: "${extracto}". ` +
    "Sé conciso, profundo y accesible. " +
    "No inventes teología. " +
    "Responde siempre en español y en menos de 150 palabras."
  );
}

// ─── Streaming generator ──────────────────────────────────────────────────────

/**
 * Envía mensajes al LLM y devuelve un generador asíncrono que produce
 * fragmentos de texto a medida que llegan por SSE.
 *
 * @param mensajes     — historial de mensajes del chat (incluye el último del usuario)
 * @param systemPrompt — contexto del sistema con el texto del Evangelio
 * @param signal       — AbortSignal para cancelar la petición
 */
export async function* enviarMensajeChat(
  mensajes: MensajeChatLocal[],
  systemPrompt: string,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const key = Config.anthropicApiKey;
  if (!key) {
    yield "La API key de Anthropic no está configurada. Añade ANTHROPIC_API_KEY a tu .env.";
    return;
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type":    "application/json",
      "x-api-key":       key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      stream:     true,
      system:     systemPrompt,
      messages:   mensajes.map((m) => ({ role: m.role, content: m.content })),
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Error ${response.status}: ${errorText}`);
  }

  // ── Streaming vía ReadableStream (Hermes / RN 0.76+) ──────────────────────
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
              type: string;
              delta?: { type: string; text: string };
            };
            if (
              event.type === "content_block_delta" &&
              event.delta?.type === "text_delta" &&
              event.delta.text
            ) {
              yield event.delta.text;
            }
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
    try {
      const event = JSON.parse(line.slice(6)) as {
        type: string;
        delta?: { type: string; text: string };
      };
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) {
        fullText += event.delta.text;
      }
    } catch {
      // ignorar
    }
  }
  if (fullText) yield fullText;
}
