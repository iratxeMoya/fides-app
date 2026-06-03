/**
 * Módulo de geocodificación vía Nominatim (OpenStreetMap).
 *
 * getCurrentAddress  → Geocodificación inversa (coordenadas → dirección)
 * getAddressDetails  → Igual pero con componentes desglosados
 * geocodeAddress     → Geocodificación directa (dirección → coordenadas)
 *
 * No requiere API key. Política de uso: máx. 1 req/s con caché activo.
 * Endpoint: https://nominatim.openstreetmap.org
 */

import { ok, err, tryCatch, type Result } from "./result";
import { apiCache, TTL_1H } from "./cache";

// ─── URL ──────────────────────────────────────────────────────────────────────

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT     = "FidesApp/1.0";
const LANGUAGE       = "es";

// ─── Tipos internos de Nominatim ──────────────────────────────────────────────

type NominatimAddress = {
  road?:               string;
  house_number?:       string;
  neighbourhood?:      string;
  suburb?:             string;
  city?:               string;
  town?:               string;
  village?:            string;
  county?:             string;
  state?:              string;
  postcode?:           string;
  country?:            string;
  country_code?:       string;
};

type NominatimResult = {
  place_id:     number;
  lat:          string;
  lon:          string;
  display_name: string;
  address:      NominatimAddress;
};

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type Coordenadas = { lat: number; lng: number };

export type DireccionCompleta = {
  /** Dirección formateada completa */
  direccion:    string;
  calle?:       string;
  numero?:      string;
  localidad?:   string;
  provincia?:   string;
  codigoPostal?: string;
  pais?:        string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nominatimHeaders(): HeadersInit {
  return {
    "User-Agent":     USER_AGENT,
    "Accept":         "application/json",
    "Accept-Language": LANGUAGE,
  };
}

function parseAddress(result: NominatimResult): DireccionCompleta {
  const a = result.address;
  return {
    direccion:    result.display_name,
    calle:        a.road,
    numero:       a.house_number,
    localidad:    a.city ?? a.town ?? a.village,
    provincia:    a.state ?? a.county,
    codigoPostal: a.postcode,
    pais:         a.country,
  };
}

// ─── getCurrentAddress ────────────────────────────────────────────────────────

/**
 * Convierte coordenadas GPS en una dirección legible.
 * Resultado cacheado 1 hora.
 */
export async function getCurrentAddress(
  lat: number,
  lng: number
): Promise<Result<string>> {
  const latR     = lat.toFixed(4);
  const lngR     = lng.toFixed(4);
  const cacheKey = `reverse-geocode:${latR},${lngR}`;

  const cached = apiCache.get<string>(cacheKey);
  if (cached) return ok(cached);

  return tryCatch(async () => {
    const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${LANGUAGE}`;
    const res = await fetch(url, { headers: nominatimHeaders() });

    if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);

    const json: NominatimResult = await res.json();
    const direccion = json.display_name;
    if (!direccion) throw new Error(`No se encontró dirección para (${lat}, ${lng})`);

    apiCache.set(cacheKey, direccion, TTL_1H);
    return direccion;
  }, "getCurrentAddress");
}

// ─── getAddressDetails ────────────────────────────────────────────────────────

/**
 * Igual que getCurrentAddress pero devuelve los componentes desglosados.
 */
export async function getAddressDetails(
  lat: number,
  lng: number
): Promise<Result<DireccionCompleta>> {
  const cacheKey = `reverse-geocode-detail:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached   = apiCache.get<DireccionCompleta>(cacheKey);
  if (cached) return ok(cached);

  return tryCatch(async () => {
    const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${LANGUAGE}`;
    const res = await fetch(url, { headers: nominatimHeaders() });

    if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);

    const json: NominatimResult = await res.json();
    const detalle = parseAddress(json);

    apiCache.set(cacheKey, detalle, TTL_1H);
    return detalle;
  }, "getAddressDetails");
}

// ─── geocodeAddress ───────────────────────────────────────────────────────────

/**
 * Convierte una dirección textual en coordenadas GPS.
 */
export async function geocodeAddress(
  address: string
): Promise<Result<Coordenadas>> {
  const query = address.trim();
  if (!query) return err("La dirección no puede estar vacía");

  const cacheKey = `geocode:${query.toLowerCase()}`;
  const cached   = apiCache.get<Coordenadas>(cacheKey);
  if (cached) return ok(cached);

  return tryCatch(async () => {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=${LANGUAGE}`;
    const res = await fetch(url, { headers: nominatimHeaders() });

    if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);

    const results: NominatimResult[] = await res.json();
    if (results.length === 0) {
      throw new Error(`No se encontraron coordenadas para "${query}"`);
    }

    const coords: Coordenadas = {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
    };

    apiCache.set(cacheKey, coords, TTL_1H);
    return coords;
  }, "geocodeAddress");
}
