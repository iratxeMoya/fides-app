import { getLecturaDelDia } from "@/lib/api/biblia";
import { normalizeRef } from "@/lib/api/universalis";
import { apiCache } from "@/lib/api/cache";
import {
  evangelizoResponseFixture,
  helloaoJohn10Fixture,
  helloaoActs4Fixture,
  helloaoMat9Fixture,
  helloaoRom4Fixture,
  helloaoPsalm16Fixture,
  universalisJsonpDomingoFixture,
  universalisJsonpFeriaFixture,
} from "../fixtures/googlePlacesFixture";

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

/**
 * Mock para el path fallback (CPBJR + HelloAO).
 * Prepende un fallo de Universalis para que la cadena caiga al fallback.
 */
function mockFallbackResponse() {
  mockFetch
    .mockResolvedValueOnce({ ok: false, status: 404 })                                  // universalis falla → fallback
    .mockResolvedValueOnce({ ok: true, json: async () => evangelizoResponseFixture })   // cpbjr
    .mockResolvedValueOnce({ ok: true, json: async () => helloaoJohn10Fixture })        // evangelio JHN/10
    .mockResolvedValueOnce({ ok: true, json: async () => helloaoActs4Fixture })         // primera ACT/4
    .mockResolvedValue({                                                                  // salmo + cualquier extra
      ok:   true,
      json: async () => ({
        chapter: {
          number: 118,
          content: [{ type: "verse", number: 1, content: [{ text: "Den gracias al Señor." }] }],
        },
      }),
    });
}

/**
 * Mock para el path Universalis (domingo con 2ª lectura).
 * Universalis responde correctamente; HelloAO sirve los textos en español.
 */
function mockUniversalisDomingoResponse() {
  mockFetch
    .mockResolvedValueOnce({ ok: true, text: async () => universalisJsonpDomingoFixture })  // universalis
    .mockResolvedValueOnce({ ok: true, json: async () => helloaoMat9Fixture })              // evangelio MAT/9
    .mockResolvedValueOnce({ ok: true, json: async () => helloaoActs4Fixture })             // primera HOS/6 (reutilizamos actas)
    .mockResolvedValueOnce({ ok: true, json: async () => helloaoPsalm16Fixture })           // salmo PSA/16
    .mockResolvedValue({ ok: true, json: async () => helloaoRom4Fixture });                 // segunda ROM/4
}

beforeEach(() => {
  jest.resetAllMocks();  // limpia implementaciones Y cola de mockResolvedValueOnce
  apiCache.clear();
});

// ─── normalizeRef ─────────────────────────────────────────────────────────────

describe("normalizeRef", () => {
  test("convierte en-dash HTML a guión normal", () => {
    expect(normalizeRef("1 Kings 18:20&#x2010;39")).toBe("1 Kings 18:20-39");
  });

  test("extrae numeración MT del salmo LXX(MT)", () => {
    expect(normalizeRef("Psalm 49(50):1,8,12-15")).toBe("Psalm 50:1,8,12-15");
    expect(normalizeRef("Psalm 15(16):1-2,4-5,8,11")).toBe("Psalm 16:1-2,4-5,8,11");
  });

  test("no altera referencias normales", () => {
    expect(normalizeRef("Matthew 9:9-13")).toBe("Matthew 9:9-13");
    expect(normalizeRef("Romans 4:18-25")).toBe("Romans 4:18-25");
  });
});

// ─── getLecturaDelDia — path Universalis ──────────────────────────────────────

