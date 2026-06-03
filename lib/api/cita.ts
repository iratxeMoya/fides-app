/**
 * Genera una cita contemplativa a partir del texto del Evangelio del día.
 * Usa Claude Haiku vía la Messages API (fetch directo, sin SDK).
 *
 * SEGURIDAD: En producción, esta llamada debe pasar por un endpoint propio
 * para no exponer ANTHROPIC_API_KEY en el bundle de la app.
 */

import { ok, err, tryCatch, type Result } from "./result";
import { apiCache, TTL_24H } from "./cache";
import { Config } from "@/lib/utils/config";

const URL_CLAUDE   = "https://api.anthropic.com/v1/messages";
const MODEL        = "claude-haiku-4-5-20251001";
const MAX_TOKENS   = 80;
const MAX_CHARS    = 500; // recorte del evangelio para el prompt

export type CitaInspirada = {
  texto: string;
  /** Fecha para la que se generó, en formato "YYYY-MM-DD" */
  fecha: string;
};

function fechaISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Devuelve una frase contemplativa (≤20 palabras) extraída del Evangelio.
 * Cachea el resultado 24 h porque el texto del día no cambia.
 *
 * @param textoEvangelio — Texto completo del Evangelio del día
 * @param date           — Fecha para usarla como clave de caché (por defecto hoy)
 */
export async function generarCitaInspiradora(
  textoEvangelio: string,
  date: Date = new Date()
): Promise<Result<CitaInspirada>> {
  const apiKey = Config.anthropicApiKey;
  if (!apiKey) {
    return err("ANTHROPIC_API_KEY no está configurada");
  }

  const fecha    = fechaISO(date);
  const cacheKey = `cita-inspirada:${fecha}`;

  const cached = apiCache.get<CitaInspirada>(cacheKey);
  if (cached) return ok(cached);

  return tryCatch(async () => {
    const fragmento = textoEvangelio.slice(0, MAX_CHARS).trim();

    const body = {
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content:
            `Del siguiente fragmento del Evangelio del día, escribe UNA SOLA frase ` +
            `contemplativa en español de máximo 20 palabras. Debe ser serena, profunda ` +
            `y apta para la oración. Solo devuelve la frase, sin comillas ni explicaciones.\n\n` +
            `Evangelio:\n${fragmento}`,
        },
      ],
    };

    const res = await fetch(URL_CLAUDE, {
      method:  "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Claude API respondió ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    const texto = (data?.content?.[0]?.text as string | undefined)?.trim();

    if (!texto) throw new Error("La API devolvió una respuesta vacía");

    const cita: CitaInspirada = { texto, fecha };
    apiCache.set(cacheKey, cita, TTL_24H);
    return cita;
  }, "generarCitaInspiradora");
}
