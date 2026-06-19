/**
 * Proveedor de lecturas litúrgicas desde Universalis Spain.
 *
 * Universalis expone las lecturas del día en formato JSONP:
 *   GET https://universalis.com/europe.spain/{YYYYMMDD}/jsonpmass.js
 *
 * El calendario `europe.spain` sigue la Conferencia Episcopal Española (CEE),
 * resolviendo así las diferencias con el calendario USCCB (Ascensión en jueves,
 * Epifanía el 6/1, santoral español, etc.).
 *
 * Limitación: la ventana de disponibilidad es aproximadamente ±7 días desde hoy.
 * Fechas fuera de ese rango devuelven error y el llamador debe usar el fallback.
 */

import { ok, tryCatch, type Result } from "./result";
import { apiCache, TTL_24H } from "./cache";

const URL_UNIVERSALIS = "https://universalis.com/europe.spain";
const JSONP_CALLBACK  = "universalisCallback";

// ─── Tipos internos ───────────────────────────────────────────────────────────

type UniversalisSection = {
  heading?: string;
  source:   string;
  text?:    string;
};

type UniversalisRaw = {
  number?: number;
  date?:   string;
  day?:    string;
  Mass_R1?: UniversalisSection;
  Mass_Ps?: UniversalisSection;
  Mass_R2?: UniversalisSection;
  Mass_GA?: UniversalisSection;
  Mass_G?:  UniversalisSection;
};

// ─── Tipo público ─────────────────────────────────────────────────────────────

export type UniversalisDay = {
  readings: {
    firstReading?:  { source: string };
    psalm?:         { source: string };
    secondReading?: { source: string };
    gospel:         { source: string };
  };
};

// ─── normalizeRef ─────────────────────────────────────────────────────────────

/**
 * Normaliza una referencia de Universalis para que sea compatible con BOOK_ID y parseRef.
 *
 * Transformaciones:
 *   "1 Kings 18:20&#x2010;39"   → "1 Kings 18:20-39"
 *   "Psalm 49(50):1,8,12-15"   → "Psalm 50:1,8,12-15"  (LXX→MT)
 */
export function normalizeRef(source: string): string {
  let ref = source
    .replace(/&#x2010;/g, "-")          // en-dash en rangos de versículos
    .replace(/&#x[0-9a-fA-F]+;/g, "")  // demás entidades HTML hex
    .replace(/&[a-z]+;/g, "");          // entidades HTML nombradas

  // Psalm LXX(MT) → MT: "Psalm 49(50)" → "Psalm 50"
  ref = ref.replace(/^(Psalm\s+)\d+\((\d+)\)/, "$1$2");

  // Universalis usa ". " como separador de rangos discontinuos: "2 Kings 11:1-4. 9-18. 20"
  // → convertir a comas para que parseAllRanges pueda dividirlos correctamente
  ref = ref.replace(/\.\s+(\d)/g, ", $1");

  return ref.trim();
}

// ─── getUniversalisDay ────────────────────────────────────────────────────────

/**
 * Devuelve las referencias litúrgicas del día según el calendario CEE (Spain).
 * Las referencias vienen en inglés (formato USCCB/OSIS) para poder pasarlas
 * directamente a fetchPassageText / BOOK_ID.
 *
 * Cachea el resultado 24h. Si la fecha está fuera de la ventana disponible,
 * la API devuelve una redirección y el tryCatch captura el error.
 */
export async function getUniversalisDay(date: Date): Promise<Result<UniversalisDay>> {
  const y  = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyymmdd = `${y}${mm}${dd}`;
  const cacheKey = `universalis:${yyyymmdd}`;

  const cached = apiCache.get<UniversalisDay>(cacheKey);
  if (cached) return ok(cached);

  return tryCatch(async () => {
    const res = await fetch(`${URL_UNIVERSALIS}/${yyyymmdd}/jsonpmass.js`);
    if (!res.ok) throw new Error(`Universalis respondió ${res.status}`);

    const text = await res.text();
    if (!text.startsWith(`${JSONP_CALLBACK}(`)) {
      throw new Error("Formato JSONP inesperado de Universalis");
    }

    // Strip wrapper: universalisCallback({...}); → {...}
    const jsonStr = text.slice(JSONP_CALLBACK.length + 1, text.lastIndexOf(")"));
    const raw: UniversalisRaw = JSON.parse(jsonStr);

    if (!raw.Mass_G?.source) throw new Error("Universalis no devolvió el Evangelio del día");

    const day: UniversalisDay = {
      readings: {
        gospel:        { source: normalizeRef(raw.Mass_G.source)  },
        firstReading:  raw.Mass_R1 ? { source: normalizeRef(raw.Mass_R1.source) } : undefined,
        psalm:         raw.Mass_Ps ? { source: normalizeRef(raw.Mass_Ps.source) } : undefined,
        secondReading: raw.Mass_R2 ? { source: normalizeRef(raw.Mass_R2.source) } : undefined,
      },
    };

    apiCache.set(cacheKey, day, TTL_24H);
    return day;
  }, "getUniversalisDay");
}
