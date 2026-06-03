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

// ─── Endpoints ────────────────────────────────────────────────────────────────

const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSM_API   = "https://api.openstreetmap.org/api/0.6";
const UA        = "FidesApp/1.0";

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
] as const;

// ─── Tipos Nominatim ──────────────────────────────────────────────────────────

type NominatimResult = {
  osm_type:     "node" | "way" | "relation";
  osm_id:       number;
  lat:          string;
  lon:          string;
  name:         string;
  display_name: string;
  address: {
    road?:         string;
    house_number?: string;
    city?:         string;
    town?:         string;
    village?:      string;
  };
  extratags?: {
    opening_hours?: string;
    service_times?: string;
    phone?:         string;
    website?:       string;
    religion?:      string;
    denomination?:  string;
  };
};

// ─── Tipos OSM REST API ───────────────────────────────────────────────────────

type OsmApiElement = {
  type: string;
  id:   number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
};

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type IglesiaBusqueda = {
  id:            string;
  nombre:        string;
  direccion:     string;
  lat:           number;
  lng:           number;
  abiertaAhora?: boolean;
};

export type IglesiaDetalle = {
  id:        string;
  nombre:    string;
  direccion: string;
  lat:       number;
  lng:       number;
  telefono?: string;
  web?:      string;
  horarios:  HorarioMisa[];
  fotosRefs: string[];
};

// ─── Parser de opening_hours OSM → HorarioMisa[] ────────────────────────────

const ALL_DAYS_KEYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
type DayKey = typeof ALL_DAYS_KEYS[number];

const OSM_TO_DIA: Record<DayKey, string> = {
  Mo: "Lunes",    Tu: "Martes",  We: "Miércoles",
  Th: "Jueves",   Fr: "Viernes", Sa: "Sábado",
  Su: "Domingo",
};

const DIA_SEMANA = [
  "Domingo", "Lunes", "Martes", "Miércoles",
  "Jueves",  "Viernes", "Sábado",
] as const;

