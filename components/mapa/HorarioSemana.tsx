import React from "react";
import { View, Text } from "react-native";
import type { HorarioMisa } from "@/lib/db/schema";

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS_SEMANA = [
  "Domingo", "Lunes", "Martes", "Miércoles",
  "Jueves", "Viernes", "Sábado",
] as const;

export const ORDEN_DIAS: typeof DIAS_SEMANA[number][] = [
  "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
];

const ABREV: Record<string, string> = {
  Lunes: "Lun", Martes: "Mar", Miércoles: "Mié",
  Jueves: "Jue", Viernes: "Vie", Sábado: "Sáb", Domingo: "Dom",
};

// ─── HorarioSemana ────────────────────────────────────────────────────────────

export function HorarioSemana({ horarios }: { horarios: HorarioMisa[] }) {
  const ahora      = new Date();
  const minutosYa  = ahora.getHours() * 60 + ahora.getMinutes();
  const hoyNombre  = DIAS_SEMANA[ahora.getDay()];

  return (
    <View
      style={{
        marginTop:       12,
        paddingTop:      12,
        borderTopWidth:  1,
        borderTopColor:  "#2A2A2A",
      }}
    >
      <Text
        style={{
          fontFamily:    "Inter_500Medium",
          fontSize:      9,
          color:         "#555555",
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginBottom:  10,
        }}
      >
        Horario semanal
      </Text>

      {ORDEN_DIAS.map((dia) => {
        const horas = [
          ...new Set(
            horarios.filter((h) => h.dia === dia).flatMap((h) => h.horas),
          ),
        ].sort();
        const esHoy = dia === hoyNombre;

        return (
          <View
            key={dia}
            style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 7 }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize:   11,
                width:      36,
                marginTop:  1,
                color:      esHoy ? "#FF7D7D" : "#555555",
              }}
            >
              {ABREV[dia]}
            </Text>

            {horas.length > 0 ? (
              <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {horas.map((hora) => {
                  const [h, m]   = hora.split(":").map(Number);
                  const misaMins = h * 60 + m;
                  const esPasada = esHoy && misaMins <= minutosYa;

                  return (
                    <Text
                      key={hora}
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize:   11,
                        color:      esPasada ? "#3A3A3A" : esHoy ? "#C0C0C0" : "#777777",
                      }}
                    >
                      {hora}
                    </Text>
                  );
                })}
              </View>
            ) : (
              <Text
                style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: "#333333" }}
              >
                —
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
