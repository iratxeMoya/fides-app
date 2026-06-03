export const Colors = {
  fondo: {
    profundo: "#0A0A0A",
    base: "#111111",
    elevado: "#1A1A1A",
  },
  texto: {
    principal: "#FFFFFF",
    secundario: "#A0A0A0",
    tenue: "#666666",
  },
  acento: "#FF7D7D",
  borde: "#2A2A2A",
} as const;

export const Espaciado = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Tipografia = {
  titulo: {
    fontSize: 28,
    fontWeight: "300" as const,
    letterSpacing: 0.5,
    color: Colors.texto.principal,
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: "400" as const,
    letterSpacing: 0.3,
    color: Colors.texto.principal,
  },
  cuerpo: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
    color: Colors.texto.secundario,
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: "500" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    color: Colors.texto.tenue,
  },
} as const;

export const RadioBorde = {
  sm: 6,
  md: 12,
  lg: 20,
  completo: 9999,
} as const;
