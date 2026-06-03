import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { SectionHeader } from "@/components/ui/SectionHeader";

describe("SectionHeader", () => {
  test("renderiza el título principal", () => {
    const { getByText } = render(<SectionHeader titulo="Iglesias cercanas" />);
    expect(getByText("Iglesias cercanas")).toBeTruthy();
  });

  test("renderiza el subtítulo cuando se proporciona", () => {
    const { getByText } = render(
      <SectionHeader titulo="Lectura del día" subtitulo="Evangelio" />
    );
    expect(getByText("Lectura del día")).toBeTruthy();
    expect(getByText("Evangelio")).toBeTruthy(); // NativeWind disabled in tests
  });

  test("no muestra subtítulo si no se proporciona", () => {
    const { queryByText } = render(<SectionHeader titulo="Inicio" />);
    // No debería haber texto de subtítulo vacío
    expect(queryByText("")).toBeNull();
  });

  test("renderiza la acción secundaria cuando se proporciona", () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <SectionHeader
        titulo="Esta semana"
        accion={{ etiqueta: "Ver todo", onPress: mockOnPress }}
      />
    );
    expect(getByText("Ver todo")).toBeTruthy();
  });

  test("llama a accion.onPress al pulsar la etiqueta de acción", () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <SectionHeader
        titulo="Esta semana"
        accion={{ etiqueta: "Ver todo", onPress: mockOnPress }}
      />
    );
    fireEvent.press(getByText("Ver todo"));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test("no muestra botón de acción si no se proporciona", () => {
    const { queryByText } = render(<SectionHeader titulo="Inicio" />);
    expect(queryByText("Ver todo")).toBeNull();
  });
});
