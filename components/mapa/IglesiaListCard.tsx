import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatearDistancia } from "@/lib/utils/distancia";
import type { HorarioMisa } from "@/lib/db/schema";
import { HorarioSemana } from "./HorarioSemana";

export type IglesiaMapaItem = {
  id:              string;
  nombre:          string;
  direccion:       string;
  lat:             number;
  lng:             number;
  distanciaKm:     number;
  horarios:        HorarioMisa[];
  proximaMisa:     string | null;
  detallesCargados: boolean;
};

type IglesiaListCardProps = {
  iglesia:      IglesiaMapaItem;
  seleccionada: boolean;
  onPress:      () => void;
  onMasInfo?:   () => void;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS_SEMANA = [
  "Domingo", "Lunes", "Martes", "Miércoles",
  "Jueves", "Viernes", "Sábado",
] as const;

// ─── Horario hoy (vista compacta) ────────────────────────────────────────────

function getHorariosHoy(horarios: HorarioMisa[]): string[] {
  const hoy = DIAS_SEMANA[new Date().getDay()];
  return [...new Set(horarios.filter((h) => h.dia === hoy).flatMap((h) => h.horas))].sort();
}

// ─── Chips de horas (vista compacta de hoy) ──────────────────────────────────

function HorasHoy({
  horas,
  proximaMisa,
}: {
  horas:       string[];
  proximaMisa: string | null;
}) {
  const minutosYa = new Date().getHours() * 60 + new Date().getMinutes();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {horas.map((hora) => {
        const [h, m] = hora.split(":").map(Number);
        const misaMins  = h * 60 + m;
        const esProxima = proximaMisa === hora && misaMins > minutosYa;
        const esPasada  = misaMins <= minutosYa;

        return (
          <View
            key={hora}
            style={{
              paddingHorizontal: 8,
              paddingVertical:   3,
              borderRadius:      6,
              backgroundColor:   esProxima ? "rgba(255,125,125,0.15)" : "transparent",
              borderWidth:       1,
              borderColor:       esProxima ? "rgba(255,125,125,0.4)" : "#2A2A2A",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize:   11,
                color:      esProxima ? "#FF7D7D" : esPasada ? "#444444" : "#A0A0A0",
              }}
            >
              {hora}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function IglesiaListCard({
  iglesia,
  seleccionada,
  onPress,
  onMasInfo,
}: IglesiaListCardProps) {
  const horasHoy = getHorariosHoy(iglesia.horarios);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <View
        style={{
          backgroundColor: seleccionada ? "#1A1A1A" : "#111111",
          borderWidth:     1,
          borderColor:     seleccionada ? "#FF7D7D" : "#2A2A2A",
          borderRadius:    14,
          padding:         14,
          marginBottom:    10,
        }}
      >
        {/* Encabezado */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <Text
            style={{ color: "#FFFFFF", fontFamily: "Cormorant_600SemiBold", fontSize: 16, lineHeight: 20, flex: 1, marginRight: 12 }}
            numberOfLines={seleccionada ? undefined : 2}
          >
            {iglesia.nombre}
          </Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: "#888888" }}>
            {formatearDistancia(iglesia.distanciaKm)}
          </Text>
        </View>

        {/* Dirección */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <Ionicons
            name="location-outline"
            size={11}
            color={seleccionada ? "#FF7D7D" : "#555555"}
          />
          <Text
            style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: "#888888", flex: 1 }}
            numberOfLines={1}
          >
            {iglesia.direccion}
          </Text>
        </View>

        {/* Contenido según estado */}
        {seleccionada && iglesia.detallesCargados ? (
          // Vista ampliada: horario semanal completo
          <>
            <HorarioSemana horarios={iglesia.horarios} />
            {onMasInfo && (
              <Pressable
                onPress={onMasInfo}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginTop: 14, alignItems: "flex-end" })}
              >
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#FF7D7D" }}>
                  Más información →
                </Text>
              </Pressable>
            )}
          </>
        ) : seleccionada && !iglesia.detallesCargados ? (
          // Cargando detalles
          <View
            style={{
              marginTop:      12,
              paddingTop:     12,
              borderTopWidth: 1,
              borderTopColor: "#2A2A2A",
              alignItems:     "center",
            }}
          >
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: "#555555" }}>
              Cargando horario…
            </Text>
          </View>
        ) : horasHoy.length > 0 ? (
          // Vista compacta: misas de hoy
          <View style={{ borderTopWidth: 1, borderTopColor: "#2A2A2A", paddingTop: 8 }}>
            <HorasHoy horas={horasHoy} proximaMisa={iglesia.proximaMisa} />
          </View>
        ) : iglesia.detallesCargados ? (
          <Text
            style={{
              fontFamily:     "Inter_400Regular",
              fontSize:       11,
              color:          "#888888",
              borderTopWidth: 1,
              borderTopColor: "#2A2A2A",
              paddingTop:     8,
              marginTop:      4,
            }}
          >
            Sin misas hoy · horario estimado
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
