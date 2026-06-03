import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  describe("variant primary", () => {
    test("renderiza el texto de la etiqueta", () => {
      const { getByText } = render(
        <Button label="Confirmar" onPress={mockOnPress} variant="primary" />
      );
      expect(getByText("Confirmar")).toBeTruthy();
    });

    test("llama a onPress al ser pulsado", () => {
      const { getByText } = render(
        <Button label="Confirmar" onPress={mockOnPress} variant="primary" />
      );
      fireEvent.press(getByText("Confirmar"));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe("prop disabled", () => {
    test("no llama a onPress cuando está deshabilitado", () => {
      const { getByText } = render(
        <Button label="Bloqueado" onPress={mockOnPress} disabled />
      );
      fireEvent.press(getByText("Bloqueado"));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    test("el componente sigue renderizando el texto cuando está deshabilitado", () => {
      const { getByText } = render(
        <Button label="Bloqueado" onPress={mockOnPress} disabled />
      );
      expect(getByText("Bloqueado")).toBeTruthy();
    });
  });

  describe("prop loading", () => {
    test("muestra el ActivityIndicator en lugar del texto cuando loading=true", () => {
      const { queryByText, UNSAFE_getByType } = render(
        <Button label="Cargando" onPress={mockOnPress} loading />
      );
      const { ActivityIndicator } = require("react-native");
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
      expect(queryByText("Cargando")).toBeNull();
    });
  });

  describe("variant ghost y text", () => {
    test("renderiza correctamente variant ghost", () => {
      const { getByText } = render(
        <Button label="Fantasma" onPress={mockOnPress} variant="ghost" />
      );
      expect(getByText("Fantasma")).toBeTruthy();
    });

    test("renderiza correctamente variant text", () => {
      const { getByText } = render(
        <Button label="Texto" onPress={mockOnPress} variant="text" />
      );
      expect(getByText("Texto")).toBeTruthy();
    });
  });
});
