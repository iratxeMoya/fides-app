// ─── Result / Cache ───────────────────────────────────────────────────────────
export { ok, err, tryCatch, unwrap } from "./result";
export type { Result, Ok, Err } from "./result";

export { apiCache, TTL_5M, TTL_1H, TTL_24H } from "./cache";

// ─── Biblia ───────────────────────────────────────────────────────────────────
export { getLecturaDelDia, getBusquedaPasaje } from "./biblia";
export type { LecturaDelDia } from "./biblia";

// ─── Iglesias ─────────────────────────────────────────────────────────────────
export {
  searchChurchesNearby,
  searchChurchesByQuery,
  searchChurchesMisasOrg,
  getChurchDetails,
  parseOsmOpeningHours,
} from "./iglesias";
export type { IglesiaBusqueda, IglesiaDetalle, IglesiaConHorarios } from "./iglesias";

// ─── Geocoding ────────────────────────────────────────────────────────────────
export {
  getCurrentAddress,
  getAddressDetails,
  geocodeAddress,
} from "./geocoding";
export type { Coordenadas, DireccionCompleta } from "./geocoding";
