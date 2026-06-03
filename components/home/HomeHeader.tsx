import React from "react";
import { View, Text } from "react-native";
import {
  calcularTiempoLiturgico,
  NOMBRE_TIEMPO_LITURGICO,
} from "@/constants/liturgical";

type HomeHeaderProps = {
  fecha: Date;
};

function formatearFechaLiturgica(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
  }).formatToParts(fecha);

  const get = (type: string) =>
    partes.find((p) => p.type === type)?.value ?? "";

  const diaSemana = get("weekday");
  const dia       = get("day");
  const mes       = get("month");

  // Primera letra del día en mayúscula, resto de la cadena en minúscula
  const diaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

  const tiempoLiturgico = calcularTiempoLiturgico(fecha);
  const nombreTiempo    = NOMBRE_TIEMPO_LITURGICO[tiempoLiturgico];

  return `${diaCap}, ${dia} de ${mes} · ${nombreTiempo}`;
}

export function HomeHeader({ fecha }: HomeHeaderProps) {
  const fechaLiturgica = formatearFechaLiturgica(fecha);

  return (
    <View className="pt-2 pb-6">
      {/* Nombre de la app */}
      <Text
        className="text-6xl font-cormorant-light-italic tracking-widest"
        style={{ letterSpacing: 8, color: "#FFFFFF" }}
      >
        FIDES
      </Text>

      {/* Fecha litúrgica */}
      <Text className="text-xs font-inter-medium tracking-widest uppercase mt-1" style={{ color: "#888888" }}>
        {fechaLiturgica}
      </Text>
    </View>
  );
}
