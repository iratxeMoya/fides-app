/**
 * Búsqueda de iglesias usando:
 *   - Nominatim (nominatim.openstreetmap.org) para búsquedas por proximidad/texto
 *   - OSM REST API (api.openstreetmap.org) para los detalles (opening_hours, etc.)
 *
 * No requiere API key. Los IDs tienen formato "node:12345" / "way:12345".
 */

import { ok, tryCatch, type Result } from "./result";
import { apiCache, TTL_1H } from "./cache";
import type { HorarioMisa } from "@/lib/db/schema";
import { saveIglesia, getIglesiaById } from "@/lib/db/queries";

// ─── Endpoints ────────────────────────────────────────────────────────────────

const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSM_API = "https://api.openstreetmap.org/api/0.6";
const UA = "FidesApp/1.0";

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
] as const;

// ─── Tipos Nominatim ──────────────────────────────────────────────────────────

type NominatimResult = {
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  lat: string;
  lon: string;
  name: string;
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
  };
  extratags?: {
    opening_hours?: string;
    service_times?: string;
    phone?: string;
    website?: string;
    religion?: string;
    denomination?: string;
  };
};

// ─── Tipos OSM REST API ───────────────────────────────────────────────────────

type OsmApiElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
};

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type IglesiaBusqueda = {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  abiertaAhora?: boolean;
};

export type IglesiaDetalle = {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  telefono?: string;
  web?: string;
  horarios: HorarioMisa[];
  fotosRefs: string[];
  image?: string;
};

// ─── Parser de opening_hours OSM → HorarioMisa[] ────────────────────────────

const ALL_DAYS_KEYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
type DayKey = typeof ALL_DAYS_KEYS[number];

const OSM_TO_DIA: Record<DayKey, string> = {
  Mo: "Lunes", Tu: "Martes", We: "Miércoles",
  Th: "Jueves", Fr: "Viernes", Sa: "Sábado",
  Su: "Domingo",
};

const DIA_SEMANA = [
  "Domingo", "Lunes", "Martes", "Miércoles",
  "Jueves", "Viernes", "Sábado",
] as const;

function expandDayRange(range: string): string[] {
  const [start, end] = range.split("-") as [string, string];
  const startIdx = ALL_DAYS_KEYS.indexOf(start as DayKey);
  const endIdx = ALL_DAYS_KEYS.indexOf(end as DayKey);
  if (startIdx === -1 || endIdx === -1) return [];
  return Array.from(ALL_DAYS_KEYS).slice(startIdx, endIdx + 1);
}

function timeToMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutosToHHMM(totalMins: number): string {
  const h = Math.floor((totalMins % (24 * 60)) / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function inferHorasMisa(abreMins: number, cierraMins: number): string[] {
  const ventana = cierraMins - abreMins;
  if (ventana <= 0) return [];

  const intervalo =
    ventana <= 60 ? ventana
      : ventana <= 180 ? 90
        : 120;

  const horas: string[] = [];
  for (let m = abreMins; m <= cierraMins - 30; m += intervalo) {
    horas.push(minutosToHHMM(m));
    if (intervalo === ventana) break;
  }

  if (horas.length === 0) horas.push(minutosToHHMM(abreMins));
  return horas;
}

// Devuelve true si currentMins cae dentro de la ventana de una misa directa (service_times)
function isNowInDirectTimes(timePart: string, currentMins: number): boolean {
  const direct = timePart.match(/\d{2}:\d{2}/g) ?? [];
  for (const t of direct) {
    const start = timeToMins(t);
    // Ventana de 90 min por misa (tiempo razonable de duración)
    if (currentMins >= start && currentMins < start + 90) return true;
  }
  return false;
}

export function parseOsmOpeningHours(value: string): HorarioMisa[] {
  if (!value.trim()) return [];

  const porDia = new Map<string, Set<string>>();
  // false = al menos un tiempo directo (exacto); true = solo tiempos inferidos
  const inferidoPorDia = new Map<string, boolean>();
  const rules = value.split(";").map((r) => r.trim()).filter(Boolean);

  for (const rule of rules) {
    const firstTimePos = rule.search(/\d{2}:\d{2}/);
    if (firstTimePos === -1) continue;

    const dayPart = rule.slice(0, firstTimePos).trim();
    const timePart = rule.slice(firstTimePos).trim();

    // Resolve day keys
    let dayKeys: string[];
    if (!dayPart) {
      dayKeys = Array.from(ALL_DAYS_KEYS);
    } else if (dayPart.includes(",")) {
      dayKeys = dayPart.split(",").flatMap((p) => {
        const part = p.trim();
        return part.includes("-") ? expandDayRange(part) : [part];
      });
    } else if (dayPart.includes("-")) {
      dayKeys = expandDayRange(dayPart);
    } else {
      dayKeys = [dayPart];
    }

    // Parse time block — two formats:
    //   Range  HH:MM-HH:MM  → long (>=150 min) = infer masses; short = single mass at start
    //   Direct HH:MM[,HH:MM,...] → use times as-is (service_times style)
    let horas: string[] = [];
    let esteBloquesEsInferido = false;
    const rangeMatches = [...timePart.matchAll(/(\d{2}:\d{2})-(\d{2}:\d{2})/g)];

    if (rangeMatches.length > 0) {
      for (const m of rangeMatches) {
        const abreMins = timeToMins(m[1]);
        const cierraMins = timeToMins(m[2]);
        const duracion = cierraMins - abreMins;
        if (duracion >= 150) {
          horas.push(...inferHorasMisa(abreMins, cierraMins));
          esteBloquesEsInferido = true;
        } else if (duracion > 0) {
          horas.push(m[1]);
        }
      }
    } else {
      // No ranges — direct times (service_times: "Su 10:00,18:30")
      const direct = timePart.match(/\d{2}:\d{2}/g) ?? [];
      horas.push(...direct);
    }

    for (const dayKey of dayKeys) {
      const diaNombre = OSM_TO_DIA[dayKey as DayKey];
      if (!diaNombre) continue;
      if (!porDia.has(diaNombre)) {
        porDia.set(diaNombre, new Set());
        inferidoPorDia.set(diaNombre, esteBloquesEsInferido);
      } else if (!esteBloquesEsInferido) {
        // Si ahora llega un tiempo exacto, el día deja de ser "solo inferido"
        inferidoPorDia.set(diaNombre, false);
      }
      for (const h of horas) porDia.get(diaNombre)!.add(h);
    }
  }

  const resultado: HorarioMisa[] = [];
  for (const [dia, horasSet] of porDia.entries()) {
    const inferido = inferidoPorDia.get(dia) ?? false;
    resultado.push({ dia, horas: Array.from(horasSet).sort(), ...(inferido && { inferido }) });
  }

  return resultado.sort((a, b) => {
    const idxA = DIA_SEMANA.indexOf(a.dia as typeof DIA_SEMANA[number]);
    const idxB = DIA_SEMANA.indexOf(b.dia as typeof DIA_SEMANA[number]);
    return (idxA === 0 ? 7 : idxA) - (idxB === 0 ? 7 : idxB);
  });
}

// ─── Helpers isOpenNow ────────────────────────────────────────────────────────

function isOpenNow(openingHours: string): boolean {
  const JS_TO_OSM = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
  const now = new Date();
  const todayOsm = JS_TO_OSM[now.getDay()];
  const currentMins = now.getHours() * 60 + now.getMinutes();

  for (const rule of openingHours.split(";").map((r) => r.trim()).filter(Boolean)) {
    const firstTimePos = rule.search(/\d{2}:\d{2}/);
    if (firstTimePos === -1) continue;

    const dayPart = rule.slice(0, firstTimePos).trim();
    const timePart = rule.slice(firstTimePos).trim();

    let dayKeys: string[];
    if (!dayPart) dayKeys = Array.from(ALL_DAYS_KEYS);
    else if (dayPart.includes(",")) dayKeys = dayPart.split(",").flatMap((p) => {
      const part = p.trim();
      return part.includes("-") ? expandDayRange(part) : [part];
    });
    else if (dayPart.includes("-")) dayKeys = expandDayRange(dayPart);
    else dayKeys = [dayPart];

    if (!dayKeys.includes(todayOsm)) continue;

    const rangeMatch = timePart.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
    if (rangeMatch) {
      // Formato opening_hours: rango HH:MM-HH:MM
      if (currentMins >= timeToMins(rangeMatch[1]) && currentMins < timeToMins(rangeMatch[2])) return true;
    } else {
      // Formato service_times: tiempos directos — la misa dura ~90 min
      if (isNowInDirectTimes(timePart, currentMins)) return true;
    }
  }
  return false;
}

// ─── Helpers de dirección / Nominatim ────────────────────────────────────────

function buildAddressNominatim(r: NominatimResult): string {
  const addr = r.address;
  const parts: string[] = [];
  if (addr.road) {
    parts.push(addr.house_number ? `${addr.road}, ${addr.house_number}` : addr.road);
  }
  const ciudad = addr.city ?? addr.town ?? addr.village;
  if (ciudad) parts.push(ciudad);
  return parts.join(", ");
}

async function fetchNominatim(path: string): Promise<NominatimResult[]> {
  const url = `${NOMINATIM}${path}&format=json&addressdetails=1&extratags=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "es" },
  });
  if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);
  return res.json() as Promise<NominatimResult[]>;
}

async function fetchOsmElement(type: string, osmId: string): Promise<OsmApiElement | null> {
  const res = await fetch(`${OSM_API}/${type}/${osmId}.json`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) return null;
  const json: { elements: OsmApiElement[] } = await res.json();
  return json.elements?.[0] ?? null;
}

async function fetchChurchesOverpass(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<IglesiaBusqueda[]> {
  const radiusM = Math.round(radiusKm * 1000);
  const query = `[out:json][timeout:8];(node["amenity"="place_of_worship"]["religion"="christian"](around:${radiusM},${lat},${lng});way["amenity"="place_of_worship"]["religion"="christian"](around:${radiusM},${lat},${lng}););out center;`.trim();

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch(mirror, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;

      const json: {
        elements: Array<{
          type: string; id: number;
          lat?: number; lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>
      } = await res.json();

      return (json.elements ?? [])
        .map((el) => {
          const lat2 = el.lat ?? el.center?.lat;
          const lng2 = el.lon ?? el.center?.lon;
          if (!lat2 || !lng2) return null;
          const tags = el.tags ?? {};
          return {
            id: `${el.type}:${el.id}`,
            nombre: tags.name ?? tags["name:es"] ?? "Iglesia",
            direccion: [
              tags["addr:street"] && tags["addr:housenumber"]
                ? `${tags["addr:street"]}, ${tags["addr:housenumber"]}`
                : (tags["addr:street"] ?? ""),
              tags["addr:city"] ?? "",
            ].filter(Boolean).join(", "),
            lat: lat2,
            lng: lng2,
            abiertaAhora: (tags.service_times ?? tags.opening_hours) ? isOpenNow(tags.service_times ?? tags.opening_hours!) : undefined,
          } as IglesiaBusqueda;
        })
        .filter((ig): ig is IglesiaBusqueda => ig !== null);
    } catch {
      continue;
    }
  }
  throw new Error("All Overpass mirrors failed");
}

// ─── searchChurchesNearby ─────────────────────────────────────────────────────

export async function searchChurchesNearby(
  lat: number,
  lng: number,
  radiusKm: number = 5
): Promise<Result<IglesiaBusqueda[]>> {
  const cacheKey = `churches-nearby:${lat.toFixed(4)},${lng.toFixed(4)},${radiusKm}`;
  const cached = apiCache.get<IglesiaBusqueda[]>(cacheKey);
  if (cached) return ok(cached);

  // Convertir radio a bounding box
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const viewbox = `${lng - lngDelta},${lat + latDelta},${lng + lngDelta},${lat - latDelta}`;
  const bbox = `&bounded=1&viewbox=${viewbox}&limit=50`;

  return tryCatch(async () => {
    // 3 fuentes en paralelo: Overpass (completo) + 2 Nominatim queries
    const [overpassResult, byAmenity, byText] = await Promise.allSettled([
      fetchChurchesOverpass(lat, lng, radiusKm),
      fetchNominatim(`/search?amenity=place_of_worship${bbox}`),
      fetchNominatim(`/search?q=iglesia+parroquia+catedral+capella+ermita${bbox}`),
    ]);

    const seen = new Set<string>();
    const iglesias: IglesiaBusqueda[] = [];

    // Overpass first (most complete), then Nominatim
    const overpassItems = overpassResult.status === "fulfilled" ? overpassResult.value : [];
    for (const ig of overpassItems) {
      if (seen.has(ig.id)) continue;
      seen.add(ig.id);
      iglesias.push(ig);
    }

    const nominatimRaw: NominatimResult[] = [
      ...(byAmenity.status === "fulfilled" ? byAmenity.value : []),
      ...(byText.status === "fulfilled" ? byText.value : []),
    ];
    for (const r of nominatimRaw) {
      if (!r.name) continue;
      const id = `${r.osm_type}:${r.osm_id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const religion = r.extratags?.religion;
      if (religion && religion !== "christian" && religion !== "catholic") continue;
      iglesias.push({
        id,
        nombre: r.name,
        direccion: buildAddressNominatim(r),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        abiertaAhora: (r.extratags?.service_times ?? r.extratags?.opening_hours) ? isOpenNow(r.extratags!.service_times ?? r.extratags!.opening_hours!) : undefined,
      });
    }

    apiCache.set(cacheKey, iglesias, TTL_1H);
    return iglesias;
  }, "searchChurchesNearby");
}

