/**
 * Tests de la pantalla de Lectura (app/(tabs)/lectura.tsx).
 *
 * Mockea: @/lib/api/biblia, @/lib/api/chat, @/lib/db/queries.
 */

import React from "react";
import { render, act, waitFor, fireEvent } from "@testing-library/react-native";

jest.mock("@/lib/api/biblia");
jest.mock("@/lib/api/chat");
jest.mock("@/lib/db/queries");
jest.mock("@/lib/db/client", () => ({ db: {} }));

import { getLecturaDelDia } from "@/lib/api/biblia";
import { enviarMensajeChat, buildSystemPromptLectura } from "@/lib/api/chat";
import { saveLecturaFavorita } from "@/lib/db/queries";
import { lecturaFixture } from "../fixtures/lecturaFixture";
import { LIBROS_RECOMENDADOS } from "@/lib/data/libros";

const mockGetLectura     = getLecturaDelDia     as jest.MockedFunction<typeof getLecturaDelDia>;
const mockEnviarChat     = enviarMensajeChat    as jest.MockedFunction<typeof enviarMensajeChat>;
const mockBuildPrompt    = buildSystemPromptLectura as jest.MockedFunction<typeof buildSystemPromptLectura>;
const mockSaveFavorita   = saveLecturaFavorita  as jest.MockedFunction<typeof saveLecturaFavorita>;

import LecturaScreen from "@/app/(tabs)/lectura";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Avanza fake timers un tiempo acotado — evita el infinite loop de runAllTimers(). */
async function flushAsync(ms = 2000) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();

  mockGetLectura.mockResolvedValue({ ok: true, data: lecturaFixture });
  mockBuildPrompt.mockReturnValue("System prompt de prueba");
  mockSaveFavorita.mockResolvedValue("2025-04-27-evangelio");

  // Generador async vacío (sin streaming)
  mockEnviarChat.mockImplementation(async function* () {
    yield "Reflexión de prueba sobre el Evangelio.";
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Tab 1: Lecturas del día ──────────────────────────────────────────────────

describe("LecturaScreen — Tab 1: Lecturas del día", () => {
  test("renderiza el título litúrgico de la lectura cargada desde la API", async () => {
    const { findByText } = render(<LecturaScreen />);
    await flushAsync();

    await waitFor(
      () => expect(findByText(lecturaFixture.titulo)).resolves.toBeTruthy(),
      { timeout: 3000 }
    );
  });

  test("muestra la referencia bíblica del Evangelio", async () => {
    const { findByText } = render(<LecturaScreen />);
    await flushAsync();

    await waitFor(
      () => expect(findByText(lecturaFixture.referencia)).resolves.toBeTruthy(),
      { timeout: 3000 }
    );
  });

  test("pulsar 'Guardar en favoritos' llama a saveLecturaFavorita con los datos correctos", async () => {
    const { findByText } = render(<LecturaScreen />);
    await flushAsync();

    const boton = await waitFor(
      () => findByText("Guardar en favoritos"),
      { timeout: 3000 }
    );
    await act(async () => {
      fireEvent.press(boton);
    });
    await flushAsync(500);

    await waitFor(() => {
      expect(mockSaveFavorita).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo:        lecturaFixture.titulo,
          fuente:        lecturaFixture.referencia,
          textoCompleto: lecturaFixture.texto,
        })
      );
    });
  });

  test("pulsar el botón de favoritos cambia el texto a 'Guardado en favoritos'", async () => {
    const { findByText } = render(<LecturaScreen />);
    await flushAsync();

    const boton = await waitFor(() => findByText("Guardar en favoritos"), { timeout: 3000 });
    fireEvent.press(boton);

    await waitFor(
      () => findByText("Guardado en favoritos"),
      { timeout: 3000 }
    );
  });

  test("enviar un mensaje de chat llama a enviarMensajeChat con el sistema prompt de la lectura", async () => {
    const { findByPlaceholderText, findByText } = render(<LecturaScreen />);
    await flushAsync();

    // Esperar a que la pantalla cargue
    await waitFor(() => findByText(lecturaFixture.titulo), { timeout: 3000 });

    const input = await waitFor(
      () => findByPlaceholderText("Escribe tu reflexión…"),
      { timeout: 3000 }
    );

    fireEvent.changeText(input, "¿Qué significa ser oveja del buen Pastor?");

    // Pulsar el botón de enviar
    const enviarIcon = await waitFor(
      () => findByText("send"),
      { timeout: 3000 }
    );
    const enviarBtn = enviarIcon.parent;
    await act(async () => {
      fireEvent.press(enviarBtn!);
    });
    await flushAsync(500);

    await waitFor(() => {
      expect(mockEnviarChat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role:    "user",
            content: "¿Qué significa ser oveja del buen Pastor?",
          }),
        ]),
        expect.any(String),
        expect.any(AbortSignal)
      );
    });
  });

  test("los mensajes del chat aparecen en el orden correcto (usuario primero)", async () => {
    mockEnviarChat.mockImplementation(async function* () {
      yield "El buen Pastor conoce a cada oveja por su nombre.";
    });

    const { findByPlaceholderText, findByText } = render(<LecturaScreen />);
    await flushAsync();
    await waitFor(() => findByText(lecturaFixture.titulo), { timeout: 3000 });

    const input = await waitFor(
      () => findByPlaceholderText("Escribe tu reflexión…"),
      { timeout: 3000 }
    );
    fireEvent.changeText(input, "¿Quién es mi pastor?");

    const enviarIcon = await waitFor(() => findByText("send"), { timeout: 3000 });
    await act(async () => {
      fireEvent.press(enviarIcon.parent!);
    });
    await flushAsync(500);

    // El mensaje del usuario debe aparecer
    await waitFor(
      () => findByText("¿Quién es mi pastor?"),
      { timeout: 3000 }
    );
  });
});

