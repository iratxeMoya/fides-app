import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { DiaPrecepto } from "@/constants/liturgical";

type PreceptoCardProps = {
  preceptoHoy:     DiaPrecepto | null;
  preceptosSemana: DiaPrecepto[];
};

function formatearFechaCorta(date: Date): string {
  const dia      = date.getDate();
  const mesAbrev = new Intl.DateTimeFormat("es-ES", { month: "short" }).format(date);
  return `${dia} de ${mesAbrev}.`;
}

export function PreceptoCard({ preceptoHoy, preceptosSemana }: PreceptoCardProps) {
  if (!preceptoHoy && preceptosSemana.length === 0) return null;

  return (
    <View
      style={{
        backgroundColor: "#111111",
        borderWidth:      1,
        borderColor:      "#2A2A2A",
        borderLeftWidth:  3,
        borderLeftColor:  "#FF7D7D",
        borderRadius:     16,
        padding:          16,
      }}
    >
      {/* Encabezado */}
      <View
        style={{
          flexDirection:  "row",
          alignItems:     "center",
          gap:            8,
          marginBottom:   12,
        }}
      >
        <Ionicons name="alert-circle-outline" size={14} color="#FF7D7D" />
        <Text
          style={{
            fontFamily:    "Inter_500Medium",
            fontSize:      10,
            color:         "#FF7D7D",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            flex:          1,
          }}
        >
          Día de precepto
        </Text>
      </View>

      {/* Precepto de hoy */}
      {preceptoHoy && (
        <View style={{ marginBottom: preceptosSemana.length > 0 ? 16 : 0 }}>
          <Text
            style={{
              fontFamily:   "CormorantGaramond_600SemiBold",
              fontSize:     20,
              color:        "#FFFFFF",
              lineHeight:   26,
              marginBottom: 4,
            }}
          >
            {preceptoHoy.name}
          </Text>
          <Text
            style={{
              fontFamily:    "Inter_500Medium",
              fontSize:      11,
              color:         "#FF7D7D",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Hoy — obligación de asistir a misa
          </Text>
        </View>
      )}

      {/* Próximos preceptos */}
      {preceptosSemana.length > 0 && (
        <View
          style={
            preceptoHoy
              ? { borderTopWidth: 1, borderTopColor: "#2A2A2A", paddingTop: 12 }
              : {}
          }
        >
          {preceptosSemana.map((p, i) => (
            <View
              key={i}
              style={{
                flexDirection:  "row",
                alignItems:     "baseline",
                justifyContent: "space-between",
                marginBottom:   i < preceptosSemana.length - 1 ? 8 : 0,
              }}
            >
              <Text
                style={{
                  fontFamily: "CormorantGaramond_600SemiBold",
                  fontSize:   18,
                  color:      "#FFFFFF",
                  lineHeight: 24,
                  flex:       1,
                  marginRight: 12,
                }}
              >
                {p.name}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize:   12,
                  color:      "#888888",
                }}
              >
                {formatearFechaCorta(p.date)}
              </Text>
            </View>
          ))}

          {!preceptoHoy && (
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize:   12,
                color:      "#666666",
                marginTop:  10,
              }}
            >
              Esta semana · prepárate con tiempo
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