// ─── searchChurchesByQuery ────────────────────────────────────────────────────

export async function searchChurchesByQuery(
  query: string,
  location?: { lat: number; lng: number }
): Promise<Result<IglesiaBusqueda[]>> {
  if (!query.trim()) return ok([]);

  const cacheKey = `churches-query:${query}:${location?.lat.toFixed(4) ?? ""}`;
  const cached = apiCache.get<IglesiaBusqueda[]>(cacheKey);
  if (cached) return ok(cached);

  return tryCatch(async () => {
    let path = `/search?q=${encodeURIComponent(query)}&limit=30`;

    if (location) {
      const { lat, lng } = location;
      const d = 0.45; // ~50 km
      const viewbox = `${lng - d},${lat + d},${lng + d},${lat - d}`;
      path += `&bounded=1&viewbox=${viewbox}`;
    }

    const results = await fetchNominatim(path);

    const iglesias: IglesiaBusqueda[] = results
      .filter((r) => r.name)
      .map((r) => ({
        id: `${r.osm_type}:${r.osm_id}`,
        nombre: r.name,
        direccion: buildAddressNominatim(r),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      }));

    apiCache.set(cacheKey, iglesias, TTL_1H);
    return iglesias;
  }, "searchChurchesByQuery");
}

// ─── buscarmisas.es fallback ──────────────────────────────────────────────────