describe("getLecturaDelDia — fuente Universalis", () => {
  test("usa Universalis cuando responde correctamente", async () => {
    mockUniversalisDomingoResponse();

    const result = await getLecturaDelDia(new Date(2026, 5, 7)); // domingo 7 junio

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.referencia).toBe("Matthew 9:9-13");
    expect(result.data.evangelio).toBe("Matthew 9:9-13");
    expect(result.data.texto.length).toBeGreaterThan(0);
  });

  test("incluye segundaLectura en domingo (Mass_R2 presente)", async () => {
    mockUniversalisDomingoResponse();

    const result = await getLecturaDelDia(new Date(2026, 5, 7));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.segundaLectura).toBeDefined();
    expect(result.data.segundaLectura?.referencia).toBe("Romans 4:18-25");
    expect(result.data.segundaLectura?.texto.length).toBeGreaterThan(0);
  });

  test("no incluye segundaLectura en feria (sin Mass_R2)", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, text: async () => universalisJsonpFeriaFixture })  // universalis feria
      .mockResolvedValueOnce({ ok: true, json: async () => helloaoMat9Fixture })            // evangelio
      .mockResolvedValueOnce({ ok: true, json: async () => helloaoActs4Fixture })           // primera
      .mockResolvedValue({ ok: true, json: async () => helloaoPsalm16Fixture });            // salmo

    const result = await getLecturaDelDia(new Date(2026, 5, 10));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.segundaLectura).toBeUndefined();
  });

  test("obtiene el salmo con versículos discontinuos (multi-rango)", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, text: async () => universalisJsonpFeriaFixture })  // universalis
      .mockResolvedValueOnce({ ok: true, json: async () => helloaoMat9Fixture })            // evangelio
      .mockResolvedValueOnce({ ok: true, json: async () => helloaoActs4Fixture })           // primera
      .mockResolvedValue({ ok: true, json: async () => helloaoPsalm16Fixture });            // salmo PSA/16

    const result = await getLecturaDelDia(new Date(2026, 5, 10));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // El salmo debe contener versículos de distintos rangos (v.1-2 y v.4-5 y v.8 y v.11)
    const salmoTexto = result.data.salmo?.texto ?? "";
    expect(salmoTexto).toContain("Protégeme, Dios mío");   // v.1
    expect(salmoTexto).toContain("Multiplicarán sus dolores"); // v.4
    expect(salmoTexto).toContain("Tengo siempre presente");   // v.8
  });
});

// ─── getLecturaDelDia — fallback CPBJR ───────────────────────────────────────

