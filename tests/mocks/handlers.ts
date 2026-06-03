import { http, HttpResponse } from "msw";
import {
  evangelizoResponseFixture,
  helloaoJohn10Fixture,
  helloaoActs4Fixture,
} from "../fixtures/googlePlacesFixture";
import {
  overpassNearbyResponseFixture,
  overpassDetailResponseFixture,
} from "../fixtures/overpassFixture";

/**
 * Handlers de MSW para interceptar las llamadas de red reales en los tests
 * de integración. Devuelven respuestas de fixture predecibles y deterministas.
 */
export const handlers = [
  // ── cpbjr — referencias del leccionario diario ────────────────────────────
  http.get("https://cpbjr.github.io/catholic-readings-api/readings/:year/:mmdd", () => {
    return HttpResponse.json(evangelizoResponseFixture);
  }),

  // ── helloao — texto bíblico en español ───────────────────────────────────
  http.get("https://bible.helloao.org/api/spa_blm/JHN/:chapter.json", () => {
    return HttpResponse.json(helloaoJohn10Fixture);
  }),
  http.get("https://bible.helloao.org/api/spa_blm/ACT/:chapter.json", () => {
    return HttpResponse.json(helloaoActs4Fixture);
  }),
  http.get("https://bible.helloao.org/api/spa_blm/PSA/:chapter.json", () => {
    return HttpResponse.json({
      chapter: {
        number: 118,
        content: [
          { type: "verse", number: 1, content: [{ text: "Den gracias al Señor porque es bueno, porque su amor es eterno." }] },
        ],
      },
    });
  }),

  // ── Overpass API — búsqueda y detalles de iglesias ────────────────────────
  http.post("https://overpass-api.de/api/interpreter", async ({ request }) => {
    const body = await request.text();
    const isDetailQuery = body.includes("timeout:10");
    return HttpResponse.json(
      isDetailQuery ? overpassDetailResponseFixture : overpassNearbyResponseFixture
    );
  }),

  // ── Nominatim — geocodificación inversa ───────────────────────────────────
  http.get("https://nominatim.openstreetmap.org/reverse", () => {
    return HttpResponse.json({
      display_name: "Calle Bailén, s/n, Madrid, Comunidad de Madrid, España",
      address: {
        road: "Calle Bailén",
        city: "Madrid",
        state: "Comunidad de Madrid",
        postcode: "28071",
        country: "España",
        country_code: "es",
      },
    });
  }),

  // ── Nominatim — geocodificación directa ──────────────────────────────────
  http.get("https://nominatim.openstreetmap.org/search", () => {
    return HttpResponse.json([
      { lat: "40.4150", lon: "-3.7143", display_name: "Catedral de la Almudena, Madrid" },
    ]);
  }),

  // ── Anthropic API — Messages ─────────────────────────────────────────────
  http.post("https://api.anthropic.com/v1/messages", () => {
    return HttpResponse.json({
      id:      "msg_test_001",
      type:    "message",
      role:    "assistant",
      content: [{ type: "text", text: "«Dios es fiel, y no permitirá que seáis tentados sobre vuestras fuerzas» (1 Cor 10:13)" }],
      model:   "claude-haiku-4-5-20251001",
      stop_reason: "end_turn",
      usage: { input_tokens: 100, output_tokens: 40 },
    });
  }),
];
