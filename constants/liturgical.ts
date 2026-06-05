// ─── Tipos de tiempo litúrgico ────────────────────────────────────────────────

export type TiempoLiturgico =
  | "adviento"
  | "navidad"
  | "tiempo_ordinario"
  | "cuaresma"
  | "semana_santa"
  | "pascua"
  | "pentecostes";

export type ColorLiturgico = "morado" | "blanco" | "verde" | "rojo" | "rosa";

export const COLOR_LITURGICO: Record<TiempoLiturgico, ColorLiturgico> = {
  adviento: "morado",
  navidad: "blanco",
  tiempo_ordinario: "verde",
  cuaresma: "morado",
  semana_santa: "rojo",
  pascua: "blanco",
  pentecostes: "rojo",
};

export const NOMBRE_TIEMPO_LITURGICO: Record<TiempoLiturgico, string> = {
  adviento: "Adviento",
  navidad: "Navidad",
  tiempo_ordinario: "Tiempo Ordinario",
  cuaresma: "Cuaresma",
  semana_santa: "Semana Santa",
  pascua: "Tiempo de Pascua",
  pentecostes: "Pentecostés",
};

// ─── Algoritmo de Meeus/Jones/Butcher ─────────────────────────────────────────

/** Devuelve la fecha del Domingo de Pascua para un año dado */
export function calcularFechaPascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

// ─── Tiempo litúrgico ─────────────────────────────────────────────────────────

export function calcularTiempoLiturgico(fecha: Date): TiempoLiturgico {
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth() + 1;
  const dia = fecha.getDate();
  const pascua = calcularFechaPascua(anio);

  const diffPascua = Math.floor(
    (normalizeDate(fecha).getTime() - normalizeDate(pascua).getTime()) /
      MS_DIA
  );

  if (diffPascua >= -7 && diffPascua <= -1) return "semana_santa";
  if (diffPascua >= 0 && diffPascua < 49) return "pascua";
  if (diffPascua === 49) return "pentecostes";

  const esNavidad = (mes === 12 && dia >= 25) || (mes === 1 && dia <= 6);
  if (esNavidad) return "navidad";

  // Adviento: desde el domingo más próximo al 30 de noviembre hasta el 24 de diciembre
  const navidad = new Date(anio, 11, 25);
  const inicioAdviento = new Date(navidad);
  inicioAdviento.setDate(navidad.getDate() - navidad.getDay() - 21);
  if (fecha >= inicioAdviento && ((mes === 11) || (mes === 12 && dia < 25))) {
    return "adviento";
  }

  if (diffPascua >= -46 && diffPascua < -7) return "cuaresma";

  return "tiempo_ordinario";
}

// ─── Tipos de día de precepto ─────────────────────────────────────────────────

/** Día de precepto con su fecha concreta (año incluido) */
export type DiaPrecepto = {
  /** Nombre oficial de la solemnidad */
  name: string;
  date: Date;
};

// ─── Utilidades internas ──────────────────────────────────────────────────────

const MS_DIA = 24 * 60 * 60 * 1000;

/** Devuelve una fecha normalizada a medianoche (evita problemas de zona horaria) */
function normalizeDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Genera todos los días de precepto para un año civil dado.
 * Incluye los días fijos del rito hispano y las solemnidades móviles
 * (Ascensión y Corpus Christi) calculadas a partir de la Pascua.
 *
 * No incluye todos los domingos (que también son días de precepto universal)
 * ya que se presupone su tratamiento por separado.
 */
