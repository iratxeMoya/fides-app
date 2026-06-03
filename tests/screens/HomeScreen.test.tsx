/**
 * Tests de la pantalla de Inicio (app/(tabs)/index.tsx).
 *
 * Todas las dependencias externas se mockean:
 *   - expo-location (permiso de ubicación)
 *   - @/lib/api/biblia (lectura del día)
 *   - @/lib/api/iglesias (búsqueda de iglesias)
 *   - @/lib/api/cita (cita inspiradora)
 */

import React from "react";
import { render, act, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";

// Mocks de APIs
jest.mock("@/lib/api/biblia");
jest.mock("@/lib/api/iglesias");
jest.mock("@/lib/api/cita");

import { getLecturaDelDia } from "@/lib/api/biblia";
import { searchChurchesNearby, getChurchDetails } from "@/lib/api/iglesias";
import { generarCitaInspiradora } from "@/lib/api/cita";
import { lecturaFixture } from "../fixtures/lecturaFixture";
import { iglesiaBasicaFixture, iglesiaDetalleFixture } from "../fixtures/iglesiaFixture";

const mockGetLecturaDelDia      = getLecturaDelDia      as jest.MockedFunction<typeof getLecturaDelDia>;
const mockSearchChurchesNearby  = searchChurchesNearby  as jest.MockedFunction<typeof searchChurchesNearby>;
const mockGetChurchDetails      = getChurchDetails      as jest.MockedFunction<typeof getChurchDetails>;
const mockGenerarCita           = generarCitaInspiradora as jest.MockedFunction<typeof generarCitaInspiradora>;

// Importar después de los mocks
import HomeScreen from "@/app/(tabs)/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Avanza los fake timers lo suficiente para que las animaciones y promesas resuelvan. */
async function flushAsync() {
  // Advance 2 s of fake time — covers STAGGER_MS * N_SECCIONES + FADE_MS.
  // Animated.timing uses requestAnimationFrame (faked as setTimeout),
  // so a bounded advance avoids the infinite-loop that runAllTimers() triggers.
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
}

// ─── Setup por defecto ────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Fake timers: needed for jest.setSystemTime() and to control animations.
  jest.useFakeTimers();

  // Respuestas por defecto — happy path
  mockGetLecturaDelDia.mockResolvedValue({ ok: true, data: lecturaFixture });
  mockSearchChurchesNearby.mockResolvedValue({
    ok:   true,
    data: [{ ...iglesiaBasicaFixture, lat: 40.415, lng: -3.714 }],
  });
  mockGetChurchDetails.mockResolvedValue({ ok: true, data: iglesiaDetalleFixture });
  mockGenerarCita.mockResolvedValue({
    ok:   true,
    data: { texto: "«El Señor es mi Pastor, nada me falta»" },
  });

  // Ubicación concedida por defecto
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    status: "granted",
  });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 40.4168, longitude: -3.7038, accuracy: 10 },
    timestamp: Date.now(),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("HomeScreen", () => {
  test("muestra un skeleton de carga mientras se obtiene la lectura del día", async () => {
    // Delay infinito para que la lectura no resuelva
    mockGetLecturaDelDia.mockReturnValue(new Promise(() => {}));

    const { queryByText } = render(<HomeScreen />);

    // El título de la lectura NO debe estar aún en pantalla
    expect(queryByText(lecturaFixture.titulo)).toBeNull();
  });

  test("muestra el título de la lectura una vez que carga", async () => {
    const { findByText } = render(<HomeScreen />);

    await flushAsync();

    await waitFor(
      () => expect(findByText(lecturaFixture.titulo)).resolves.toBeTruthy(),
      { timeout: 3000 }
    );
  });

  test("muestra PreceptoCard cuando hoy es un día de precepto (Inmaculada Concepción)", async () => {
    // 8 de diciembre de 2025
    jest.setSystemTime(new Date(2025, 11, 8));

    const { findByText } = render(<HomeScreen />);
    await flushAsync();

    // PreceptoCard debería mostrar el nombre del precepto
    await waitFor(
      () => expect(findByText(/Inmaculada Concepción/i)).resolves.toBeTruthy(),
      { timeout: 3000 }
    );
  });

  test("NO muestra PreceptoCard en un lunes ordinario (2 junio 2025)", async () => {
    jest.setSystemTime(new Date(2025, 5, 2));

    const { queryByText } = render(<HomeScreen />);
    await flushAsync();

    // No hay preceptos en esa semana
    expect(queryByText(/Inmaculada Concepción/i)).toBeNull();
    expect(queryByText(/Ascensión/i)).toBeNull();
    expect(queryByText(/Epifanía/i)).toBeNull();
  });

  test("muestra el nombre de la iglesia más cercana una vez que la API responde", async () => {
    const { findByText } = render(<HomeScreen />);
    await flushAsync();

    await waitFor(
      () => expect(findByText(iglesiaDetalleFixture.nombre)).resolves.toBeTruthy(),
      { timeout: 3000 }
    );
  });

  test("muestra el mensaje de ubicación denegada cuando el permiso es denied", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: "denied",
    });

    const { findByText } = render(<HomeScreen />);
    await flushAsync();

    await waitFor(
      () =>
        expect(
          findByText(/Activa la ubicación para ver la parroquia más próxima/i)
        ).resolves.toBeTruthy(),
      { timeout: 3000 }
    );
  });

  test("la CTA 'Ver en mapa' navega a la tab de mapa al pulsarla", async () => {
    const { router } = require("expo-router");
    const { findByText } = render(<HomeScreen />);
    await flushAsync();

    const cta = await waitFor(
      () => findByText(/Ver en mapa/i),
      { timeout: 3000 }
    );

    const { fireEvent } = require("@testing-library/react-native");
    fireEvent.press(cta);

    expect(router.navigate).toHaveBeenCalledWith("/(tabs)/mapa");
  });
});
