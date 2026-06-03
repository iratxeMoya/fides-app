import React from "react";
import { Text } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";
import { Card } from "@/components/ui/Card";

describe("Card", () => {
  test("renderiza sus hijos correctamente", () => {
    const { getByText } = render(
      <Card>
        <Text>Contenido de la card</Text>
      </Card>
    );
    expect(getByText("Contenido de la card")).toBeTruthy();
  });

  test("renderiza múltiples hijos", () => {
    const { getByText } = render(
      <Card>
        <Text>Título</Text>
        <Text>Descripción de la lectura</Text>
      </Card>
    );
    expect(getByText("Título")).toBeTruthy();
    expect(getByText("Descripción de la lectura")).toBeTruthy();
  });

  test("llama a onPress cuando se proporciona y se pulsa", () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Card onPress={mockOnPress}>
        <Text>Presionable</Text>
      </Card>
    );
    fireEvent.press(getByText("Presionable"));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test("sin onPress no lanza error al intentar pulsar", () => {
    const { getByText } = render(
      <Card>
        <Text>No presionable</Text>
      </Card>
    );
    // No debe lanzar ninguna excepción
    expect(() => fireEvent.press(getByText("No presionable"))).not.toThrow();
  });
});
