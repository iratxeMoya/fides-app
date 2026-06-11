import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Map as MaplibreMap,
  Camera as MaplibreCamera,
  UserLocation as MaplibreUserLocation,
  Marker as MaplibreMarker,
  GeoJSONSource as MaplibreGeoJSONSource,
  Layer as MaplibreLayer,
  type MapRef,
} from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";

import {
  searchChurchesMisasOrg,
  searchChurchesByQuery,
  getChurchDetails,
  isOpenNow,
} from "@/lib/api/iglesias";
import { distanciaKm, proximaMisaHoy } from "@/lib/utils/distancia";
import { SearchBar } from "@/components/ui/SearchBar";
import {
  IglesiaListCard,
  type IglesiaMapaItem,
} from "@/components/mapa/IglesiaListCard";

// ─── Constantes ──────────────────────────────────────────────────────────────

const RADIO_KM = 1.5;
const ACCENT   = "#FF7D7D";

// ─── Filtros ──────────────────────────────────────────────────────────────────

type Filtros = {
  conHorarioApertura: boolean;
  abiertoAhora:       boolean;
  dia:                string | null;
  franja:             number | null; // 0=mañana 1=tarde 2=noche
};

const FILTROS_VACIOS: Filtros = {
  conHorarioApertura: false,
  abiertoAhora:       false,
  dia:                null,
  franja:             null,
};

const DIAS_ES    = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const DIAS_CORTO = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const FRANJAS    = [
  { label: "Mañana", desde: 8,  hasta: 13 },
  { label: "Tarde",  desde: 13, hasta: 19 },
  { label: "Noche",  desde: 19, hasta: 23 },
];

function hayFiltrosActivos(f: Filtros): boolean {
  return f.conHorarioApertura || f.abiertoAhora || !!f.dia;
}