const BM_BASE = "https://buscarmisas.es";

function slugifyBM(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Nominatim state slug → buscarmisas.es state slug (different for some regions)
const BM_STATE: Record<string, string> = {
  "cataluna": "cataluna",
  "comunidad-de-madrid": "madrid",
  "comunidad-valenciana": "comunidad-valenciana",
  "pais-vasco": "pais-vasco",
  "euskadi": "pais-vasco",
  "andalucia": "andalucia",
  "castilla-y-leon": "castilla-y-leon",
  "castilla-la-mancha": "castilla-la-mancha",
  "galicia": "galicia",
  "aragon": "aragon",
  "extremadura": "extremadura",
  "principado-de-asturias": "asturias",
  "asturias": "asturias",
  "cantabria": "cantabria",
  "la-rioja": "la-rioja",
  "comunidad-foral-de-navarra": "navarra",
  "navarra-nafarroa": "navarra",
  "region-de-murcia": "murcia",
  "illes-balears": "islas-baleares",
  "canarias": "canarias",
};

// Singleton promise per lat/lng key — avoids duplicate reverse-geocode requests
const _bmCityPromises = new Map<string, Promise<string | null>>();

function getBMCityPath(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (_bmCityPromises.has(key)) return _bmCityPromises.get(key)!;

  const p = (async (): Promise<string | null> => {
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 4_000);
      const res = await fetch(
        `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
        { headers: { "User-Agent": UA, "Accept-Language": "es" }, signal: ac.signal },
      );
      clearTimeout(t);
      if (!res.ok) return null;
      const data: { address?: Record<string, string> } = await res.json();
      const rawCity = data.address?.city ?? data.address?.town ?? data.address?.village ?? "";
      const rawState = data.address?.state ?? "";
      if (!rawCity || !rawState) return null;
      const stateSlug = slugifyBM(rawState);
      const state = BM_STATE[stateSlug] ?? stateSlug;
      const city = slugifyBM(rawCity);
      return `${state}/${city}`;
    } catch { return null; }
  })();

  _bmCityPromises.set(key, p);
  return p;
}

// Catalan→Spanish word substitutions to generate slug candidates
function getSlugCandidates(nombre: string): string[] {
  const base = slugifyBM(nombre);
  const es = base
    .replace(/\besglesia\b/g, "iglesia")
    .replace(/\bparroquia\b/g, "parroquia")
    .replace(/\bsantuari\b/g, "santuario")
    .replace(/\bsant\b/g, "san")
    .replace(/\bconvent\b/g, "convento")
    .replace(/\boratori\b/g, "oratorio")
    .replace(/\bcapella\b/g, "capilla")
    .replace(/\bmuntanya\b/g, "montana")
    .replace(/\bmonestir\b/g, "monasterio")
    .replace(/\breial\b/g, "real")
    .replace(/-+/g, "-");
  return es !== base ? [base, es] : [base];
}

function parseBMSchedule(html: string): HorarioMisa[] {
  const DIAS: Record<string, string> = {
    lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
    jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
  };
  const result: HorarioMisa[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let rowM: RegExpExecArray | null;
  while ((rowM = rowRe.exec(html)) !== null) {
    cellRe.lastIndex = 0;
    const cells: string[] = [];
    let cellM: RegExpExecArray | null;
    while ((cellM = cellRe.exec(rowM[1])) !== null) {
      cells.push(cellM[1].replace(/<[^>]+>/g, "").trim());
    }
    if (cells.length < 2) continue;
    const diaKey = cells[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const dia = DIAS[diaKey];
    if (!dia) continue;
    const horas = cells[1].match(/\d{2}:\d{2}/g) ?? [];
    if (horas.length > 0) result.push({ dia, horas });
  }
  return result;
}

function extractCityPageLinks(html: string, cityPath: string): Array<{ slug: string; text: string }> {
  const results: Array<{ slug: string; text: string }> = [];
  const hrefRe = /href="([^"]+)"/gi;
  const prefix = `/${cityPath}/`;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1];
    if (!href.startsWith(prefix)) continue;
    const rest = href.slice(prefix.length).replace(/\/$/, "");
    if (!rest || rest.includes("/")) continue;
    const afterHref = html.slice(m.index + m[0].length);
    const textM = afterHref.match(/^[^>]*>([^<]+)/);
    if (!textM) continue;
    results.push({ slug: rest, text: textM[1].trim() });
  }
  return results;
}

async function findBMChurchSlug(cityPath: string, nombre: string): Promise<string | null> {
  const STOP = new Set(["de", "del", "la", "el", "los", "las", "y", "e", "a", "en", "i", "les"]);
  function words(text: string): Set<string> {
    return new Set(slugifyBM(text).split("-").filter((w) => w.length > 2 && !STOP.has(w)));
  }
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 6_000);
    const res = await fetch(`${BM_BASE}/${cityPath}/`, { headers: { "User-Agent": UA }, signal: ac.signal });
    clearTimeout(t);
    if (!res.ok) return null;

    const links = extractCityPageLinks(await res.text(), cityPath);
    const ourWords = words(nombre);
    let bestSlug: string | null = null;
    let bestScore = 1; // require overlap > 1 to avoid false positives

    for (const { slug, text } of links) {
      const linkWords = words(text);
      let overlap = 0;
      for (const w of ourWords) { if (linkWords.has(w)) overlap++; }
      if (overlap > bestScore) { bestScore = overlap; bestSlug = slug; }
    }
    return bestSlug;
  } catch { return null; }
}

async function fetchBMSchedule(
  nombre: string, lat: number, lng: number,
): Promise<HorarioMisa[]> {
  try {
    const cityPath = await getBMCityPath(lat, lng);
    if (!cityPath) return [];

    for (const slug of getSlugCandidates(nombre)) {
      try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 5_000);
        const res = await fetch(`${BM_BASE}/${cityPath}/${slug}/`, {
          headers: { "User-Agent": UA },
          signal: ac.signal,
        });
        clearTimeout(t);
        if (!res.ok) continue;
        const horarios = parseBMSchedule(await res.text());
        if (horarios.length > 0) return horarios;
      } catch { continue; }
    }

    // All direct slug attempts failed — search city listing page for best name match
    const foundSlug = await findBMChurchSlug(cityPath, nombre);
    if (foundSlug) {
      try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 5_000);
        const res = await fetch(`${BM_BASE}/${cityPath}/${foundSlug}/`, {
          headers: { "User-Agent": UA },
          signal: ac.signal,
        });
        clearTimeout(t);
        if (res.ok) {
          const horarios = parseBMSchedule(await res.text());
          if (horarios.length > 0) return horarios;
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return [];
}

// ─── misas.org API ───────────────────────────────────────────────────────────

const MISAS_ORG = "https://misas.org";

type MisasOrgMass = {
  time: string;
  days: number[];
  language?: string;
};

type MisasOrgChurch = {
  id: number;
  name: string;
  uri: string;
  addr: string;
  loc: string;
  prov: string;
  zip: string;
  lat: string;
  long: string;
  mass: MisasOrgMass[];
  open: string | null;
};

// 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat 7=Vigil(Sat evening) 8=Holiday(skip)
const MISAS_ORG_DAY: Record<number, string> = {
  0: "Domingo", 1: "Lunes", 2: "Martes", 3: "Miércoles",
  4: "Jueves", 5: "Viernes", 6: "Sábado",
  // 7 = Vigilia dominical (sábado vespertino) — se trata por separado
};

// Clave interna para separar misa ordinaria del sábado de la Vigilia
const VIGILIA_KEY = "Sábado:vigilia";

function parseMisasOrgMasses(masses: MisasOrgMass[]): HorarioMisa[] {
  const porDia = new Map<string, Set<string>>();

  for (const masa of masses) {
    if (!masa.time) continue;
    const [h, m] = masa.time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) continue;
    const hora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    for (const dayNum of masa.days) {
      // day=8 = festivo no recurrente → ignorar
      if (dayNum === 8) continue;
      // day=7 = Vigilia dominical
      const key = dayNum === 7 ? VIGILIA_KEY : MISAS_ORG_DAY[dayNum];
      if (!key) continue;
      if (!porDia.has(key)) porDia.set(key, new Set());
      porDia.get(key)!.add(hora);
    }
  }

  const resultado: HorarioMisa[] = [];
  for (const [key, horasSet] of porDia.entries()) {
    if (key === VIGILIA_KEY) {
      resultado.push({ dia: "Sábado", horas: Array.from(horasSet).sort(), esVigilia: true });
    } else {
      resultado.push({ dia: key, horas: Array.from(horasSet).sort() });
    }
  }

  // Ordenar: Lun → Sáb ordinario → Sáb vigilia → Dom
  return resultado.sort((a, b) => {
    const scoreA = diaScore(a);
    const scoreB = diaScore(b);
    return scoreA - scoreB;
  });
}

function diaScore(h: HorarioMisa): number {
  const base = DIA_SEMANA.indexOf(h.dia as typeof DIA_SEMANA[number]);
  const idx = base === 0 ? 7 : base; // Domingo al final
  return h.esVigilia ? idx + 0.5 : idx; // Vigilia justo después del sábado ordinario
}

export type IglesiaConHorarios = IglesiaBusqueda & { horarios: HorarioMisa[] };

// The misas.org API filters masses by the day-of-week of the queried date.
// To get a complete weekly schedule we query all 7 days in parallel and merge.
async function fetchMisasOrgDay(
  lat: number, lng: number, dateStr: string,
): Promise<MisasOrgChurch[]> {
  try {
    const url = `${MISAS_ORG}/api/parishsearch?sortbypos=[${lng},${lat},200]&country=es&date=${dateStr}&masses=1`;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 10_000);
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ac.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const raw: unknown = await res.json();
    if (Array.isArray(raw)) return raw as MisasOrgChurch[];
    if (raw && typeof raw === "object") {
      const nested = Object.values(raw as object).find(Array.isArray);
      return (nested ?? []) as MisasOrgChurch[];
    }
    return [];
  } catch { return []; }
}

export async function searchChurchesMisasOrg(
  lat: number,
  lng: number,
): Promise<Result<IglesiaConHorarios[]>> {
  const cacheKey = `misas-org:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = apiCache.get<IglesiaConHorarios[]>(cacheKey);
  if (cached) return ok(cached);

  return tryCatch(async () => {
    // Build one dateStr per day of the upcoming 7 days (covers all days of week)
    const today = new Date();
    const dateStrs = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    });

    // 7 parallel calls — total latency ≈ one call
    const dayResults = await Promise.allSettled(
      dateStrs.map((date) => fetchMisasOrgDay(lat, lng, date)),
    );

    // Merge all mass entries per church, deduplicating by (time + sorted days)
    const churchMap = new Map<number, MisasOrgChurch & { allMass: MisasOrgMass[] }>();
    for (const r of dayResults) {
      if (r.status !== "fulfilled") continue;
      for (const ch of r.value) {
        if (!churchMap.has(ch.id)) {
          churchMap.set(ch.id, { ...ch, allMass: [] });
        }
        const entry = churchMap.get(ch.id)!;
        for (const mass of ch.mass ?? []) {
          const key = `${mass.time}:${[...mass.days].sort((a, b) => a - b).join(",")}`;
          if (!entry.allMass.some((m) => `${m.time}:${[...m.days].sort((a, b) => a - b).join(",")}` === key)) {
            entry.allMass.push(mass);
          }
        }
      }
    }

    const iglesias: IglesiaConHorarios[] = Array.from(churchMap.values())
      .map((ch): IglesiaConHorarios | null => {
        const chLat = parseFloat(ch.lat);
        const chLng = parseFloat(ch.long);
        if (!isFinite(chLat) || !isFinite(chLng)) return null;
        return {
          id: `misas:${ch.id}`,
          nombre: ch.name,
          direccion: [ch.addr, ch.loc].filter(Boolean).join(", "),
          lat: chLat,
          lng: chLng,
          horarios: parseMisasOrgMasses(ch.allMass),
        };
      })
      .filter((ig): ig is IglesiaConHorarios => ig !== null);

    apiCache.set(cacheKey, iglesias, TTL_1H);

    // Persistir en BD local (background — no bloquea la UI)
    const ahora = new Date();
    for (const ig of iglesias) {
      if (ig.horarios.length > 0) {
        saveIglesia({
          id: ig.id, nombre: ig.nombre, direccion: ig.direccion,
          lat: ig.lat, lng: ig.lng, telefono: null, web: null,
          horarios: ig.horarios, updatedAt: ahora,
        }).catch(() => {});
      }
    }

    return iglesias;
  }, "searchChurchesMisasOrg");
}

// ─── getChurchDetails ─────────────────────────────────────────────────────────

/**
 * Obtiene los detalles (horarios) de una iglesia.
 * - Para IDs OSM ("node:XXX", "way:XXX"): consulta la OSM REST API.
 * - Para IDs misas.org ("misas:XXX"): va directamente a buscarmisas.es.
 * fallbackNombre se usa cuando buscarmisas.es necesita el nombre de la iglesia.
 */
export async function getChurchDetails(
  id: string,
  fallbackLat: number = 0,
  fallbackLng: number = 0,
  fallbackNombre: string = "",
): Promise<Result<IglesiaDetalle>> {
  const cacheKey = `church-detail:${id}`;
  const cached = apiCache.get<IglesiaDetalle>(cacheKey);
  if (cached) return ok(cached);

  const [type, osmId] = id.split(":") as [string, string];

  // Consultar BD local antes de ir a la red (TTL de 24h).
  // Para IDs misas.org solo usamos la caché si ya tiene misas el domingo
  // (evita devolver datos incompletos que bloqueen el fallback a buscarmisas.es).
  const CACHE_BD_MS = 24 * 60 * 60 * 1000;
  try {
    const local = await getIglesiaById(id);
    if (local?.updatedAt && Date.now() - local.updatedAt.getTime() < CACHE_BD_MS) {
      const horariosCached = (local.horarios as HorarioMisa[]) ?? [];
      const cacheSuficiente = type !== "misas" || horariosCached.some((h) => h.dia === "Domingo");
      if (cacheSuficiente) {
        const detalle: IglesiaDetalle = {
          id: local.id,
          nombre: local.nombre,
          direccion: local.direccion,
          lat: local.lat,
          lng: local.lng,
          telefono: local.telefono ?? undefined,
          web: local.web ?? undefined,
          horarios: horariosCached,
          fotosRefs: [],
        };
        apiCache.set(cacheKey, detalle, TTL_1H);
        return ok(detalle);
      }
    }
  } catch { /* BD no disponible, continuar con red */ }

  // IDs de misas.org no tienen entrada en OSM — ir directamente a buscarmisas.es
  if (type === "misas") {
    return tryCatch(async () => {
      const nombre  = fallbackNombre || "Iglesia";
      const horarios = (fallbackLat !== 0 || fallbackLng !== 0)
        ? await fetchBMSchedule(nombre, fallbackLat, fallbackLng)
        : [];

      const detalle: IglesiaDetalle = {
        id, nombre,
        direccion: "", lat: fallbackLat, lng: fallbackLng,
        horarios,
        fotosRefs: [],
      };

      // Solo cachear si tenemos horarios reales — si está vacío dejamos que
      // el próximo intent (tras pull-to-refresh) vuelva a intentar buscarmisas.es
      if (horarios.length > 0) {
        apiCache.set(cacheKey, detalle, TTL_1H);
        saveIglesia({
          id, nombre, direccion: "", lat: fallbackLat, lng: fallbackLng,
          telefono: null, web: null, horarios, updatedAt: new Date(),
        }).catch(() => {});
      }

      return detalle;
    }, "getChurchDetails:misas");
  }

  return tryCatch(async () => {
    if (!type || !osmId) throw new Error(`ID inválido: ${id}`);

    const el = await fetchOsmElement(type, osmId);
    if (!el) throw new Error(`No se encontró el elemento ${id}`);

    const tags = el.tags ?? {};

    // Los "way" y "relation" no tienen lat/lng en la REST API → usar fallback
    const lat = (el.type === "node" && el.lat) ? el.lat : fallbackLat;
    const lng = (el.type === "node" && el.lon) ? el.lon : fallbackLng;

    const nombre = tags.name ?? tags["name:es"] ?? "Iglesia";
    let horarios = parseOsmOpeningHours(tags.service_times ?? tags.opening_hours ?? "");

    // Fallback: buscarmisas.es when OSM has no schedule data
    if (horarios.length === 0 && (fallbackLat !== 0 || fallbackLng !== 0)) {
      horarios = await fetchBMSchedule(nombre, fallbackLat || lat, fallbackLng || lng);
    }

    const rawImage = tags.image ?? tags.wikimedia_commons;
    const image = rawImage
      ? rawImage.startsWith("File:")
        ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(rawImage.slice(5))}?width=800`
        : rawImage
      : undefined;

    const detalle: IglesiaDetalle = {
      id,
      nombre,
      direccion: [
        tags["addr:street"] && tags["addr:housenumber"]
          ? `${tags["addr:street"]}, ${tags["addr:housenumber"]}`
          : tags["addr:street"] ?? "",
        tags["addr:city"] ?? "",
      ].filter(Boolean).join(", "),
      lat,
      lng,
      telefono: tags.phone ?? tags["contact:phone"],
      web: tags.website ?? tags["contact:website"] ?? tags["contact:url"],
      horarios,
      fotosRefs: [],
      image,
    };

    apiCache.set(cacheKey, detalle, TTL_1H);

    // Persistir en BD local en background (no bloquea el retorno al caller)
    saveIglesia({
      id: detalle.id,
      nombre: detalle.nombre,
      direccion: detalle.direccion,
      lat: detalle.lat,
      lng: detalle.lng,
      telefono: detalle.telefono ?? null,
      web: detalle.web ?? null,
      horarios: detalle.horarios,
      updatedAt: new Date(),
    }).catch(() => { /* ignorar errores de escritura en BD */ });

    return detalle;
  }, "getChurchDetails");
}
