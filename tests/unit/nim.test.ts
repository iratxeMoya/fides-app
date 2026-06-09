import { generarCitaNIM, enviarMensajeChatNIM } from "@/lib/api/nim";
import { apiCache } from "@/lib/api/cache";
import type { MensajeChatLocal } from "@/lib/api/chat";
import { Config } from "@/lib/utils/config";

// ─── Mock de Config ───────────────────────────────────────────────────────────
// La factory debe ser un literal — no puede capturar variables externas porque
// jest.mock() es hoisted por Babel antes de que se inicialicen los const.
// Mutamos la propiedad del objeto importado directamente en cada test.

jest.mock("@/lib/utils/config", () => ({
  Config: { nvidiaApiKey: "test-nvapi-key", esbiblicaApiKey: "", anthropicApiKey: "" },
}));

// ─── Mock de fetch ────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Respuesta NIM de cita (no-stream) */
function nimCitaResponse(content: string) {
  return {
    ok:   true,
    text: async () => "",
    json: async () => ({
      choices: [{ message: { content } }],
    }),
  };
}

/** Respuesta NIM de chat streaming (fallback sin ReadableStream) */
function nimStreamResponse(chunks: string[]) {
  const lines = [
    ...chunks.map((c) =>
      `data: ${JSON.stringify({ choices: [{ delta: { content: c }, finish_reason: null }] })}`,
    ),
    "data: [DONE]",
  ].join("\n");

  return {
    ok:   true,
    body: null, // fuerza el path de fallback (sin ReadableStream)
    text: async () => lines,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  apiCache.clear();
  (Config as any).nvidiaApiKey = "test-nvapi-key";
});

// ─── generarCitaNIM ───────────────────────────────────────────────────────────

describe("generarCitaNIM", () => {
  test("llama a la API NIM con Authorization Bearer y parsea choices[0].message.content", async () => {
    mockFetch.mockResolvedValueOnce(nimCitaResponse("El Señor es mi pastor."));

    const result = await generarCitaNIM("Y Jesús dijo: Yo soy el camino.", new Date("2025-06-01"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.texto).toBe("El Señor es mi pastor.");
    expect(result.data.fecha).toBe("2025-06-01");

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://integrate.api.nvidia.com/v1/chat/completions");
    expect((options.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-nvapi-key");
    expect(JSON.parse(options.body as string).stream).toBe(false);
  });

  test("devuelve error cuando la API key no está configurada", async () => {
    (Config as any).nvidiaApiKey = "";

    const result = await generarCitaNIM("texto del evangelio");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("NVIDIA_NIM_API_KEY");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("devuelve error legible cuando la API responde 401", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:     false,
      status: 401,
      text:   async () => "Unauthorized",
    });

    const result = await generarCitaNIM("texto del evangelio");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("401");
  });

  test("devuelve error cuando la respuesta no tiene contenido", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      text: async () => "",
      json: async () => ({ choices: [] }),
    });

    const result = await generarCitaNIM("texto del evangelio");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("vacía");
  });

  test("cachea el resultado — la segunda llamada no hace fetch", async () => {
    mockFetch.mockResolvedValue(nimCitaResponse("Frase contemplativa."));

    const date = new Date("2025-06-01");
    await generarCitaNIM("evangelio", date);
    const callsAfterFirst = mockFetch.mock.calls.length;

    await generarCitaNIM("evangelio", date);
    expect(mockFetch).toHaveBeenCalledTimes(callsAfterFirst); // sin llamadas nuevas
  });
});

// ─── enviarMensajeChatNIM ─────────────────────────────────────────────────────

describe("enviarMensajeChatNIM", () => {
  const mensajes: MensajeChatLocal[] = [
    { id: "1", role: "user", content: "¿Qué significa este pasaje?" },
  ];
  const systemPrompt = "Eres un guía espiritual.";

  test("llama a la API con stream:true, Bearer auth y system como primer mensaje", async () => {
    mockFetch.mockResolvedValueOnce(nimStreamResponse(["Hola"]));

    const gen = enviarMensajeChatNIM(mensajes, systemPrompt);
    await gen.next();

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);

    expect(url).toBe("https://integrate.api.nvidia.com/v1/chat/completions");
    expect((options.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-nvapi-key");
    expect(body.stream).toBe(true);
    expect(body.messages[0]).toEqual({ role: "system", content: systemPrompt });
    expect(body.messages[1]).toEqual({ role: "user", content: "¿Qué significa este pasaje?" });
  });

  test("parsea correctamente fragmentos SSE de choices[0].delta.content", async () => {
    mockFetch.mockResolvedValueOnce(nimStreamResponse(["La ", "luz ", "del mundo."]));

    const chunks: string[] = [];
    for await (const chunk of enviarMensajeChatNIM(mensajes, systemPrompt)) {
      chunks.push(chunk);
    }

    expect(chunks.join("")).toBe("La luz del mundo.");
  });

  test("yield mensaje de error cuando la API key no está configurada", async () => {
    (Config as any).nvidiaApiKey = "";

    const chunks: string[] = [];
    for await (const chunk of enviarMensajeChatNIM(mensajes, systemPrompt)) {
      chunks.push(chunk);
    }

    expect(mockFetch).not.toHaveBeenCalled();
    expect(chunks[0]).toContain("NVIDIA NIM");
  });

  test("lanza error cuando la API responde 403", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:     false,
      status: 403,
      text:   async () => "Forbidden",
    });

    await expect(async () => {
      for await (const _ of enviarMensajeChatNIM(mensajes, systemPrompt)) { /* consumir */ }
    }).rejects.toThrow("403");
  });

  test("ignora líneas SSE mal formadas y no lanza", async () => {
    const response = {
      ok:   true,
      body: null,
      text: async () => [
        "data: INVALID_JSON",
        `data: ${JSON.stringify({ choices: [{ delta: { content: "válido" } }] })}`,
        "data: [DONE]",
      ].join("\n"),
    };
    mockFetch.mockResolvedValueOnce(response);

    const chunks: string[] = [];
    for await (const chunk of enviarMensajeChatNIM(mensajes, systemPrompt)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["válido"]);
  });
});