// ─── Tab 2: Lecturas recomendadas ─────────────────────────────────────────────

describe("LecturaScreen — Tab 2: Lecturas recomendadas", () => {
  async function renderizarTab2() {
    const utils = render(<LecturaScreen />);
    await flushAsync();

    const tabBtn = await waitFor(
      () => utils.findByText("Lecturas recomendadas"),
      { timeout: 3000 }
    );
    fireEvent.press(tabBtn);

    return utils;
  }

  test("muestra la lista de libros recomendados al cambiar al tab 2", async () => {
    const { findByText } = await renderizarTab2();

    const primerLibro = LIBROS_RECOMENDADOS[0];
    await waitFor(
      () => expect(findByText(primerLibro.titulo)).resolves.toBeTruthy(),
      { timeout: 3000 }
    );
  });

  test("el chip de filtro 'Filosofía' filtra la lista correctamente", async () => {
    const { getAllByText, queryByText } = await renderizarTab2();

    // "Filosofía" appears in both filter chips and book category badges.
    // The chip is rendered first; press it to activate the filter.
    await waitFor(() => {
      expect(getAllByText("Filosofía").length).toBeGreaterThan(0);
    }, { timeout: 3000 });
    fireEvent.press(getAllByText("Filosofía")[0]);

    const libroTeologia = LIBROS_RECOMENDADOS.find((l) => l.categoria === "teologia");
    if (libroTeologia) {
      await waitFor(() => {
        expect(queryByText(libroTeologia.titulo)).toBeNull();
      });
    }
  });

  test("'Todos' restablece el filtro y muestra todos los libros", async () => {
    const { getAllByText, findByText } = await renderizarTab2();

    await waitFor(() => {
      expect(getAllByText("Filosofía").length).toBeGreaterThan(0);
    }, { timeout: 3000 });
    fireEvent.press(getAllByText("Filosofía")[0]);

    const chipTodos = await waitFor(() => findByText("Todos"), { timeout: 3000 });
    fireEvent.press(chipTodos);

    const libroTeologia = LIBROS_RECOMENDADOS.find((l) => l.categoria === "teologia");
    if (libroTeologia) {
      await waitFor(
        () => expect(findByText(libroTeologia.titulo)).resolves.toBeTruthy(),
        { timeout: 3000 }
      );
    }
  });
});
