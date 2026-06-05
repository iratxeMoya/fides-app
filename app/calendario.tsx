import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  calcularTiempoLiturgico,
  getDiasPreceptoDelAnio,
  type TiempoLiturgico,
} from "@/constants/liturgical";

// ─── Constantes visuales ──────────────────────────────────────────────────────

const ACCENT = "#FF7D7D";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIA_COLS = ["L", "M", "X", "J", "V", "S", "D"] as const;

// Fondo oscuro teñido por tiempo litúrgico — distinguible en OLED/pantalla oscura
const BG_LITURGICO: Record<TiempoLiturgico, string> = {
  tiempo_ordinario: "#1A2E1A",
  adviento:         "#261A33",
  cuaresma:         "#261A33",
  navidad:          "#2E2514",
  pascua:           "#2E2514",
  semana_santa:     "#2E1414",
  pentecostes:      "#2E1414",
};

// Color del punto en la leyenda — versión más saturada del mismo tono
const DOT_LITURGICO: Record<TiempoLiturgico, string> = {
  tiempo_ordinario: "#4A7C4A",
  adviento:         "#7040A0",
  cuaresma:         "#7040A0",
  navidad:          "#9A8030",
  pascua:           "#9A8030",
  semana_santa:     "#9A3030",
  pentecostes:      "#9A3030",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );

}

/** Genera la cuadrícula del mes: filas de 7 días (Lun–Dom), null = hueco */
function buildMes(anio: number, mes: number): (Date | null)[][] {
  const primerDia = new Date(anio, mes - 1, 1);
  const diasEnMes = new Date(anio, mes, 0).getDate();
  // Índice europeo del primer día (0=Lun…6=Dom)
  const offsetLunes = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1;

  const semanas: (Date | null)[][] = [];
  let semana: (Date | null)[] = Array(offsetLunes).fill(null);

  for (let d = 1; d <= diasEnMes; d++) {
    semana.push(new Date(anio, mes - 1, d));
    if (semana.length === 7) {
      semanas.push(semana);
      semana = [];
    }
  }
  if (semana.length > 0) {
    while (semana.length < 7) semana.push(null);
    semanas.push(semana);
  }

  return semanas;
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function CalendarioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hoy = useMemo(() => new Date(), []);
  const [anio, setAnio] = useState(hoy.getFullYear());

  // Precomputar tiempo litúrgico para todos los días del año
  const liturgicoMap = useMemo(() => {
    const map = new Map<string, TiempoLiturgico>();
    for (let mes = 1; mes <= 12; mes++) {
      const diasEnMes = new Date(anio, mes, 0).getDate();
      for (let dia = 1; dia <= diasEnMes; dia++) {
        map.set(`${anio}-${mes}-${dia}`, calcularTiempoLiturgico(new Date(anio, mes - 1, dia)));
      }
    }
    return map;
  }, [anio]);

  // Conjunto de fechas de precepto del año (clave: "anio-mes-dia")
  const preceptoSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of getDiasPreceptoDelAnio(anio)) {
      s.add(`${p.date.getFullYear()}-${p.date.getMonth() + 1}-${p.date.getDate()}`);
    }
    return s;
  }, [anio]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: "#1A1A1A",
        }}
      >
        {/* Volver */}
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, minWidth: 70 }}
          android_ripple={null}
        >
          <Ionicons name="chevron-back" size={18} color={ACCENT} />
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: ACCENT }}>
            Inicio
          </Text>
        </Pressable>

        {/* Selector de año */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <Pressable onPress={() => setAnio((a) => a - 1)} android_ripple={null}>
            <Ionicons name="chevron-back" size={20} color="#666666" />
          </Pressable>
          <Text
            style={{
              fontFamily: "CormorantGaramond_600SemiBold",
              fontSize: 24,
              color: "#FFFFFF",
              minWidth: 52,
              textAlign: "center",
            }}
          >
            {anio}
          </Text>
          <Pressable onPress={() => setAnio((a) => a + 1)} android_ripple={null}>
            <Ionicons name="chevron-forward" size={20} color="#666666" />
          </Pressable>
        </View>

        <View style={{ minWidth: 70 }} />
      </View>

      {/* Meses */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 32,
        }}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => {
          const semanas = buildMes(anio, mes);

          return (
            <View key={mes} style={{ marginBottom: 32 }}>
              {/* Nombre del mes */}
              <Text
                style={{
                  fontFamily: "CormorantGaramond_400Regular_Italic",
                  fontSize: 22,
                  color: "#FFFFFF",
                  marginBottom: 10,
                }}
              >
                {MESES[mes - 1]}
              </Text>

              {/* Cabecera de días de la semana */}
              <View style={{ flexDirection: "row", marginBottom: 6 }}>
                {DIA_COLS.map((d, i) => (
                  <Text
                    key={i}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontFamily: "Inter_500Medium",
                      fontSize: 9,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      color: i === 6 ? ACCENT + "99" : "#3A3A3A",
                    }}
                  >
                    {d}
                  </Text>
                ))}
              </View>

              {/* Semanas */}
              {semanas.map((semana, si) => (
                <View key={si} style={{ flexDirection: "row", marginBottom: 3 }}>
                  {semana.map((fecha, di) => {
                    if (!fecha) return <View key={di} style={{ flex: 1 }} />;

                    const esHoy = isSameDay(fecha, hoy);
                    const esPasado =
                      fecha <
                      new Date(
                        hoy.getFullYear(),
                        hoy.getMonth(),
                        hoy.getDate()
                      );
                    const esDomingo = fecha.getDay() === 0;
                    const esPrecepto = preceptoSet.has(
                      `${fecha.getFullYear()}-${fecha.getMonth() + 1}-${fecha.getDate()}`
                    );
                    const tiempo =
                      liturgicoMap.get(
                        `${anio}-${mes}-${fecha.getDate()}`
                      ) ?? "tiempo_ordinario";

                    return (
                      <View key={di} style={{ flex: 1, alignItems: "center" }}>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: esHoy
                              ? ACCENT
                              : BG_LITURGICO[tiempo],
                            borderWidth: esPrecepto && !esHoy ? 1 : 0,
                            borderColor: ACCENT + "70",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: esPasado && !esHoy ? 0.45 : 1,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "Inter_500Medium",
                              fontSize: 11,
                              color: esHoy
                                ? "#FFFFFF"
                                : esDomingo
                                ? "#CCCCCC"
                                : "#999999",
                            }}
                          >
                            {fecha.getDate()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        })}

        {/* Leyenda */}
        <View
          style={{
            paddingTop: 20,
            borderTopWidth: 1,
            borderTopColor: "#1A1A1A",
            gap: 10,
          }}
        >
          {(
            [
              { tiempo: "tiempo_ordinario" as TiempoLiturgico, label: "Tiempo Ordinario" },
              { tiempo: "adviento"         as TiempoLiturgico, label: "Adviento · Cuaresma" },
              { tiempo: "navidad"          as TiempoLiturgico, label: "Navidad · Pascua" },
              { tiempo: "semana_santa"     as TiempoLiturgico, label: "Semana Santa · Pentecostés" },
            ] as const
          ).map(({ tiempo, label }) => (
            <View
              key={label}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: DOT_LITURGICO[tiempo],
                }}
              />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: "#666666",
                }}
              >
                {label}
              </Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: ACCENT + "70",
                backgroundColor: "transparent",
              }}
            />
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "#666666",
              }}
            >
              Día de precepto
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
