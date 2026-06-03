import { distanciaKm, formatearDistancia, proximaMisaHoy } from "@/lib/utils/distancia";

// ─── distanciaKm ──────────────────────────────────────────────────────────────

describe("distanciaKm (fórmula de Haversine)", () => {
  test("distancia entre Madrid y Barcelona es aproximadamente 504 km", () => {
    const d = distanciaKm(40.4168, -3.7038, 41.3879, 2.1699);
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(520);
  });

  test("distancia de un punto a sí mismo es cero", () => {
    expect(distanciaKm(40.4168, -3.7038, 40.4168, -3.7038)).toBe(0);
  });

  test("distancia corta entre dos parroquias vecinas es menor de 5 km", () => {
    // Almudena (40.4150, -3.7143) → San Ginés (40.4166, -3.7089)
    const d = distanciaKm(40.4150, -3.7143, 40.4166, -3.7089);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(5);
  });
});

// ─── formatearDistancia ───────────────────────────────────────────────────────

describe("formatearDistancia", () => {
  test("distancias muy cortas muestran '< 100 m'", () => {
    expect(formatearDistancia(0.05)).toBe("< 100 m");
  });

  test("1.2 km → '1.2 km'", () => {
    expect(formatearDistancia(1.2)).toBe("1.2 km");
  });

  test("0.3 km → '0.3 km'", () => {
    expect(formatearDistancia(0.3)).toBe("0.3 km");
  });

  test("12.9 km → '12.9 km' (redondeo correcto)", () => {
    expect(formatearDistancia(12.87)).toBe("12.9 km");
  });
});

// ─── proximaMisaHoy ───────────────────────────────────────────────────────────

describe("proximaMisaHoy", () => {
  const horarios = [
    { dia: "Lunes",   horas: ["08:00", "10:00", "12:00", "19:30"] },
    { dia: "Martes",  horas: ["09:00", "20:00"] },
    { dia: "Domingo", horas: ["10:00", "12:00", "13:00", "18:00", "20:00"] },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("devuelve la siguiente misa cuando quedan misas hoy", () => {
    // Simular lunes a las 11:30
    jest.setSystemTime(new Date(2025, 5, 2, 11, 30)); // Lunes 2 jun 2025
    const resultado = proximaMisaHoy(horarios);
    expect(resultado).toBe("12:00");
  });

  test("devuelve null cuando ya pasaron todas las misas del día", () => {
    // Simular lunes a las 20:00 (después de la última misa)
    jest.setSystemTime(new Date(2025, 5, 2, 20, 30)); // Lunes a las 20:30
    const resultado = proximaMisaHoy(horarios);
    expect(resultado).toBeNull();
  });

  test("devuelve null si hoy no hay horario de misas", () => {
    // Miércoles — no está en el array de horarios
    jest.setSystemTime(new Date(2025, 5, 4, 10, 0)); // Miércoles
    const resultado = proximaMisaHoy(horarios);
    expect(resultado).toBeNull();
  });

  test("devuelve la primera misa del día si es antes de que empiece", () => {
    // Domingo a las 08:00 (antes de la primera misa de las 10:00)
    jest.setSystemTime(new Date(2025, 5, 8, 8, 0)); // Domingo
    const resultado = proximaMisaHoy(horarios);
    expect(resultado).toBe("10:00");
  });

  test("devuelve la misa exactamente a la hora actual solo si AÚN no ha pasado", () => {
    // Martes a las 09:00 en punto — la misa de las 09:00 ya comenzó
    jest.setSystemTime(new Date(2025, 5, 3, 9, 0)); // Martes 3 jun
    const resultado = proximaMisaHoy(horarios);
    // 9:00 está en el pasado (minutosYa = 540, 09:00 = 540 → NOT > 540)
    expect(resultado).toBe("20:00");
  });
});
