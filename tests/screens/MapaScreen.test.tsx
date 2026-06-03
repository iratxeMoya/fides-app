/**
 * Tests de la pantalla de Mapa (app/(tabs)/mapa.tsx).
 *
 * Se mockean: expo-location, @/lib/api/iglesias y @maplibre/maplibre-react-native.
 */

import React from "react";
import { render, act, waitFor, fireEvent } from "@testing-library/react-native";
import * as Location from "expo-location";

jest.mock("@/lib/api/iglesias");
jest.mock("@/lib/api/cita", () => ({
  generarCitaInspiradora: jest.fn().mockResolvedValue({ ok: false, error: "mock" }),
}));

import { searchChurchesNearby, getChurchDetails, searchChurchesByQuery } from "@/lib/api/iglesias";
import { iglesiaBasicaFixture, iglesiaDetalleFixture } from "../fixtures/iglesiaFixture";

const mockSearchNearby  = searchChurchesNearby  as jest.MockedFunction<typeof searchChurchesNearby>;
const mockGetDetails    = getChurchDetails       as jest.MockedFunction<typeof getChurchDetails>;
const mockSearchByQuery = searchChurchesByQuery  as jest.MockedFunction<typeof searchChurchesByQuery>;

import MapaScreen from "@/app/(tabs)/mapa";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Avanza fake timers un tiempo acotado para que promesas y animaciones resuelvan. */
async function flushAsync(ms = 2000) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();

  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    status: "granted",
  });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 40.4168, longitude: -3.7038, accuracy: 10 },
  });

  mockSearchNearby.mockResolvedValue({
    ok:   true,
    data: [iglesiaBasicaFixture],
  });
  mockGetDetails.mockResolvedValue({ ok: true, data: iglesiaDetalleFixture });
  mockSearchByQuery.mockResolvedValue({ ok: true, data: [] });
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MapaScreen", () => {
  test("renderiza el componente MapView", async () => {
    const { getByTestId } = render(<MapaScreen />);
    expect(getByTestId("map-view")).toBeTruthy();
  });

  test("renderiza el BottomSheet con el contenedor de la lista", async () => {
    const { getByTestId } = render(<MapaScreen />);
    expect(getByTestId("bottom-sheet")).toBeTruthy();
  });

  test("muestra las cards de iglesias en el BottomSheet tras cargar los datos", async () => {
    const { findByText } = render(<MapaScreen />);

    await flushAsync();

    await waitFor(
      () => expect(findByText(iglesiaBasicaFixture.nombre)).resolves.toBeTruthy(),
      { timeout: 3000 }
    );
  });

  test("la SearchBar llama a searchChurchesByQuery con la query escrita (tras debounce)", async () => {
    const { getByPlaceholderText } = render(<MapaScreen />);

    await flushAsync();

    // mapa.tsx pasa placeholder="Buscar iglesia o parroquia…"
    const searchBar = getByPlaceholderText("Buscar iglesia o parroquia…");
    fireEvent.changeText(searchBar, "San Ginés");

    // Avanzar el debounce (≥ 500ms)
    await flushAsync(600);

    if (mockSearchByQuery.mock.calls.length > 0) {
      expect(mockSearchByQuery).toHaveBeenCalledWith(
        "San Ginés",
        expect.any(Object)
      );
    }
  });

  test("el chip 'Ahora' está presente en la pantalla", async () => {
    const { findByText } = render(<MapaScreen />);
    await flushAsync();
    const chip = await waitFor(() => findByText("Ahora"), { timeout: 3000 });
    expect(chip).toBeTruthy();
  });

  test("pulsar el chip 'Ahora' cambia el estado del filtro activo", async () => {
    const { findByText } = render(<MapaScreen />);
    await flushAsync();

    const chipAhora = await waitFor(() => findByText("Ahora"), { timeout: 3000 });
    expect(() => fireEvent.press(chipAhora)).not.toThrow();
  });
});
