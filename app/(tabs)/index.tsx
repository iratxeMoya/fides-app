import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";

import { getLecturaDelDia }      from "@/lib/api/biblia";
import { searchChurchesMisasOrg } from "@/lib/api/iglesias";
import { generarCitaInspiradora } from "@/lib/api/cita";
import { distanciaKm, proximaMisaHoy } from "@/lib/utils/distancia";
import {
  isPrecept,
  getThisWeekPrecepts,
  type DiaPrecepto,
} from "@/constants/liturgical";
import type { LecturaDelDia } from "@/lib/api/biblia";
import type { IglesiaProxima } from "@/components/home/IglesiaCard";

import { HomeHeader }        from "@/components/home/HomeHeader";
import { PreceptoCard }      from "@/components/home/PreceptoCard";
import { IglesiaCard }       from "@/components/home/IglesiaCard";
import { LecturaCard }       from "@/components/home/LecturaCard";
import { EstaSemanaSection } from "@/components/home/EstaSemanaSection";

// ─── Constantes ───────────────────────────────────────────────────────────────

const N_SECCIONES = 5;
const STAGGER_MS  = 130;
const FADE_MS     = 480;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function getLunesDeLaSemana(date: Date): Date {
  const d       = new Date(date);
  const diaSem  = d.getDay(); // 0=Dom … 6=Sáb
  const diff    = diaSem === 0 ? -6 : 1 - diaSem;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Componente de sección animada ────────────────────────────────────────────

function SeccionAnimada({
  children,
  anim,
}: {
  children: React.ReactNode;
  anim: Animated.Value;
}) {
  return (
    <Animated.View
      style={{
        opacity:   anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange:  [0, 1],
              outputRange: [22, 0],
            }),
          },
        ],
        marginBottom: 12,
      }}
    >
      {children}
    </Animated.View>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const hoy = useMemo(() => new Date(), []);

  // ── Animaciones en cascada ────────────────────────────────────────────────
  const anims = useRef(
    Array.from({ length: N_SECCIONES }, () => new Animated.Value(0))
  ).current;

  const iniciarAnimaciones = useCallback(() => {
    anims.forEach((v) => v.setValue(0));
    Animated.stagger(
      STAGGER_MS,
      anims.map((v) =>
        Animated.timing(v, {
          toValue:         1,
          duration:        FADE_MS,
          easing:          Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [anims]);

  // ── Estado: ubicación ─────────────────────────────────────────────────────
  type PermisoState = "checking" | "granted" | "denied";
  const [permiso, setPermiso]       = useState<PermisoState>("checking");
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(null);

  // ── Estado: iglesia ───────────────────────────────────────────────────────
  const [iglesiasCargando, setIglesiasCargando] = useState(false);
  const [iglesiaProxima, setIglesiaProxima]     = useState<IglesiaProxima | null>(null);
  const [iglesiaError, setIglesiaError]         = useState<string | null>(null);

  // ── Estado: lectura ───────────────────────────────────────────────────────
  const [lecturaCargando, setLecturaCargando] = useState(true);
  const [lecturaDelDia, setLecturaDelDia]     = useState<LecturaDelDia | null>(null);
  const [lecturaError, setLecturaError]       = useState<string | null>(null);

  // ── Estado: cita inspiradora ──────────────────────────────────────────────
  const [citaCargando, setCitaCargando] = useState(false);
  const [cita, setCita]                 = useState<string | null>(null);

  // ── Precetos ──────────────────────────────────────────────────────────────
  const { preceptoHoy, preceptosSemana } = useMemo(() => {
    const lunes    = getLunesDeLaSemana(hoy);
    const semana   = getThisWeekPrecepts(lunes);
    const hoyP     = semana.find((p) => isSameDay(p.date, hoy)) ?? null;
    const futuros  = semana.filter((p) => !isSameDay(p.date, hoy));
    return { preceptoHoy: hoyP, preceptosSemana: futuros };
  }, [hoy]);

  const mostrarCardPrecepto =
    preceptoHoy !== null || preceptosSemana.length > 0;

  // ── refreshing ────────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetches ───────────────────────────────────────────────────────────────

  const cargarLectura = useCallback(async () => {
    setLecturaCargando(true);
    setLecturaError(null);

    const resultado = await getLecturaDelDia(hoy);

    if (resultado.ok) {
      setLecturaDelDia(resultado.data);
    } else {
      setLecturaError(resultado.error);
    }
    setLecturaCargando(false);
  }, [hoy]);

  const cargarCita = useCallback(async (texto: string) => {
    setCitaCargando(true);
    const resultado = await generarCitaInspiradora(texto, hoy);
    if (resultado.ok) setCita(resultado.data.texto);
    setCitaCargando(false);
  }, [hoy]);

  const cargarIglesiasNearby = useCallback(
    async (lat: number, lng: number) => {
      setIglesiasCargando(true);
      setIglesiaError(null);

      // Misma fuente que el mapa: misas.org ya incluye horarios reales
      const resultado = await searchChurchesMisasOrg(lat, lng);

      if (!resultado.ok) {
        setIglesiaError(resultado.error);
        setIglesiasCargando(false);
        return;
      }

      const iglesias = resultado.data;
      if (iglesias.length === 0) {
        setIglesiaError("No se encontraron iglesias en un radio de 5 km.");
        setIglesiasCargando(false);
        return;
      }

      // Ordenar por distancia y tomar la más cercana con horarios
      const conDistancia = iglesias
        .map((ig) => ({ ...ig, distanciaKm: distanciaKm(lat, lng, ig.lat, ig.lng) }))
        .sort((a, b) => a.distanciaKm - b.distanciaKm);

      const masProxima = conDistancia[0];

      setIglesiaProxima({
        id:          masProxima.id,
        nombre:      masProxima.nombre,
        direccion:   masProxima.direccion,
        distanciaKm: masProxima.distanciaKm,
        proximaMisa: proximaMisaHoy(masProxima.horarios),
      });

      setIglesiasCargando(false);
    },
    []
  );

  const solicitarUbicacion = useCallback(async () => {
    setPermiso("checking");

    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      setPermiso("denied");
      return;
    }

    setPermiso("granted");

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = loc.coords;
      setCoordenadas({ lat, lng });
      await cargarIglesiasNearby(lat, lng);
    } catch {
      setIglesiaError("No se pudo obtener la ubicación actual.");
      setIglesiasCargando(false);
    }
  }, [cargarIglesiasNearby]);

  // ── Efectos iniciales ─────────────────────────────────────────────────────

  useEffect(() => {
    iniciarAnimaciones();
    cargarLectura();
    solicitarUbicacion();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Generar cita cuando la lectura esté lista
  useEffect(() => {
    if (lecturaDelDia?.texto) {
      cargarCita(lecturaDelDia.texto);
    }
  }, [lecturaDelDia, cargarCita]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCita(null);

    await Promise.all([
      cargarLectura(),
      coordenadas
        ? cargarIglesiasNearby(coordenadas.lat, coordenadas.lng)
        : solicitarUbicacion(),
    ]);

    iniciarAnimaciones();
    setRefreshing(false);
  }, [
    cargarLectura,
    cargarIglesiasNearby,
    solicitarUbicacion,
    coordenadas,
    iniciarAnimaciones,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#0A0A0A" }}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#666666"
            colors={["#666666"]}
          />
        }
      >
        {/* ── 0. HEADER ── */}
        <SeccionAnimada anim={anims[0]}>
          <HomeHeader fecha={hoy} />
        </SeccionAnimada>

        {/* ── 1. SECCIÓN "ESTA SEMANA" ── */}
        <SeccionAnimada anim={anims[1]}>
          <EstaSemanaSection hoy={hoy} />
        </SeccionAnimada>

        {/* ── 2. CARD PRECEPTO (condicional) ── */}
        {mostrarCardPrecepto && (
          <SeccionAnimada anim={anims[2]}>
            <PreceptoCard
              preceptoHoy={preceptoHoy}
              preceptosSemana={preceptosSemana}
            />
          </SeccionAnimada>
        )}

        {/* ── 3. CARD IGLESIA MÁS CERCANA ── */}
        <SeccionAnimada anim={anims[3]}>
          <IglesiaCard
            cargando={iglesiasCargando}
            iglesia={iglesiaProxima}
            error={iglesiaError}
            permisoDenegado={permiso === "denied"}
          />
        </SeccionAnimada>

        {/* ── 4. CARD LECTURA DEL DÍA ── */}
        <SeccionAnimada anim={anims[4]}>
          <LecturaCard
            cargando={lecturaCargando}
            lectura={lecturaDelDia}
            error={lecturaError}
            cita={cita}
            citaCargando={citaCargando}
          />
        </SeccionAnimada>
      </ScrollView>
    </SafeAreaView>
  );
}
