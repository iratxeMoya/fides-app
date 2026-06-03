/**
 * Smoke test de navegación: verifica que cada tab screen renderiza contenido
 * coherente sin errores fatales. Las APIs se mockean a nivel de módulo para
 * aislar el test de la red y del entorno nativo.
 */

import React from "react";
import { render, act, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";

// ─── Mocks de módulos ─────────────────────────────────────────────────────────

jest.mock("@/lib/db/client", () => ({ db: {} }));
jest.mock("@/lib/db/queries", () => ({
  saveIglesia:           jest.fn().mockResolvedValue(""),
  getIglesiaById:        jest.fn().mockResolvedValue(null),
  saveLecturaFavorita:   jest.fn().mockResolvedValue(""),
  getLecturasFavoritas:  jest.fn().mockResolvedValue([]),
  saveMensajeChat:       jest.fn().mockResolvedValue(undefined),
  getMensajesChat:       jest.fn().mockResolvedValue([]),
  deleteLecturaFavorita: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/api/biblia", () => ({
  getLecturaDelDia: jest.fn().mockResolvedValue({
    ok: true,
    data: {
      titulo:         "IV Domingo de Pascua",
      referencia:     "Jn 10:11-18",
      texto:          "Yo soy el buen Pastor",
      evangelio:      "Yo soy el buen Pastor",
      colorLiturgico: "blanco",
    },
  }),
}));

jest.mock("@/lib/api/iglesias", () => ({
  searchChurchesNearby: jest.fn().mockResolvedValue({
    ok:   true,
    data: [
      {
        id:        "ChIJSRl_T5AoQg0Rf0vqOL2R_vs",
        nombre:    "Catedral de la Almudena",
        direccion: "Calle de Bailén, s/n, Madrid",
        lat:       40.415,
        lng:       -3.7143,
      },
    ],
  }),
  getChurchDetails: jest.fn().mockResolvedValue({
    ok:   true,
    data: {
      id:        "ChIJSRl_T5AoQg0Rf0vqOL2R_vs",
      nombre:    "Catedral de la Almudena",
      direccion: "Calle de Bailén, s/n, Madrid",
      lat:       40.415,
      lng:       -3.7143,
      // Include horarios for all days so the default "ahora" filter keeps the iglesia
      horarios: [
        { dia: "Lunes",      horas: ["09:00", "12:00", "19:00"] },
        { dia: "Martes",     horas: ["09:00", "12:00", "19:00"] },
        { dia: "Miércoles",  horas: ["09:00", "12:00", "19:00"] },
        { dia: "Jueves",     horas: ["09:00", "12:00", "19:00"] },
        { dia: "Viernes",    horas: ["09:00", "12:00", "19:00"] },
        { dia: "Sábado",     horas: ["10:00", "12:00", "20:00"] },
        { dia: "Domingo",    horas: ["10:00", "12:00", "13:00", "19:00"] },
      ],
      fotosRefs: [],
    },
  }),
  searchChurchesByQuery: jest.fn().mockResolvedValue({ ok: true, data: [] }),
  parseOpeningHoursToHorariosMisa: jest.fn().mockReturnValue([]),
}));

jest.mock("@/lib/api/cita", () => ({
  generarCitaInspiradora: jest.fn().mockResolvedValue({
    ok:   true,
    data: { texto: "«El Señor es mi Pastor»" },
  }),
}));

jest.mock("@/lib/api/chat", () => ({
  enviarMensajeChat:       jest.fn(),
  buildSystemPromptLectura: jest.fn().mockReturnValue("prompt"),
}));

// ─── Imports de screens (después de los mocks) ────────────────────────────────

import HomeScreen    from "@/app/(tabs)/index";
import MapaScreen    from "@/app/(tabs)/mapa";
import LecturaScreen from "@/app/(tabs)/lectura";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function flushAsync(ms = 2000) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  // Fix the clock to 10:00 AM so proximaMisaHoy() finds masses at 12:00/19:00.
  jest.setSystemTime(new Date(2025, 4, 29, 10, 0, 0)); // Thu 29 May 2025, 10:00

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

// ─── Smoke tests ─────────────────────────────────────────────────────────────

describe("Smoke test de navegación", () => {
  test("1. El tab de Inicio (Home) muestra el título de la lectura del día", async () => {
    const { findByText } = render(<HomeScreen />);
    await flushAsync();

    await waitFor(
      () => expect(findByText("IV Domingo de Pascua")).resolves.toBeTruthy(),
      { timeout: 5000 }
    );
  });

  test("2. El tab de Mapa renderiza el componente de mapa", async () => {
    const { getByTestId } = render(<MapaScreen />);
    expect(getByTestId("map-view")).toBeTruthy();
  });

  test("3. El tab de Mapa carga iglesias y las muestra en el BottomSheet", async () => {
    const { findByText } = render(<MapaScreen />);
    await flushAsync();

    await waitFor(
      () => expect(findByText("Catedral de la Almudena")).resolves.toBeTruthy(),
      { timeout: 5000 }
    );
  });

  test("4. El tab de Lectura muestra el título de la lectura del día", async () => {
    const { findByText } = render(<LecturaScreen />);
    await flushAsync();

    await waitFor(
      () => expect(findByText("IV Domingo de Pascua")).resolves.toBeTruthy(),
      { timeout: 5000 }
    );
  });

  test("5. El tab de Lectura muestra la referencia del Evangelio", async () => {
    const { findByText } = render(<LecturaScreen />);
    await flushAsync();

    await waitFor(
      () => expect(findByText("Jn 10:11-18")).resolves.toBeTruthy(),
      { timeout: 5000 }
    );
  });
});
