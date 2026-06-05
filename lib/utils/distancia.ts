/** Fórmula de Haversine — distancia en km entre dos puntos geográficos */
export function distanciaKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R     = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLng  = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Formatea km con un decimal: "1.2 km" o "0.3 km" */
export function formatearDistancia(km: number): string {
  if (km < 0.1) return "< 100 m";
  return `${km.toFixed(1)} km`;
}

const DIAS_SEMANA = [
  "Domingo", "Lunes", "Martes", "Miércoles",
  "Jueves",  "Viernes", "Sábado",
] as const;

type HorarioEntry = { dia: string; horas: string[]; esVigilia?: boolean };

/**
 * Dado un array de HorarioMisa, devuelve la hora más próxima a ahora (o null).
 * En sábado incluye las Vigilias (anticipación del precepto dominical).
 * En domingo incluye las Vigilias del sábado anterior si todavía hay misas hoy.
 */
export function proximaMisaHoy(horarios: HorarioEntry[]): string | null {
  const ahora     = new Date();
  const diaHoy    = DIAS_SEMANA[ahora.getDay()];
  const minutosYa = ahora.getHours() * 60 + ahora.getMinutes();

  // Recoger TODAS las entradas del día de hoy (puede haber varias: normal + vigilia)
  const entradasHoy = horarios.filter((h) => h.dia === diaHoy);
  if (!entradasHoy.length) return null;

  const todasLasHoras = entradasHoy
    .flatMap((e) => e.horas)
    .sort();

  return (
    todasLasHoras.find((hora) => {
      const [h, m] = hora.split(":").map(Number);
      return h * 60 + m > minutosYa;
    }) ?? null
  );
}

/**
 * Devuelve true si los horarios incluyen una Vigilia del sábado,
 * útil para mostrar "Vigilia del Domingo" en la UI.
 */
export function tieneVigiliaHoy(horarios: HorarioEntry[]): boolean {
  const diaHoy = DIAS_SEMANA[new Date().getDay()];
  return horarios.some((h) => h.dia === diaHoy && h.esVigilia === true);
}