function aplicarFiltros(lista: IglesiaMapaItem[], f: Filtros): IglesiaMapaItem[] {
  if (!hayFiltrosActivos(f)) return lista;
  return lista.filter((ig) => {
    if (f.conHorarioApertura && !ig.openingHours) return false;
    if (f.abiertoAhora && (!ig.openingHours || !isOpenNow(ig.openingHours))) return false;
    if (f.dia) {
      const horarioDia = ig.horarios.find((h) => h.dia === f.dia);
      if (!horarioDia) return false;
      if (f.franja !== null) {
        const { desde, hasta } = FRANJAS[f.franja];
        const tieneHora = horarioDia.horas.some((hora) => {
          const [hh, mm] = hora.split(":").map(Number);
          const mins = hh * 60 + mm;
          return mins >= desde * 60 && mins < hasta * 60;
        });
        if (!tieneHora) return false;
      }
    }
    return true;
  });
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({
  label, active, onPress, compact = false,
}: {
  label: string; active: boolean; onPress: () => void; compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={null}
      style={({ pressed }) => ({
        opacity:           pressed ? 0.7 : 1,
        paddingHorizontal: compact ? 8 : 12,
        paddingVertical:   compact ? 5 : 7,
        borderRadius:      20,
        backgroundColor:   active ? "rgba(255,125,125,0.15)" : "#1C1C1C",
        borderWidth:       1,
        borderColor:       active ? ACCENT : "#2E2E2E",
      })}
    >
      <Text style={{ fontFamily: "Inter_500Medium", fontSize: compact ? 11 : 12, color: active ? ACCENT : "#777777" }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── FiltrosPanel ─────────────────────────────────────────────────────────────

function FiltrosPanel({ filtros, onChange }: { filtros: Filtros; onChange: (f: Filtros) => void }) {
  return (
    <View
      style={{
        backgroundColor: "#111111",
        borderRadius:    14,
        borderWidth:     1,
        borderColor:     "#222222",
        padding:         14,
        gap:             12,
        shadowColor:     "#000",
        shadowOffset:    { width: 0, height: 3 },
        shadowOpacity:   0.5,
        shadowRadius:    8,
        elevation:       6,
      }}
    >
      {/* Toggles rápidos */}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Chip
          label="Con horario apertura"
          active={filtros.conHorarioApertura}
          onPress={() => onChange({ ...filtros, conHorarioApertura: !filtros.conHorarioApertura })}
        />
        <Chip
          label="Abierta ahora"
          active={filtros.abiertoAhora}
          onPress={() => onChange({ ...filtros, abiertoAhora: !filtros.abiertoAhora })}
        />
      </View>

      <View style={{ height: 1, backgroundColor: "#1E1E1E" }} />

      {/* Selector de día */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: "#555555", letterSpacing: 1.5, textTransform: "uppercase" }}>
          Misa el día
        </Text>
        <View style={{ flexDirection: "row", gap: 5 }}>
          {DIAS_ES.map((dia, i) => (
            <Chip
              key={dia}
              label={DIAS_CORTO[i]}
              active={filtros.dia === dia}
              compact
              onPress={() => onChange({ ...filtros, dia: filtros.dia === dia ? null : dia, franja: null })}
            />
          ))}
        </View>
      </View>

      {/* Franja horaria */}
      {filtros.dia && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: "#555555", letterSpacing: 1.5, textTransform: "uppercase" }}>
            Entre las…
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {FRANJAS.map(({ label }, i) => (
              <Chip
                key={label}
                label={label}
                active={filtros.franja === i}
                onPress={() => onChange({ ...filtros, franja: filtros.franja === i ? null : i })}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
const MAX_DETAIL = 15;
const SNAP_POINTS = ["30%", "60%", "92%"] as const;

// CARTO Dark Matter: mapa oscuro libre, sin API key
const DARK_MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
// Centro por defecto: Madrid [lng, lat] — formato GeoJSON
const MADRID: [number, number] = [-3.7038, 40.4168];

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Coordenadas = { lat: number; lng: number };

// ─── GeoJSON circle helper ────────────────────────────────────────────────────

function crearCirculoGeoJSON(lat: number, lng: number, radioKm: number) {
  const PUNTOS = 64;
  const radioGr = radioKm / 111.32;
  const latRad = (lat * Math.PI) / 180;
  const coords: [number, number][] = [];
  for (let i = 0; i <= PUNTOS; i++) {
    const a = (i / PUNTOS) * 2 * Math.PI;
    coords.push([
      lng + (radioGr / Math.cos(latRad)) * Math.cos(a),
      lat + radioGr * Math.sin(a),
    ]);
  }
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "Polygon" as const, coordinates: [coords] },
      },
    ],
  };
}

// ─── Sub-componentes UI ───────────────────────────────────────────────────────

function MarkerCruz({ seleccionado }: { seleccionado: boolean }) {
  const color = seleccionado ? "#FF7D7D" : "#FFFFFF";
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: seleccionado ? "rgba(255,125,125,0.2)" : "rgba(255,255,255,0.08)",
        borderWidth: 1.5,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ position: "absolute", width: 1.5, height: 13, top: 10, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: "absolute", width: 9, height: 1.5, top: 15, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

function FabUbicacion({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#1A1A1A",
        borderWidth: 1,
        borderColor: "#2A2A2A",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
      })}
    >
      <Ionicons name="locate" size={20} color="#A0A0A0" />
    </Pressable>
  );
}

// ─── MapaScreen ───────────────────────────────────────────────────────────────

export default function MapaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const cameraRef = useRef<any>(null);
  const mapRef = useRef<MapRef>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const flatListRef = useRef<any>(null);

  // ── Estado ────────────────────────────────────────────────────────────────
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null);
  const [iglesias, setIglesias] = useState<IglesiaMapaItem[]>([]);
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [mapCentro, setMapCentro] = useState<Coordenadas | null>(null);
  const [mostrarBotonZona, setMostrarBotonZona] = useState(false);
  const [centroCirculo, setCentroCirculo] = useState<Coordenadas | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const listaVisible = useMemo(
    () => seleccionadaId
      ? iglesias.filter((ig) => ig.id === seleccionadaId)
      : aplicarFiltros(iglesias, filtros),
    [iglesias, filtros, seleccionadaId],
  );

  const busquedaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suprimirRegionHasta = useRef<number>(0);
  const markerPresado = useRef(false);

  // ── Cargar detalles en paralelo ───────────────────────────────────────────

  const enriquecerConDetalles = useCallback(
    async (base: IglesiaMapaItem[], origen: Coordenadas) => {
      const top = base.slice(0, MAX_DETAIL);

      const resultados = await Promise.allSettled(
        top.map((ig) => getChurchDetails(ig.id, ig.lat, ig.lng, ig.nombre))
      );

      setIglesias((prev) => {
        const mapa = new Map(prev.map((ig) => [ig.id, ig]));

        resultados.forEach((r, i) => {
          const id = top[i].id;
          if (r.status === "fulfilled" && r.value.ok) {
            const d = r.value.data;
            const item = mapa.get(id);
            if (item) {
              mapa.set(id, {
                ...item,
                horarios:         d.horarios,
                openingHours:     d.openingHours,
                proximaMisa:      proximaMisaHoy(d.horarios),
                detallesCargados: true,
              });
            }
          } else {
            const item = mapa.get(id);
            if (item) mapa.set(id, { ...item, detallesCargados: true });
          }
        });

        return Array.from(mapa.values()).sort(
          (a, b) => a.distanciaKm - b.distanciaKm
        );
      });
    },
    []
  );

  // ── Cargar iglesias cercanas ──────────────────────────────────────────────

  const cargarCercanas = useCallback(
    async (coords: Coordenadas) => {
      setCargando(true);
      setError(null);
      setMostrarBotonZona(false);

      const resultado = await searchChurchesMisasOrg(coords.lat, coords.lng);

      if (!resultado.ok) {
        setError(resultado.error);
        setCargando(false);
        return;
      }

      const base: IglesiaMapaItem[] = resultado.data
        .filter((ig) => distanciaKm(coords.lat, coords.lng, ig.lat, ig.lng) <= RADIO_KM)
        .map((ig) => {
          // Si misas.org no tiene ninguna misa en domingo, los horarios están incompletos.
          // Marcamos detallesCargados:false para que al seleccionarla se consulte buscarmisas.es.
          const tieneDomingo = ig.horarios.some((h) => h.dia === "Domingo");
          return {
            ...ig,
            distanciaKm: distanciaKm(coords.lat, coords.lng, ig.lat, ig.lng),
            proximaMisa: proximaMisaHoy(ig.horarios),
            detallesCargados: tieneDomingo,
          };
        })
        .sort((a, b) => a.distanciaKm - b.distanciaKm);

      setIglesias(base);
      setCargando(false);
      setMostrarBotonZona(true);
      setCentroCirculo(coords);
      // Enriquecer top-15 en background → rellena openingHours para los filtros
      if (base.length > 0) enriquecerConDetalles(base, coords);
    },
    [enriquecerConDetalles]
  );

  // ── Búsqueda por texto ────────────────────────────────────────────────────

  const buscarPorTexto = useCallback(
    async (texto: string) => {
      if (!texto.trim()) {
        if (coordenadas) cargarCercanas(coordenadas);
        return;
      }

      setBuscando(true);
      const resultado = await searchChurchesByQuery(
        texto,
        coordenadas ?? undefined
      );
      setBuscando(false);

      if (!resultado.ok) return;

      const base: IglesiaMapaItem[] = resultado.data.map((ig) => ({
        ...ig,
        distanciaKm: coordenadas
          ? distanciaKm(coordenadas.lat, coordenadas.lng, ig.lat, ig.lng)
          : 0,
        horarios: [],
        proximaMisa: null,
        detallesCargados: false,
      }));

      setIglesias(base);

      if (coordenadas) enriquecerConDetalles(base, coordenadas);
    },
    [coordenadas, cargarCercanas, enriquecerConDetalles]
  );

  const onChangeQuery = useCallback(
    (texto: string) => {
      setQuery(texto);
      if (busquedaTimer.current) clearTimeout(busquedaTimer.current);
      busquedaTimer.current = setTimeout(() => buscarPorTexto(texto), 500);
    },
    [buscarPorTexto]
  );

  // ── Ubicación ─────────────────────────────────────────────────────────────

  const centrarEnUsuario = useCallback(async () => {
    if (coordenadas) {
      suprimirRegionHasta.current = Date.now() + 2000;
      cameraRef.current?.flyTo({ center: [coordenadas.lng, coordenadas.lat], duration: 600 });
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const coords: Coordenadas = {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
    };
    setCoordenadas(coords);
    cameraRef.current?.flyTo({ center: [coords.lng, coords.lat], duration: 600 });
    cargarCercanas(coords);
  }, [coordenadas, cargarCercanas]);

  // ── Efecto inicial ────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: Coordenadas = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      };
      setCoordenadas(coords);
      suprimirRegionHasta.current = Date.now() + 3000;
      cameraRef.current?.flyTo({ center: [coords.lng, coords.lat], duration: 600 });
      cargarCercanas(coords);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Región del mapa ───────────────────────────────────────────────────────

  const onRegionDidChange = useCallback((event: any) => {
    if (Date.now() < suprimirRegionHasta.current) return;

    // MapLibre RN v11: RegionPayload directo → event.visibleBounds
    // MapLibre RN v9:  GeoJSON Feature        → event.geometry.coordinates
    let lat: number | null = null;
    let lng: number | null = null;

    if (Array.isArray(event?.visibleBounds)) {
      const [[neLng, neLat], [swLng, swLat]] = event.visibleBounds as [[number, number], [number, number]];
      lat = (neLat + swLat) / 2;
      lng = (neLng + swLng) / 2;
    } else if (Array.isArray(event?.properties?.center)) {
      // onCameraChanged: state.properties.center = [lng, lat]
      [lng, lat] = event.properties.center as [number, number];
    } else if (Array.isArray(event?.geometry?.coordinates)) {
      [lng, lat] = event.geometry.coordinates as [number, number];
    }

    if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return;

    setMapCentro({ lat, lng });
    setMostrarBotonZona(true);
  }, []);

  // ── Buscar en zona visible ────────────────────────────────────────────────

  const buscarEnEstaZona = useCallback(async () => {
    let centro: Coordenadas | null = null;

    // Preferir getCenter() del mapa para obtener el centro real de la cámara
    try {
      if (mapRef.current) {
        const [lng, lat] = await mapRef.current.getCenter();
        if (isFinite(lat) && isFinite(lng)) centro = { lat, lng };
      }
    } catch { }

    if (!centro) centro = mapCentro ?? coordenadas;
    if (!centro) return;

    setMostrarBotonZona(false);
    setCargando(true);
    setError(null);
    setSeleccionadaId(null);

    const resultado = await searchChurchesMisasOrg(centro.lat, centro.lng);

    if (!resultado.ok) {
      setError(resultado.error);
      setCargando(false);
      return;
    }

    const origen = coordenadas ?? centro;
    const base: IglesiaMapaItem[] = resultado.data
      .filter((ig) => distanciaKm(centro.lat, centro.lng, ig.lat, ig.lng) <= RADIO_KM)
      .map((ig) => ({
        ...ig,
        distanciaKm: distanciaKm(origen.lat, origen.lng, ig.lat, ig.lng),
        proximaMisa: proximaMisaHoy(ig.horarios),
        detallesCargados: true,
      }))
      .sort((a, b) => a.distanciaKm - b.distanciaKm);

    setIglesias(base);
    setCargando(false);
    setCentroCirculo(centro);
    sheetRef.current?.snapToIndex(1);
    setMostrarBotonZona(true);
  }, [mapCentro, coordenadas]);

  // ── Selección de iglesia ──────────────────────────────────────────────────

  const seleccionarIglesia = useCallback(
    async (iglesia: IglesiaMapaItem) => {
      setSeleccionadaId(iglesia.id);
      suprimirRegionHasta.current = Date.now() + 2000;
      cameraRef.current?.flyTo({ center: [iglesia.lng, iglesia.lat], duration: 500 });
      sheetRef.current?.snapToIndex(1);

      if (!iglesia.detallesCargados) {
        const result = await getChurchDetails(iglesia.id, iglesia.lat, iglesia.lng, iglesia.nombre);
        setIglesias((prev) =>
          prev.map((ig) => {
            if (ig.id !== iglesia.id) return ig;
            if (result.ok && result.data.horarios.length > 0) {
              // Mezclar: conservar días de misas.org + añadir días que solo tiene buscarmisas.es
              const diasExistentes = new Set(ig.horarios.map((h) => h.dia));
              const horariosMezclados = [
                ...ig.horarios,
                ...result.data.horarios.filter((h) => !diasExistentes.has(h.dia)),
              ];
              return {
                ...ig,
                horarios: horariosMezclados,
                proximaMisa: proximaMisaHoy(horariosMezclados),
                detallesCargados: true,
              };
            }
            return { ...ig, detallesCargados: true };
          })
        );
      }
    },
    [] // iglesiasRef es un ref, no necesita estar en deps
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      {/* ── MAPA ── */}
      <MaplibreMap
        ref={mapRef}
        testID="map-view"
        style={{ flex: 1 }}
        mapStyle={DARK_MAP_STYLE}
        logo={false}
        onPress={() => {
          if (markerPresado.current) { markerPresado.current = false; return; }
          setSeleccionadaId(null);
        }}
        onRegionDidChange={onRegionDidChange}
        onRegionIsChanging={onRegionDidChange}
        onCameraChanged={onRegionDidChange}
      >
        <MaplibreCamera
          ref={cameraRef}
          initialViewState={{ center: MADRID, zoom: 13 }}
        />
        <MaplibreUserLocation />
        {iglesias.map((ig) => (
          <MaplibreMarker
            key={ig.id}
            id={ig.id.replace(":", "-")}
            lngLat={[ig.lng, ig.lat]}
            onPress={() => { markerPresado.current = true; seleccionarIglesia(ig); }}
          >
            <MarkerCruz seleccionado={seleccionadaId === ig.id} />
          </MaplibreMarker>
        ))}

        {centroCirculo && (
          <MaplibreGeoJSONSource
            id="circulo-busqueda"
            data={crearCirculoGeoJSON(centroCirculo.lat, centroCirculo.lng, RADIO_KM)}
          >
            <MaplibreLayer
              type="fill"
              id="circulo-fill"
              paint={{ "fill-color": "rgba(255,125,125,0.06)" }}
            />
            <MaplibreLayer
              type="line"
              id="circulo-borde"
              paint={{
                "line-color": "rgba(255,125,125,0.35)",
                "line-width": 1.5,
                "line-dasharray": [4, 4],
              }}
            />
          </MaplibreGeoJSONSource>
        )}
      </MaplibreMap>

      {/* ── BARRA SUPERIOR FLOTANTE ── */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          right: 16,
          gap: 10,
        }}
      >
        {/* SearchBar + botón filtros */}
        <View
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 6,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <SearchBar
            placeholder="Buscar iglesia o parroquia…"
            value={query}
            onChangeText={onChangeQuery}
            style={{ flex: 1 }}
          />
          {buscando && <ActivityIndicator size="small" color="#666666" />}
          <Pressable
            onPress={() => setMostrarFiltros((v) => !v)}
            hitSlop={8}
            android_ripple={null}
            style={({ pressed }) => ({
              opacity:         pressed ? 0.7 : 1,
              width:           40,
              height:          40,
              borderRadius:    12,
              backgroundColor: hayFiltrosActivos(filtros) ? "rgba(255,125,125,0.15)" : "#1A1A1A",
              borderWidth:     1,
              borderColor:     hayFiltrosActivos(filtros) ? ACCENT : "#2A2A2A",
              alignItems:      "center",
              justifyContent:  "center",
            })}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={hayFiltrosActivos(filtros) ? ACCENT : "#A0A0A0"}
            />
          </Pressable>
        </View>

        {/* Panel de filtros */}
        {mostrarFiltros && (
          <FiltrosPanel filtros={filtros} onChange={setFiltros} />
        )}

      </View>

      {/* ── BOTÓN: BUSCAR EN ESTA ZONA ── */}
      {mostrarBotonZona && (
        <View
          style={{
            position: "absolute",
            bottom: "35%",
            left: 0,
            right: 0,
            alignItems: "center",
          }}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={buscarEnEstaZona}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              paddingHorizontal: 20,
              paddingVertical: 11,
              borderRadius: 24,
              backgroundColor: "#1A1A1A",
              borderWidth: 1.5,
              borderColor: "#FF7D7D",
              shadowColor: "#FF7D7D",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 12,
            })}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 13,
                color: "#FFFFFF",
              }}
            >
              Buscar en esta zona
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── FAB: MI UBICACIÓN — posicionado sobre el sheet inicial (30%) ── */}
      <View style={{ position: "absolute", bottom: "33%", right: 16 }}>
        <FabUbicacion onPress={centrarEnUsuario} />
      </View>

      {/* ── BOTTOM SHEET ── */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={SNAP_POINTS}
        backgroundStyle={{
          backgroundColor: "#111111",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        handleIndicatorStyle={{ backgroundColor: "#444444" }}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        <BottomSheetFlatList
          ref={flatListRef}
          data={listaVisible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !cargando ? (
              <View className="items-center py-8">
                {error ? (
                  <Text className="text-sm font-inter text-center" style={{ color: "#888888" }}>
                    {error}
                  </Text>
                ) : (
                  <Text className="text-sm font-inter text-center" style={{ color: "#888888" }}>
                    No se encontraron iglesias{"\n"}para el filtro seleccionado.
                  </Text>
                )}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <IglesiaListCard
              iglesia={item}
              seleccionada={seleccionadaId === item.id}
              onPress={() => seleccionarIglesia(item)}
              onMasInfo={() =>
                router.push(
                  `/mapa/iglesia/${encodeURIComponent(item.id)}?lat=${item.lat}&lng=${item.lng}&nombre=${encodeURIComponent(item.nombre)}&direccion=${encodeURIComponent(item.direccion)}` as any
                )
              }
            />
          )}
        />
      </BottomSheet>
    </View>
  );
}
