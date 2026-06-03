import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonIglesia } from "./SkeletonCard";
import { formatearDistancia } from "@/lib/utils/distancia";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type IglesiaProxima = {
  id:             string;
  nombre:         string;
  direccion:      string;
  distanciaKm:    number;
  proximaMisa:    string | null;
};

type IglesiaCardProps = {
  cargando:        boolean;
  iglesia:         IglesiaProxima | null;
  error:           string | null;
  permisoDenegado: boolean;
};

// ─── Estado: sin permiso ──────────────────────────────────────────────────────

function SinPermiso() {
  return (
    <View
      style={{
        backgroundColor: "#111111",
        borderWidth:     1,
        borderColor:     "#2A2A2A",
        borderRadius:    16,
        padding:         16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Ionicons name="location-outline" size={14} color="#888888" />
        <Text
          style={{
            fontFamily:    "Inter_500Medium",
            fontSize:      10,
            color:         "#888888",
            textTransform: "uppercase",
            letterSpacing: 1.5,
          }}
        >
          Iglesias cercanas
        </Text>
      </View>
      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: "#C0C0C0", lineHeight: 22 }}>
        Activa la ubicación para ver la parroquia más próxima y sus horarios de misa.
      </Text>
    </View>
  );
}

// ─── Estado: error ────────────────────────────────────────────────────────────

function ErrorIglesia({ mensaje }: { mensaje: string }) {
  return (
    <View
      style={{
        backgroundColor: "#111111",
        borderWidth:     1,
        borderColor:     "#2A2A2A",
        borderRadius:    16,
        padding:         16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Ionicons name="location-outline" size={14} color="#888888" />
        <Text
          style={{
            fontFamily:    "Inter_500Medium",
            fontSize:      10,
            color:         "#888888",
            textTransform: "uppercase",
            letterSpacing: 1.5,
          }}
        >
          Iglesias cercanas
        </Text>
      </View>
      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: "#888888" }}>
        {mensaje}
      </Text>
    </View>
  );
}

// ─── Estado: cargado ──────────────────────────────────────────────────────────

function IglesiaInfo({ iglesia }: { iglesia: IglesiaProxima }) {
  return (
    <Pressable
      onPress={() => router.navigate("/(tabs)/mapa")}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <View
        style={{
          backgroundColor: "#111111",
          borderWidth:     1,
          borderColor:     "#2A2A2A",
          borderRadius:    16,
          padding:         16,
        }}
      >
        {/* Encabezado */}
        <View
          style={{
            flexDirection:  "row",
            alignItems:     "center",
            justifyContent: "space-between",
            marginBottom:   12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="location-outline" size={14} color="#888888" />
            <Text
              style={{
                fontFamily:    "Inter_500Medium",
                fontSize:      10,
                color:         "#888888",
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              Más cercana
            </Text>
          </View>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#888888" }}>
            {formatearDistancia(iglesia.distanciaKm)}
          </Text>
        </View>

        {/* Nombre */}
        <Text
          style={{
            fontFamily:   "CormorantGaramond_600SemiBold",
            fontSize:     20,
            color:        "#FFFFFF",
            lineHeight:   26,
            marginBottom: 4,
          }}
          numberOfLines={2}
        >
          {iglesia.nombre}
        </Text>

        {/* Dirección */}
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize:   12,
            color:      "#888888",
            marginBottom: 16,
          }}
          numberOfLines={1}
        >
          {iglesia.direccion}
        </Text>

        {/* Próxima misa */}
        <View style={{ borderTopWidth: 1, borderTopColor: "#2A2A2A", paddingTop: 12 }}>
          {iglesia.proximaMisa ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width:           6,
                  height:          6,
                  borderRadius:    3,
                  backgroundColor: "#FF7D7D",
                }}
              />
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: "#C0C0C0" }}>
                Próxima misa hoy a las{" "}
                <Text style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF" }}>
                  {iglesia.proximaMisa}
                </Text>
              </Text>
            </View>
          ) : (
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#888888" }}>
              Sin más misas hoy · horario estimado
            </Text>
          )}

          {/* CTA */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 }}>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 13, color: "#FF7D7D" }}>
              Ver en mapa
            </Text>
            <Ionicons name="arrow-forward" size={12} color="#FF7D7D" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function IglesiaCard({
  cargando,
  iglesia,
  error,
  permisoDenegado,
}: IglesiaCardProps) {
  if (permisoDenegado)   return <SinPermiso />;
  if (cargando)          return <SkeletonIglesia />;
  if (error || !iglesia) return <ErrorIglesia mensaje={error ?? "No se encontraron iglesias cercanas."} />;
  return <IglesiaInfo iglesia={iglesia} />;
}
