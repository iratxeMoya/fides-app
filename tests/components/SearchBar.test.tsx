import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { SearchBar } from "@/components/ui/SearchBar";

describe("SearchBar", () => {
  const mockOnChangeText = jest.fn();

  beforeEach(() => {
    mockOnChangeText.mockClear();
  });

  test("muestra el placeholder por defecto", () => {
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={mockOnChangeText} />
    );
    expect(getByPlaceholderText("Buscar parroquia...")).toBeTruthy();
  });

  test("muestra un placeholder personalizado", () => {
    const { getByPlaceholderText } = render(
      <SearchBar
        value=""
        onChangeText={mockOnChangeText}
        placeholder="Buscar iglesia..."
      />
    );
    expect(getByPlaceholderText("Buscar iglesia...")).toBeTruthy();
  });

  test("llama a onChangeText con el valor escrito", () => {
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={mockOnChangeText} />
    );
    fireEvent.changeText(getByPlaceholderText("Buscar parroquia..."), "Almudena");
    expect(mockOnChangeText).toHaveBeenCalledWith("Almudena");
  });

  test("muestra el botón de limpiar cuando hay texto", () => {
    const { getByTestId } = render(
      <SearchBar value="Almudena" onChangeText={mockOnChangeText} />
    );
    // El icono de limpiar es un Ionicons "close-circle" — testeamos su presencia
    expect(getByTestId("icon-close-circle")).toBeTruthy();
  });

  test("oculta el botón de limpiar cuando el campo está vacío", () => {
    const { queryByTestId } = render(
      <SearchBar value="" onChangeText={mockOnChangeText} />
    );
    expect(queryByTestId("icon-close-circle")).toBeNull();
  });

  test("pulsar el botón de limpiar llama a onChangeText con string vacío", () => {
    const { getByTestId } = render(
      <SearchBar value="Almudena" onChangeText={mockOnChangeText} />
    );
    fireEvent.press(getByTestId("icon-close-circle").parent!);
    expect(mockOnChangeText).toHaveBeenCalledWith("");
  });

  test("llama a onClear al limpiar el campo si está definido", () => {
    const mockOnClear = jest.fn();
    const { getByTestId } = render(
      <SearchBar value="Texto" onChangeText={mockOnChangeText} onClear={mockOnClear} />
    );
    fireEvent.press(getByTestId("icon-close-circle").parent!);
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });
});