export function getDiasPreceptoDelAnio(anio: number): DiaPrecepto[] {
  const pascua = calcularFechaPascua(anio);

  const ascension = new Date(pascua);
  ascension.setDate(pascua.getDate() + 42); // 7º domingo de Pascua (CEE España trasladó del jueves +39)

  const corpusChristi = new Date(pascua);
  corpusChristi.setDate(pascua.getDate() + 63); // Domingo de Corpus (CEE España trasladó del jueves +60)

  return [
    { name: "Epifanía del Señor",          date: new Date(anio, 0, 6) },
    { name: "Ascensión del Señor",          date: ascension },
    { name: "Corpus Christi",               date: corpusChristi },
    { name: "Santos Pedro y Pablo",         date: new Date(anio, 5, 29) },
    { name: "Asunción de la Virgen María",  date: new Date(anio, 7, 15) },
    { name: "Todos los Santos",             date: new Date(anio, 10, 1) },
    { name: "Inmaculada Concepción",        date: new Date(anio, 11, 8) },
    { name: "Natividad del Señor",          date: new Date(anio, 11, 25) },
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ─── Constante: días de precepto 2025-2026 ───────────────────────────────────

/**
 * Días de precepto del año litúrgico 2025-2026 según el calendario de la CEE (España).
 *
 * Fechas móviles verificadas (rito hispano: Ascensión y Corpus trasladados al domingo):
 *   Pascua 2025 → 20 abr  → Ascensión  1 jun (+42)  / Corpus 22 jun (+63)
 *   Pascua 2026 →  5 abr  → Ascensión 17 may (+42)  / Corpus  7 jun (+63)
 */
export const DIAS_PRECEPTO_2025_2026: DiaPrecepto[] = [
  // ── 2025 ──
  { name: "Epifanía del Señor",          date: new Date(2025, 0, 6)  },
  { name: "Ascensión del Señor",         date: new Date(2025, 5, 1)  },
  { name: "Corpus Christi",              date: new Date(2025, 5, 22) },
  { name: "Santos Pedro y Pablo",        date: new Date(2025, 5, 29) },
  { name: "Asunción de la Virgen María", date: new Date(2025, 7, 15) },
  { name: "Todos los Santos",            date: new Date(2025, 10, 1) },
  { name: "Inmaculada Concepción",       date: new Date(2025, 11, 8) },
  { name: "Natividad del Señor",         date: new Date(2025, 11, 25)},
  // ── 2026 ──
  { name: "Epifanía del Señor",          date: new Date(2026, 0, 6)  },
  { name: "Ascensión del Señor",         date: new Date(2026, 4, 17) },
  { name: "Corpus Christi",              date: new Date(2026, 5, 7)  },
  { name: "Santos Pedro y Pablo",        date: new Date(2026, 5, 29) },
  { name: "Asunción de la Virgen María", date: new Date(2026, 7, 15) },
  { name: "Todos los Santos",            date: new Date(2026, 10, 1) },
  { name: "Inmaculada Concepción",       date: new Date(2026, 11, 8) },
  { name: "Natividad del Señor",         date: new Date(2026, 11, 25)},
];

// ─── Funciones públicas ───────────────────────────────────────────────────────

/**
 * Indica si una fecha concreta es día de precepto.
 * Funciona para cualquier año (no solo 2025-2026).
 */
export function isPrecept(date: Date): boolean {
  const target = normalizeDate(date);
  const candidatos = getDiasPreceptoDelAnio(target.getFullYear());
  return candidatos.some(
    (d) => normalizeDate(d.date).getTime() === target.getTime()
  );
}

/**
 * Devuelve el siguiente día de precepto estrictamente posterior a `from`.
 * Busca hasta dos años vista. Devuelve `null` si no encuentra ninguno.
 */
export function getNextPrecept(from: Date): DiaPrecepto | null {
  const fromNorm = normalizeDate(from).getTime();

  for (let offset = 0; offset <= 1; offset++) {
    const anio = from.getFullYear() + offset;
    const dias = getDiasPreceptoDelAnio(anio);

    for (const d of dias) {
      if (normalizeDate(d.date).getTime() > fromNorm) {
        return d;
      }
    }
  }

  return null;
}

/**
 * Devuelve todos los días de precepto que caen dentro de los 7 días
 * que comienzan en `weekStart` (inclusive) — es decir, [weekStart, weekStart+7).
 */
export function getThisWeekPrecepts(weekStart: Date): DiaPrecepto[] {
  const inicio = normalizeDate(weekStart).getTime();
  const fin = inicio + 7 * MS_DIA;

  // El rango puede cruzar el cambio de año
  const anios = new Set([
    weekStart.getFullYear(),
    new Date(fin - 1).getFullYear(),
  ]);

  const resultado: DiaPrecepto[] = [];

  for (const anio of anios) {
    for (const d of getDiasPreceptoDelAnio(anio)) {
      const t = normalizeDate(d.date).getTime();
      if (t >= inicio && t < fin) {
        resultado.push(d);
      }
    }
  }

  return resultado.sort((a, b) => a.date.getTime() - b.date.getTime());
}
