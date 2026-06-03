import { getLecturaDelDia } from "@/lib/api/biblia";
import { apiCache } from "@/lib/api/cache";
import {
  evangelizoResponseFixture,
  helloaoJohn10Fixture,
  helloaoActs4Fixture,
} from "../fixtures/googlePlacesFixture";

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Helper: cpbjr → helloao JHN → helloao ACT → helloao PSA (4 mocks for a full response)
function mockFullResponse() {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => evangelizoResponseFixture })  // cpbjr
    .mockResolvedValueOnce({ ok: true, json: async () => helloaoJohn10Fixture })       // gospel
    .mockResolvedValueOnce({ ok: true, json: async () => helloaoActs4Fixture })        // first reading
    .mockResolvedValue({                                                                 // psalm (+ any extra)
      ok:   true,
      json: async () => ({
        chapter: {
          number: 118,
          content: [{ type: "verse", number: 1, content: [{ text: "Den gracias al Señor." }] }],
        },
      }),
    });
}

beforeEach(() => {
  jest.clearAllMocks();
  apiCache.clear();
});

// ─── getLecturaDelDia ─────────────────────────────────────────────────────────

describe("getLecturaDelDia", () => {
  test("devuelve titulo, referencia, texto y evangelio cuando las APIs responden correctamente", async () => {
    mockFullResponse();

    const result = await getLecturaDelDia(new Date(2025, 3, 27));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // titulo y colorLiturgico se derivan del calendario litúrgico (abril 27 = Tiempo de Pascua)
    expect(result.data.titulo).toBe("Tiempo de Pascua");
    expect(result.data.referencia).toBe("John 10:11-18");
    expect(result.data.evangelio).toBe("John 10:11-18");
    expect(typeof result.data.texto).toBe("string");
    expect(result.data.texto.length).toBeGreaterThan(0);
    expect(result.data.colorLiturgico).toBe("blanco");
  });

  test("incluye primeraLectura y salmo cuando las APIs los devuelven", async () => {
    mockFullResponse();

    const result = await getLecturaDelDia(new Date(2025, 3, 27));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.primeraLectura).toBeDefined();
    expect(result.data.primeraLectura?.referencia).toBe("Acts 4:8-12");
    expect(result.data.salmo).toBeDefined();
    expect(result.data.salmo?.referencia).toBe("Psalm 118:1, 8-9, 21-23, 26, 28, 29");
  });

  test("devuelve error legible (no un objeto Error crudo) cuando el leccionario responde 500", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    const result = await getLecturaDelDia(new Date(2025, 3, 27));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(typeof result.error).toBe("string");
    expect(result.error).toContain("500");
  });

  test("devuelve error cuando el JSON del leccionario no tiene el campo del Evangelio", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => ({
        date: "2025-06-02",
        monthDay: "6/2",
        season: "Ordinary Time",
        readings: {
          firstReading: "Romans 1:1-7",
          // Sin gospel
        },
      }),
    });

    const result = await getLecturaDelDia(new Date(2025, 5, 2));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("Evangelio");
  });

  test("devuelve error cuando el JSON de respuesta es inválido (respuesta no JSON)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => { throw new SyntaxError("Unexpected token"); },
    });

    const result = await getLecturaDelDia(new Date(2025, 5, 2));

    expect(result.ok).toBe(false);
  });

  test("cachea el resultado — la segunda llamada no hace fetch adicional", async () => {
    mockFullResponse();

    const date = new Date(2025, 3, 27);
    await getLecturaDelDia(date);
    const fetchCountAfterFirst = mockFetch.mock.calls.length;
    expect(fetchCountAfterFirst).toBeGreaterThan(0);

    await getLecturaDelDia(date);
    // La segunda llamada usa caché — no se hacen nuevas llamadas
    expect(mockFetch).toHaveBeenCalledTimes(fetchCountAfterFirst);
  });

  test("dos fechas distintas hacen llamadas fetch separadas", async () => {
    mockFullResponse();
    mockFullResponse(); // segunda tanda para la segunda fecha

    await getLecturaDelDia(new Date(2025, 3, 27));
    const countAfterFirst = mockFetch.mock.calls.length;

    await getLecturaDelDia(new Date(2025, 3, 28));
    const countAfterSecond = mockFetch.mock.calls.length;

    expect(countAfterSecond).toBeGreaterThan(countAfterFirst);
  });
});
