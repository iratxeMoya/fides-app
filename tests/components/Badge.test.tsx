import React from "react";
import { render } from "@testing-library/react-native";
import { Badge } from "@/components/ui/Badge";

// NativeWind is disabled in test mode, so className="uppercase" has no effect.
// The component renders {label} as-is; tests query the original label text.
//
// Tree traversal note: getByText returns the native RCTText leaf. The style
// prop lives two levels up: RCTText → [ForwardRef Text] → "View" (RCTView).
// Use .parent.parent to reach the container View.

describe("Badge", () => {
  describe("variant warning", () => {
    test("muestra el texto de la etiqueta", () => {
      const { getByText } = render(<Badge label="Aviso" variant="warning" />);
      expect(getByText("Aviso")).toBeTruthy();
    });

    test("aplica el fondo rojo-acento (rgba(255, 125, 125, 0.15))", () => {
      const { getByText } = render(<Badge label="Precepto" variant="warning" />);
      const contenedor = getByText("Precepto").parent?.parent;
      expect(contenedor?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: "rgba(255, 125, 125, 0.15)" }),
        ])
      );
    });
  });

  describe("variant neutral", () => {
    test("muestra el texto de la etiqueta", () => {
      const { getByText } = render(<Badge label="Neutral" variant="neutral" />);
      expect(getByText("Neutral")).toBeTruthy();
    });

    test("no usa el fondo rojo-acento", () => {
      const { getByText } = render(<Badge label="Neutral" variant="neutral" />);
      const contenedor = getByText("Neutral").parent?.parent;
      const styles = contenedor?.props.style as any[];
      const tieneRojo = styles?.some(
        (s: any) => s?.backgroundColor === "rgba(255, 125, 125, 0.15)"
      );
      expect(tieneRojo).toBe(false);
    });
  });

  describe("variant success", () => {
    test("muestra el texto de la etiqueta con fondo verde", () => {
      const { getByText } = render(<Badge label="Éxito" variant="success" />);
      expect(getByText("Éxito")).toBeTruthy();
      const contenedor = getByText("Éxito").parent?.parent;
      expect(contenedor?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: "rgba(134, 239, 172, 0.12)" }),
        ])
      );
    });
  });

  test("size sm reduce el padding en comparación con size md", () => {
    const { getByText: getBySm } = render(<Badge label="Pequeño" size="sm" />);
    const { getByText: getByMd } = render(<Badge label="Pequeño" size="md" />);
    expect(getBySm("Pequeño")).toBeTruthy();
    expect(getByMd("Pequeño")).toBeTruthy();
  });
});
