import React from "react";
import { View, Text } from "react-native";
import { isPrecept } from "@/constants/liturgical";

// Lunes = 0 … Domingo = 6  (orden europeo)
const DIA_ABREV = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

/** Devuelve los 7 días de la semana actual, empezando el lunes */
function getDiasSemana(hoy: Date): Date[] {
  const diaSemana = hoy.getDay(); // 0=Dom … 6=Sáb
  const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;

  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diffLunes);
  lunes.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return d;
  });
}

type DiaSemanaItemProps = {
  fecha:   Date;
  esHoy:   boolean;
  esPasado: boolean;
};

function DiaSemanaItem({ fecha, esHoy, esPasado }: DiaSemanaItemProps) {
  const esPrecepto = isPrecept(fecha);
  // Índice europeo: 0=Lun…6=Dom
  const idxEuropeo = fecha.getDay() === 0 ? 6 : fecha.getDay() - 1;
  const abrev      = DIA_ABREV[idxEuropeo];

  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      {/* Abreviatura del día */}
      <Text
        style={{
          fontFamily:    "Inter_500Medium",
          fontSize:      10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color:         esPasado ? "#555555" : "#888888",
        }}
      >
        {abrev}
      </Text>

      {/* Círculo del número */}
      <View
        style={{
          alignItems:    "center",
          justifyContent:"center",
          marginTop:     6,
          width:         36,
          height:        36,
          borderRadius:  18,
          backgroundColor: esHoy
            ? "#FF7D7D"
            : esPrecepto
              ? "rgba(255,125,125,0.12)"
              : "transparent",
          borderWidth:  esHoy ? 0 : esPrecepto ? 1 : 1,
          borderColor:  esHoy
            ? "transparent"
            : esPrecepto
              ? "rgba(255,125,125,0.45)"
              : "#444444",
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize:   14,
            color:      esHoy ? "#FFFFFF" : esPasado ? "#555555" : "#C0C0C0",
          }}
        >
          {fecha.getDate()}
        </Text>
      </View>

      {/* Punto de precepto debajo del número */}
      <View style={{ height: 6, marginTop: 3 }}>
        {esPrecepto && !esHoy && (
          <View
            style={{
              width:           4,
              height:          4,
              borderRadius:    2,
              backgroundColor: "#FF7D7D",
            }}
          />
        )}
      </View>
    </View>
  );
}

type EstaSemanaSectionProps = {
  hoy: Date;
};

export function EstaSemanaSection({ hoy }: EstaSemanaSectionProps) {
  const dias = getDiasSemana(hoy);

  return (
    <View>
      {/* Título de sección */}
      <View
        style={{
          borderLeftWidth: 2,
          borderLeftColor: "#FF7D7D",
          paddingLeft:     12,
          marginBottom:    14,
        }}
      >
        <Text className="text-2xl font-cormorant-semibold" style={{ color: "#FFFFFF" }}>
          Esta semana
        </Text>
      </View>

      {/* Lista horizontal de días */}
      <View
        style={{
          backgroundColor: "#111111",
          borderWidth:      1,
          borderColor:      "#2A2A2A",
          borderRadius:     16,
          padding:          16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {dias.map((fecha, i) => (
            <DiaSemanaItem
              key={i}
              fecha={fecha}
              esHoy={isSameDay(fecha, hoy)}
              esPasado={fecha < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())}
            />
          ))}
        </View>

        {/* Leyenda */}
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#2A2A2A" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width:           4,
                height:          4,
                borderRadius:    2,
                backgroundColor: "#FF7D7D",
              }}
            />
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 10, color: "#888888" }}>
              Día de precepto
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
