import {
  searchChurchesNearby,
  searchChurchesByQuery,
  getChurchDetails,
  parseOsmOpeningHours,
} from "@/lib/api/iglesias";
import { apiCache } from "@/lib/api/cache";
import {
  overpassNearbyResponseFixture,
  overpassZeroResultsFixture,
  overpassDetailResponseFixture,
} from "../fixtures/overpassFixture";

// La BD no está disponible en el entorno Jest — mockeamos las queries de iglesias
jest.mock("@/lib/db/client", () => ({ db: {} }));
jest.mock("@/lib/db/queries", () => ({
  saveIglesia:    jest.fn().mockResolvedValue(""),
  getIglesiaById: jest.fn().mockResolvedValue(null),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

beforeEach(() => {
  jest.clearAllMocks();
  apiCache.clear();
});

// ─── searchChurchesNearby ─────────────────────────────────────────────────────

describe("searchChurchesNearby", () => {
  test("mapea correctamente nombre, lat, lng e id desde la respuesta de Overpass", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => overpassNearbyResponseFixture,
    });

    const result = await searchChurchesNearby(40.4168, -3.7038);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const primera = result.data[0];
    expect(primera.id).toBe("node:123456789");
    expect(primera.nombre).toBe("Catedral de la Almudena");
    expect(primera.lat).toBe(40.4150);
    expect(primera.lng).toBe(-3.7143);
  });

  test("devuelve array vacío (no throw) cuando Overpass devuelve 0 elementos", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => overpassZeroResultsFixture,
    });

    const result = await searchChurchesNearby(0, 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(0);
  });

  test("el caché evita un segundo fetch para las mismas coordenadas dentro del TTL", async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      json: async () => overpassNearbyResponseFixture,
    });

    await searchChurchesNearby(40.4168, -3.7038);
    await searchChurchesNearby(40.4168, -3.7038);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("coordenadas distintas generan dos llamadas fetch independientes", async () => {
    mockFetch.mockResolvedValue({
      ok:   true,
      json: async () => overpassNearbyResponseFixture,
    });

    await searchChurchesNearby(40.4168, -3.7038);
    await searchChurchesNearby(41.3879, 2.1699); // Barcelona

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ─── searchChurchesByQuery ────────────────────────────────────────────────────

describe("searchChurchesByQuery", () => {
  test("una query vacía devuelve array vacío sin hacer fetch", async () => {
    const result = await searchChurchesByQuery("  ");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("sin ubicación devuelve array vacío sin hacer fetch", async () => {
    const result = await searchChurchesByQuery("San Isidro");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ─── getChurchDetails ─────────────────────────────────────────────────────────

describe("getChurchDetails", () => {
  test("parsea opening_hours OSM en formato HorarioMisa correctamente", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => overpassDetailResponseFixture,
    });

    const result = await getChurchDetails("node:123456789");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { horarios } = result.data;
    expect(horarios.length).toBeGreaterThan(0);

    const domingo = horarios.find((h) => h.dia === "Domingo");
    expect(domingo).toBeDefined();
    expect(domingo!.horas.length).toBeGreaterThan(0);

    const lunes = horarios.find((h) => h.dia === "Lunes");
    expect(lunes).toBeDefined();
  });

  test("fotosRefs es siempre array vacío (OSM no provee fotos)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => overpassDetailResponseFixture,
    });

    const result = await getChurchDetails("node:123456789");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.fotosRefs).toHaveLength(0);
  });
});

// ─── parseOsmOpeningHours ─────────────────────────────────────────────────────

describe("parseOsmOpeningHours", () => {
  test("convierte un rango semanal en horarios de misa estimados", () => {
    const result = parseOsmOpeningHours("Mo-Fr 09:00-19:00");

    expect(result).toHaveLength(5);
    const lunes = result.find((h) => h.dia === "Lunes");
    expect(lunes).toBeDefined();
    expect(lunes!.horas.length).toBeGreaterThan(0);
  });

  test("maneja múltiples reglas separadas por punto y coma", () => {
    const result = parseOsmOpeningHours("Mo-Sa 09:00-20:00; Su 10:00-20:00");

    expect(result).toHaveLength(7);
    const domingo = result.find((h) => h.dia === "Domingo");
    expect(domingo).toBeDefined();
  });

  test("agrupa días repetidos y elimina duplicados de hora", () => {
    // Dos reglas para el mismo día: domingo mañana + tarde
    const result = parseOsmOpeningHours("Su 09:00-11:00; Su 18:00-20:00");

    const domingo = result.find((h) => h.dia === "Domingo");
    expect(domingo).toBeDefined();
    const unique = new Set(domingo!.horas);
    expect(unique.size).toBe(domingo!.horas.length);
  });

  test("ordena los días comenzando por Lunes y terminando por Domingo", () => {
    const result = parseOsmOpeningHours("Mo-Su 08:00-20:00");
    const dias = result.map((h) => h.dia);

    expect(dias[0]).toBe("Lunes");
    expect(dias[dias.length - 1]).toBe("Domingo");
  });

  test("devuelve array vacío si el formato no contiene horarios reconocibles", () => {
    const result = parseOsmOpeningHours("horario especial");
    expect(result).toHaveLength(0);
  });
});
