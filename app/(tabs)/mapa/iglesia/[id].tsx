import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Map as MaplibreMap,
  Camera as MaplibreCamera,
  Marker as MaplibreMarker,
} from "@maplibre/maplibre-react-native";

import { getChurchDetails, type IglesiaDetalle } from "@/lib/api/iglesias";
import { HorarioSemana } from "@/components/mapa/HorarioSemana";
import type { HorarioMisa } from "@/lib/db/schema";

// ─── Constantes ───────────────────────────────────────────────────────────────

const ACCENT         = "#FF7D7D";
const DARK_MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatearOpeningHours(raw: string): string {
  return raw
    .replace(/\bMo\b/g, "Lun").replace(/\bTu\b/g, "Mar").replace(/\bWe\b/g, "Mié")
    .replace(/\bTh\b/g, "Jue").replace(/\bFr\b/g, "Vie").replace(/\bSa\b/g, "Sáb")
    .replace(/\bSu\b/g, "Dom").replace(/\bPH\b/g, "Festivos").replace(/\boff\b/gi, "cerrado")
    .split(";").map((s) => s.trim()).join("\n");
}

function serializarHorarios(horarios: HorarioMisa[]): string {
  const ORDEN = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  return ORDEN
    .map((dia) => {
      const horas = [
        ...new Set(horarios.filter((h) => h.dia === dia).flatMap((h) => h.horas)),
      ].sort();
      return horas.length > 0 ? `${dia}: ${horas.join(", ")}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

// ─── FilaContacto ─────────────────────────────────────────────────────────────

function FilaContacto({
  icono,
  texto,
  onPress,
}: {
  icono:   React.ComponentProps<typeof Ionicons>["name"];
  texto:   string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity:         pressed ? 0.7 : 1,
        flexDirection:   "row",
        alignItems:      "center",
        gap:             10,
        paddingVertical: 10,
      })}
      android_ripple={null}
    >
      <Ionicons name={icono} size={16} color={ACCENT} />
      <Text
        style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#CCCCCC", flex: 1 }}
        numberOfLines={1}
      >
        {texto}
      </Text>
      <Ionicons name="chevron-forward" size={14} color="#444444" />
    </Pressable>
  );
}

// ─── IglesiaDetalleScreen ─────────────────────────────────────────────────────

export default function IglesiaDetalleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id:        string;
    lat:       string;
    lng:       string;
    nombre:    string;
    direccion: string;
  }>();

  const id        = Array.isArray(params.id)        ? params.id[0]        : (params.id        ?? "");
  const lat       = parseFloat(Array.isArray(params.lat) ? params.lat[0] : (params.lat ?? "0"));
  const lng       = parseFloat(Array.isArray(params.lng) ? params.lng[0] : (params.lng ?? "0"));
  const nombre    = Array.isArray(params.nombre)    ? params.nombre[0]    : (params.nombre    ?? "Iglesia");
  const direccion = Array.isArray(params.direccion) ? params.direccion[0] : (params.direccion ?? "");

  const [cargando, setCargando] = useState(true);
  const [detalle,  setDetalle]  = useState<IglesiaDetalle | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const res = await getChurchDetails(id, lat, lng, nombre);
    if (res.ok) setDetalle(res.data);
    else        setError(res.error);
    setCargando(false);
  }, [id, lat, lng, nombre]);

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const abrirReporte = () => {
    const asunto     = encodeURIComponent(`Horario incorrecto: ${nombre}`);
    const horarioTxt = detalle ? serializarHorarios(detalle.horarios) : "Sin datos";
    const cuerpo     = encodeURIComponent(
      `Iglesia: ${nombre}\nDirección: ${detalle?.direccion ?? direccion}\nID: ${id}\n\nHorario actual:\n${horarioTxt}`,
    );
    Linking.openURL(`mailto:iratxe.moya@gmail.com?subject=${asunto}&body=${cuerpo}`);
  };

  const tieneImagen = !!detalle?.image && !imgError;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0A" }} edges={["top"]}>

      {/* ── Header ── */}
      <View
        style={{
          flexDirection:     "row",
          alignItems:        "center",
          paddingHorizontal: 16,
          paddingVertical:   12,
          borderBottomWidth: 1,
          borderBottomColor: "#1A1A1A",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          android_ripple={null}
        >
          <Ionicons name="chevron-back" size={18} color={ACCENT} />
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: ACCENT }}>
            Mapa
          </Text>
        </Pressable>
      </View>

      {/* ── Contenido ── */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Foto o mini-mapa */}
        {tieneImagen ? (
          <Image
            source={{ uri: detalle!.image }}
            style={{ width: "100%", height: 200 }}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={{ height: 200, overflow: "hidden" }} pointerEvents="none">
            <MaplibreMap
              style={{ flex: 1 }}
              mapStyle={DARK_MAP_STYLE}
              logo={false}
            >
              <MaplibreCamera
                initialViewState={{ center: [lng, lat], zoom: 16 }}
              />
              <MaplibreMarker id="church-pin" lngLat={[lng, lat]}>
                <View
                  style={{
                    width:           14,
                    height:          14,
                    borderRadius:    7,
                    backgroundColor: ACCENT,
                    borderWidth:     2,
                    borderColor:     "#FFFFFF",
                  }}
                />
              </MaplibreMarker>
            </MaplibreMap>
          </View>
        )}

        {/* Bloque info */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 }}>
          <Text
            style={{
              fontFamily:   "Cormorant_600SemiBold",
              fontSize:     24,
              color:        "#FFFFFF",
              marginBottom: 6,
            }}
          >
            {detalle?.nombre ?? nombre}
          </Text>

          {(detalle?.direccion ?? direccion) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons name="location-outline" size={13} color={ACCENT} />
              <Text
                style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#888888", flex: 1 }}
              >
                {detalle?.direccion ?? direccion}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Separador */}
        <View
          style={{ height: 1, backgroundColor: "#1A1A1A", marginHorizontal: 20, marginVertical: 20 }}
        />

        {/* Horario de misas */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text
            style={{
              fontFamily:    "Inter_500Medium",
              fontSize:      10,
              color:         ACCENT,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom:  4,
            }}
          >
            Horario de misas
          </Text>

          {cargando ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#555555" }}>
                Cargando…
              </Text>
            </View>
          ) : error ? (
            <View style={{ paddingVertical: 12 }}>
              <Text
                style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: ACCENT, marginBottom: 12 }}
              >
                No se pudo cargar el horario.
              </Text>
              <Pressable
                onPress={cargar}
                style={({ pressed }) => ({
                  opacity:           pressed ? 0.7 : 1,
                  alignSelf:         "flex-start",
                  paddingVertical:   6,
                  paddingHorizontal: 14,
                  borderRadius:      8,
                  borderWidth:       1,
                  borderColor:       "#333333",
                })}
                android_ripple={null}
              >
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: "#AAAAAA" }}>
                  Reintentar
                </Text>
              </Pressable>
            </View>
          ) : detalle && detalle.horarios.length > 0 ? (
            <HorarioSemana horarios={detalle.horarios} />
          ) : (
            <Text
              style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#555555", paddingTop: 12 }}
            >
              Sin horario disponible
            </Text>
          )}
        </View>

        {/* Horario de apertura */}
        {!cargando && detalle && (
          <>
            <View
              style={{ height: 1, backgroundColor: "#1A1A1A", marginHorizontal: 20, marginVertical: 20 }}
            />
            <View style={{ paddingHorizontal: 20 }}>
              <Text
                style={{
                  fontFamily:    "Inter_500Medium",
                  fontSize:      10,
                  color:         ACCENT,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom:  4,
                }}
              >
                Horario de apertura
              </Text>
              {detalle.openingHours ? (
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#CCCCCC", lineHeight: 22 }}>
                  {formatearOpeningHours(detalle.openingHours)}
                </Text>
              ) : (
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#555555" }}>
                  No disponemos de esta información
                </Text>
              )}
            </View>
          </>
        )}

        {/* Contacto */}
        {!cargando && detalle && (detalle.telefono || detalle.web) && (
          <>
            <View
              style={{ height: 1, backgroundColor: "#1A1A1A", marginHorizontal: 20, marginVertical: 20 }}
            />
            <View style={{ paddingHorizontal: 20 }}>
              <Text
                style={{
                  fontFamily:    "Inter_500Medium",
                  fontSize:      10,
                  color:         "#666666",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom:  4,
                }}
              >
                Contacto
              </Text>

              {detalle.telefono && (
                <FilaContacto
                  icono="call-outline"
                  texto={detalle.telefono}
                  onPress={() => Linking.openURL(`tel:${detalle.telefono}`)}
                />
              )}
              {detalle.web && (
                <FilaContacto
                  icono="globe-outline"
                  texto={detalle.web.replace(/^https?:\/\//, "")}
                  onPress={() => Linking.openURL(detalle.web!)}
                />
              )}
            </View>
          </>
        )}

      </ScrollView>

      {/* ── Botón fijo al bottom (encima de la tab bar) ── */}
      <View
        style={{
          borderTopWidth:  1,
          borderTopColor:  "#1A1A1A",
          paddingVertical: 14,
          alignItems:      "center",
          backgroundColor: "#0A0A0A",
        }}
      >
        <Pressable
          onPress={abrirReporte}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          android_ripple={null}
        >
          <Text
            style={{
              fontFamily:         "Inter_400Regular",
              fontSize:           12,
              color:              "#555555",
              textDecorationLine: "underline",
            }}
          >
            ¿Horario incorrecto? Repórtalo
          </Text>
        </Pressable>
      </View>

    </SafeAreaView>
  );
}