function expandDayRange(range: string): string[] {
  const [start, end] = range.split("-") as [string, string];
  const startIdx = ALL_DAYS_KEYS.indexOf(start as DayKey);
  const endIdx   = ALL_DAYS_KEYS.indexOf(end as DayKey);
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
    ventana <= 60  ? ventana
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

export function parseOsmOpeningHours(value: string): HorarioMisa[] {
  if (!value.trim()) return [];

  const porDia = new Map<string, Set<string>>();
  const rules  = value.split(";").map((r) => r.trim()).filter(Boolean);

  for (const rule of rules) {
    const firstTimePos = rule.search(/\d{2}:\d{2}/);
    if (firstTimePos === -1) continue;

    const dayPart  = rule.slice(0, firstTimePos).trim();
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
    const rangeMatches = [...timePart.matchAll(/(\d{2}:\d{2})-(\d{2}:\d{2})/g)];

    if (rangeMatches.length > 0) {
      for (const m of rangeMatches) {
        const abreMins   = timeToMins(m[1]);
        const cierraMins = timeToMins(m[2]);
        const duracion   = cierraMins - abreMins;
        if (duracion >= 150) {
          horas.push(...inferHorasMisa(abreMins, cierraMins));
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
      if (!porDia.has(diaNombre)) porDia.set(diaNombre, new Set());
      for (const h of horas) porDia.get(diaNombre)!.add(h);
    }
  }

  const resultado: HorarioMisa[] = [];
  for (const [dia, horasSet] of porDia.entries()) {
    resultado.push({ dia, horas: Array.from(horasSet).sort() });
  }

  return resultado.sort((a, b) => {
    const idxA = DIA_SEMANA.indexOf(a.dia as typeof DIA_SEMANA[number]);
    const idxB = DIA_SEMANA.indexOf(b.dia as typeof DIA_SEMANA[number]);
    return (idxA === 0 ? 7 : idxA) - (idxB === 0 ? 7 : idxB);
  });
}

// ─── Helpers isOpenNow ────────────────────────────────────────────────────────

function isOpenNow(openingHours: string): boolean {
  const JS_TO_OSM    = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
  const now          = new Date();
  const todayOsm     = JS_TO_OSM[now.getDay()];
  const currentMins  = now.getHours() * 60 + now.getMinutes();

  for (const rule of openingHours.split(";").map((r) => r.trim()).filter(Boolean)) {
    const timeMatch = rule.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
    if (!timeMatch) continue;
    const [, abre, cierra] = timeMatch;
    const dayPart = rule.slice(0, timeMatch.index!).trim();

    let dayKeys: string[];
    if (!dayPart)                   dayKeys = Array.from(ALL_DAYS_KEYS);
    else if (dayPart.includes(",")) dayKeys = dayPart.split(",").flatMap((p) => {
      const part = p.trim();
      return part.includes("-") ? expandDayRange(part) : [part];
    });
    else if (dayPart.includes("-")) dayKeys = expandDayRange(dayPart);
    else                            dayKeys = [dayPart];

    if (!dayKeys.includes(todayOsm)) continue;
    if (currentMins >= timeToMins(abre) && currentMins < timeToMins(cierra)) return true;
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
  const res  = await fetch(url, {
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

      const json: { elements: Array<{
        type: string; id: number;
        lat?: number; lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }> } = await res.json();

      return (json.elements ?? [])
        .map((el) => {
          const lat2 = el.lat ?? el.center?.lat;
          const lng2 = el.lon ?? el.center?.lon;
          if (!lat2 || !lng2) return null;
          const tags = el.tags ?? {};
          return {
            id:        `${el.type}:${el.id}`,
            nombre:    tags.name ?? tags["name:es"] ?? "Iglesia",
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
  lat:      number,
  lng:      number,
  radiusKm: number = 5
): Promise<Result<IglesiaBusqueda[]>> {
  const cacheKey = `churches-nearby:${lat.toFixed(4)},${lng.toFixed(4)},${radiusKm}`;
  const cached   = apiCache.get<IglesiaBusqueda[]>(cacheKey);
  if (cached) return ok(cached);

  // Convertir radio a bounding box
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const viewbox  = `${lng - lngDelta},${lat + latDelta},${lng + lngDelta},${lat - latDelta}`;
  const bbox     = `&bounded=1&viewbox=${viewbox}&limit=50`;

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
      ...(byText.status    === "fulfilled" ? byText.value    : []),
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
        nombre:       r.name,
        direccion:    buildAddressNominatim(r),
        lat:          parseFloat(r.lat),
        lng:          parseFloat(r.lon),
        abiertaAhora: (r.extratags?.service_times ?? r.extratags?.opening_hours) ? isOpenNow(r.extratags!.service_times ?? r.extratags!.opening_hours!) : undefined,
      });
    }

    apiCache.set(cacheKey, iglesias, TTL_1H);
    return iglesias;
  }, "searchChurchesNearby");
}

// ─── searchChurchesByQuery ────────────────────────────────────────────────────

export async function searchChurchesByQuery(
  query:     string,
  location?: { lat: number; lng: number }
): Promise<Result<IglesiaBusqueda[]>> {
  if (!query.trim()) return ok([]);

  const cacheKey = `churches-query:${query}:${location?.lat.toFixed(4) ?? ""}`;
  const cached   = apiCache.get<IglesiaBusqueda[]>(cacheKey);
  if (cached) return ok(cached);

  return tryCatch(async () => {
    let path = `/search?q=${encodeURIComponent(query)}&limit=30`;

    if (location) {
      const { lat, lng } = location;
      const d       = 0.45; // ~50 km
      const viewbox = `${lng - d},${lat + d},${lng + d},${lat - d}`;
      path += `&bounded=1&viewbox=${viewbox}`;
    }

    const results = await fetchNominatim(path);

    const iglesias: IglesiaBusqueda[] = results
      .filter((r) => r.name)
      .map((r) => ({
        id:        `${r.osm_type}:${r.osm_id}`,
        nombre:    r.name,
        direccion: buildAddressNominatim(r),
        lat:       parseFloat(r.lat),
        lng:       parseFloat(r.lon),
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
  "cataluna":                    "cataluna",
  "comunidad-de-madrid":         "madrid",
  "comunidad-valenciana":        "comunidad-valenciana",
  "pais-vasco":                  "pais-vasco",
  "euskadi":                     "pais-vasco",
  "andalucia":                   "andalucia",
  "castilla-y-leon":             "castilla-y-leon",
  "castilla-la-mancha":          "castilla-la-mancha",
  "galicia":                     "galicia",
  "aragon":                      "aragon",
  "extremadura":                 "extremadura",
  "principado-de-asturias":      "asturias",
  "asturias":                    "asturias",
  "cantabria":                   "cantabria",
  "la-rioja":                    "la-rioja",
  "comunidad-foral-de-navarra":  "navarra",
  "navarra-nafarroa":            "navarra",
  "region-de-murcia":            "murcia",
  "illes-balears":               "islas-baleares",
  "canarias":                    "canarias",
};

// Singleton promise per lat/lng key — avoids duplicate reverse-geocode requests
const _bmCityPromises = new Map<string, Promise<string | null>>();

function getBMCityPath(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (_bmCityPromises.has(key)) return _bmCityPromises.get(key)!;

  const p = (async (): Promise<string | null> => {
    try {
      const ac = new AbortController();
      const t  = setTimeout(() => ac.abort(), 4_000);
      const res = await fetch(
        `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
        { headers: { "User-Agent": UA, "Accept-Language": "es" }, signal: ac.signal },
      );
      clearTimeout(t);
      if (!res.ok) return null;
      const data: { address?: Record<string, string> } = await res.json();
      const rawCity  = data.address?.city ?? data.address?.town ?? data.address?.village ?? "";
      const rawState = data.address?.state ?? "";
      if (!rawCity || !rawState) return null;
      const stateSlug = slugifyBM(rawState);
      const state     = BM_STATE[stateSlug] ?? stateSlug;
      const city      = slugifyBM(rawCity);
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
  const rowRe  = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
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

async function fetchBMSchedule(
  nombre: string, lat: number, lng: number,
): Promise<HorarioMisa[]> {
  try {
    const cityPath = await getBMCityPath(lat, lng);
    if (!cityPath) return [];

    for (const slug of getSlugCandidates(nombre)) {
      try {
        const ac  = new AbortController();
        const t   = setTimeout(() => ac.abort(), 5_000);
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
  } catch { /* ignore */ }
  return [];
}

// ─── misas.org API ───────────────────────────────────────────────────────────

const MISAS_ORG = "https://misas.org";

type MisasOrgMass = {
  time:      string;
  days:      number[];
  language?: string;
};

type MisasOrgChurch = {
  id:   number;
  name: string;
  uri:  string;
  addr: string;
  loc:  string;
  prov: string;
  zip:  string;
  lat:  string;
  long: string;
  mass: MisasOrgMass[];
  open: string | null;
};

// 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat 7=Vigil(Sat) 8=Holiday(skip)
const MISAS_ORG_DAY: Record<number, string> = {
  0: "Domingo", 1: "Lunes",   2: "Martes",    3: "Miércoles",
  4: "Jueves",  5: "Viernes", 6: "Sábado",    7: "Sábado",
};

function parseMisasOrgMasses(masses: MisasOrgMass[]): HorarioMisa[] {
  const porDia = new Map<string, Set<string>>();

  for (const masa of masses) {
    if (!masa.time) continue;
    const [h, m] = masa.time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) continue;
    const hora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    for (const dayNum of masa.days) {
      const dia = MISAS_ORG_DAY[dayNum];
      if (!dia) continue;
      if (!porDia.has(dia)) porDia.set(dia, new Set());
      porDia.get(dia)!.add(hora);
    }
  }

  const resultado: HorarioMisa[] = [];
  for (const [dia, horasSet] of porDia.entries()) {
    resultado.push({ dia, horas: Array.from(horasSet).sort() });
  }

  return resultado.sort((a, b) => {
    const idxA = DIA_SEMANA.indexOf(a.dia as typeof DIA_SEMANA[number]);
    const idxB = DIA_SEMANA.indexOf(b.dia as typeof DIA_SEMANA[number]);
    return (idxA === 0 ? 7 : idxA) - (idxB === 0 ? 7 : idxB);
  });
}

export type IglesiaConHorarios = IglesiaBusqueda & { horarios: HorarioMisa[] };

export async function searchChurchesMisasOrg(
  lat: number,
  lng: number,
): Promise<Result<IglesiaConHorarios[]>> {
  const today    = new Date();
  const date     = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;
  const cacheKey = `misas-org:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached   = apiCache.get<IglesiaConHorarios[]>(cacheKey);
  if (cached) return ok(cached);

  return tryCatch(async () => {
    const url = `${MISAS_ORG}/api/parishsearch?sortbypos=[${lng},${lat},200]&country=es&date=${date}&masses=1`;
    const ac  = new AbortController();
    const t   = setTimeout(() => ac.abort(), 10_000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: ac.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`misas.org respondió ${res.status}`);

    const raw: unknown = await res.json();
    // API may return a bare array or a wrapper object — extract whichever array we find
    let data: MisasOrgChurch[];
    if (Array.isArray(raw)) {
      data = raw;
    } else if (raw && typeof raw === "object") {
      const nested = Object.values(raw as object).find(Array.isArray);
      data = nested ?? [];
    } else {
      data = [];
    }

    const iglesias: IglesiaConHorarios[] = data
      .map((ch): IglesiaConHorarios | null => {
        const chLat = parseFloat(ch.lat);
        const chLng = parseFloat(ch.long);
        if (!isFinite(chLat) || !isFinite(chLng)) return null;
        return {
          id:        `misas:${ch.id}`,
          nombre:    ch.name,
          direccion: [ch.addr, ch.loc].filter(Boolean).join(", "),
          lat:       chLat,
          lng:       chLng,
          horarios:  parseMisasOrgMasses(ch.mass ?? []),
        };
      })
      .filter((ig): ig is IglesiaConHorarios => ig !== null);

    apiCache.set(cacheKey, iglesias, TTL_1H);
    return iglesias;
  }, "searchChurchesMisasOrg");
}

// ─── getChurchDetails ─────────────────────────────────────────────────────────

/**
 * Obtiene los detalles (horarios) de una iglesia via OSM REST API.
 * Para elementos "way" / "relation" que no devuelven coordenadas,
 * se usan fallbackLat/fallbackLng (los de la búsqueda inicial).
 */
export async function getChurchDetails(
  id:          string,
  fallbackLat: number = 0,
  fallbackLng: number = 0,
): Promise<Result<IglesiaDetalle>> {
  const cacheKey = `church-detail:${id}`;
  const cached   = apiCache.get<IglesiaDetalle>(cacheKey);
  if (cached) return ok(cached);

  return tryCatch(async () => {
    const [type, osmId] = id.split(":") as [string, string];
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
      telefono:  tags.phone ?? tags["contact:phone"],
      web:       tags.website ?? tags["contact:website"] ?? tags["contact:url"],
      horarios,
      fotosRefs: [],
    };

    apiCache.set(cacheKey, detalle, TTL_1H);
    return detalle;
  }, "getChurchDetails");
}
