import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonCard } from "./SkeletonCard";
import { translateRefES, type LecturaDelDia } from "@/lib/api/biblia";

type LecturaCardProps = {
  cargando:     boolean;
  lectura:      LecturaDelDia | null;
  error:        string | null;
  cita:         string | null;
  citaCargando: boolean;
};

const COLOR_LITURGICO_MAP: Record<string, string> = {
  verde:  "#86EFAC",
  morado: "#C084FC",
  rojo:   "#FF7D7D",
  blanco: "#FFFFFF",
  rosa:   "#F9A8D4",
};

function ColorLiturgicoBadge({ color }: { color: string }) {
  const hex   = COLOR_LITURGICO_MAP[color.toLowerCase()] ?? "#A0A0A0";
  const label = color.charAt(0).toUpperCase() + color.slice(1);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: hex }} />
      <Text
        style={{
          fontFamily:    "Inter_500Medium",
          fontSize:      10,
          color:         "#888888",
          textTransform: "uppercase",
          letterSpacing: 1.5,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ErrorLectura({ mensaje, onRetry }: { mensaje: string; onRetry?: () => void }) {
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
      <Text
        style={{
          fontFamily:    "Inter_500Medium",
          fontSize:      10,
          color:         "#888888",
          textTransform: "uppercase",
          letterSpacing: 1.5,
          marginBottom:  8,
        }}
      >
        Lectura del día
      </Text>
      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: "#888888" }}>
        {mensaje}
      </Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={{ marginTop: 12 }}>
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: "#FF7D7D" }}>
            Reintentar
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function LecturaCard({
  cargando,
  lectura,
  error,
  cita,
  citaCargando,
}: LecturaCardProps) {
  if (cargando) return <SkeletonCard />;
  if (error || !lectura) {
    return <ErrorLectura mensaje={error ?? "No se pudo cargar la lectura del día."} />;
  }

  const extracto =
    lectura.texto.length > 180
      ? lectura.texto.slice(0, 180).trimEnd() + "…"
      : lectura.texto;

  return (
    <Pressable
      onPress={() => router.navigate("/(tabs)/lectura")}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
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
        {/* Encabezado: etiqueta + color litúrgico */}
        <View
          style={{
            flexDirection:  "row",
            alignItems:     "center",
            justifyContent: "space-between",
            marginBottom:   12,
          }}
        >
          <Text
            style={{
              fontFamily:    "Inter_500Medium",
              fontSize:      10,
              color:         "#888888",
              textTransform: "uppercase",
              letterSpacing: 1.5,
            }}
          >
            Lectura del día
          </Text>
          <ColorLiturgicoBadge color={lectura.colorLiturgico} />
        </View>

        {/* Título del día litúrgico */}
        <Text
          style={{
            fontFamily:   "CormorantGaramond_600SemiBold",
            fontSize:     20,
            color:        "#FFFFFF",
            lineHeight:   26,
            marginBottom: 4,
          }}
        >
          {lectura.titulo}
        </Text>

        {/* Referencia bíblica */}
        <Text
          style={{
            fontFamily:    "Inter_500Medium",
            fontSize:      12,
            color:         "#FF7D7D",
            letterSpacing: 0.5,
            marginBottom:  12,
          }}
        >
          {translateRefES(lectura.referencia)}
        </Text>

        {/* Extracto del evangelio */}
        <Text
          style={{
            fontFamily:   "CormorantGaramond_400Regular_Italic",
            fontSize:     16,
            color:        "#C0C0C0",
            lineHeight:   26,
            marginBottom: 20,
          }}
        >
          «{extracto}»
        </Text>

        {/* Cita / divider */}
        <View style={{ borderTopWidth: 1, borderTopColor: "#2A2A2A", paddingTop: 16 }}>
          {citaCargando ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color="#888888" />
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#888888" }}>
                Meditando el texto…
              </Text>
            </View>
          ) : cita ? (
            <Text
              style={{
                fontFamily: "CormorantGaramond_400Regular_Italic",
                fontSize:   14,
                color:      "#C0C0C0",
                lineHeight: 22,
              }}
            >
              {cita}
            </Text>
          ) : null}
        </View>

        {/* CTA */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 16 }}>
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize:   13,
              lineHeight: 13,
              color:      "#FF7D7D",
            }}
          >
            Leer y reflexionar
          </Text>
          <Ionicons name="arrow-forward" size={12} color="#FF7D7D" />
        </View>
      </View>
    </Pressable>
  );
}