describe("getLecturaDelDia — fallback CPBJR", () => {
  test("devuelve titulo, referencia, texto y evangelio cuando las APIs responden correctamente", async () => {
    mockFallbackResponse();

    const result = await getLecturaDelDia(new Date(2025, 3, 27));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.titulo).toBe("Tiempo de Pascua");
    expect(result.data.referencia).toBe("John 10:11-18");
    expect(result.data.evangelio).toBe("John 10:11-18");
    expect(typeof result.data.texto).toBe("string");
    expect(result.data.texto.length).toBeGreaterThan(0);
    expect(result.data.colorLiturgico).toBe("blanco");
  });

  test("incluye primeraLectura y salmo cuando las APIs los devuelven", async () => {
    mockFallbackResponse();

    const result = await getLecturaDelDia(new Date(2025, 3, 27));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.primeraLectura).toBeDefined();
    expect(result.data.primeraLectura?.referencia).toBe("Acts 4:8-12");
    expect(result.data.salmo).toBeDefined();
    expect(result.data.salmo?.referencia).toBe("Psalm 118:1, 8-9, 21-23, 26, 28, 29");
  });

  test("incluye segundaLectura cuando CPBJR la devuelve", async () => {
    const cpbjrConSegundaFixture = {
      ...evangelizoResponseFixture,
      readings: {
        ...evangelizoResponseFixture.readings,
        secondReading: "Romans 4:18-25",
      },
    };

    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404 })                                           // universalis falla
      .mockResolvedValueOnce({ ok: true, json: async () => cpbjrConSegundaFixture })               // cpbjr con segunda
      .mockResolvedValueOnce({ ok: true, json: async () => helloaoJohn10Fixture })                 // evangelio
      .mockResolvedValueOnce({ ok: true, json: async () => helloaoActs4Fixture })                  // primera
      .mockResolvedValueOnce({ ok: true, json: async () => helloaoPsalm16Fixture })                // salmo
      .mockResolvedValue({ ok: true, json: async () => helloaoRom4Fixture });                      // segunda ROM/6

    const result = await getLecturaDelDia(new Date(2025, 3, 27));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.segundaLectura).toBeDefined();
    expect(result.data.segundaLectura?.referencia).toBe("Romans 4:18-25");
  });

  test("devuelve error cuando el leccionario responde 500", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })  // universalis 500
      .mockResolvedValueOnce({ ok: false, status: 500 }); // cpbjr fallback 500

    const result = await getLecturaDelDia(new Date(2025, 3, 27));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(typeof result.error).toBe("string");
    expect(result.error).toContain("500");
  });

  test("devuelve error cuando el JSON del leccionario no tiene el campo del Evangelio", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404 })  // universalis falla
      .mockResolvedValueOnce({
        ok:   true,
        json: async () => ({
          date: "2025-06-02",
          season: "Ordinary Time",
          readings: { firstReading: "Romans 1:1-7" },  // Sin gospel
        }),
      });

    const result = await getLecturaDelDia(new Date(2025, 5, 2));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("Evangelio");
  });

  test("devuelve error cuando el JSON de respuesta es inválido", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404 })  // universalis falla
      .mockResolvedValueOnce({
        ok:   true,
        json: async () => { throw new SyntaxError("Unexpected token"); },
      });

    const result = await getLecturaDelDia(new Date(2025, 5, 2));

    expect(result.ok).toBe(false);
  });

  test("cachea el resultado — la segunda llamada no hace fetch adicional", async () => {
    mockFallbackResponse();

    const date = new Date(2025, 3, 27);
    await getLecturaDelDia(date);
    const fetchCountAfterFirst = mockFetch.mock.calls.length;
    expect(fetchCountAfterFirst).toBeGreaterThan(0);

    await getLecturaDelDia(date);
    expect(mockFetch).toHaveBeenCalledTimes(fetchCountAfterFirst);
  });

  test("dos fechas distintas hacen llamadas fetch separadas", async () => {
    mockFallbackResponse();
    mockFallbackResponse();

    await getLecturaDelDia(new Date(2025, 3, 27));
    const countAfterFirst = mockFetch.mock.calls.length;

    await getLecturaDelDia(new Date(2025, 3, 28));
    const countAfterSecond = mockFetch.mock.calls.length;

    expect(countAfterSecond).toBeGreaterThan(countAfterFirst);
  });
});

// ─── getLecturaDelDia — fallback desde Universalis a CPBJR ───────────────────

describe("getLecturaDelDia — fallback desde Universalis", () => {
  test("usa CPBJR cuando Universalis falla (fuera de ventana)", async () => {
    mockFallbackResponse(); // primer mock es universalis 404, luego cpbjr

    const result = await getLecturaDelDia(new Date(2025, 3, 27));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // El resultado viene del CPBJR (referencia de Juan 10)
    expect(result.data.referencia).toBe("John 10:11-18");
  });

  test("usa CPBJR cuando Universalis devuelve JSONP inválido", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, text: async () => "NOT_JSONP_AT_ALL" })               // universalis formato roto
      .mockResolvedValueOnce({ ok: true, json: async () => evangelizoResponseFixture })        // cpbjr fallback
      .mockResolvedValueOnce({ ok: true, json: async () => helloaoJohn10Fixture })             // evangelio
      .mockResolvedValueOnce({ ok: true, json: async () => helloaoActs4Fixture })              // primera
      .mockResolvedValue({ ok: true, json: async () => helloaoPsalm16Fixture });               // salmo

    const result = await getLecturaDelDia(new Date(2025, 3, 27));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.referencia).toBe("John 10:11-18");
  });
});
