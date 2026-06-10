import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonLine } from "@/components/home/SkeletonCard";
import {
  generarRecomendacionesNIM,
  type RecomendacionBiblica,
} from "@/lib/api/nim";

type Props = {
  textoEvangelio:  string;
  hoy:             Date;
  onAbrirCapitulo: (osis: string, capitulo: number) => void;
};

export function RecomendacionesDelDia({ textoEvangelio, hoy, onAbrirCapitulo }: Props) {
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionBiblica[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(false);

  const fechaStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

  const cargar = () => {
    setCargando(true);
    setError(false);
    generarRecomendacionesNIM(textoEvangelio, hoy)
      .then((result) => {
        if (result.ok) setRecomendaciones(result.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [fechaStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const labelStyle = {
    fontFamily:    "Inter_500Medium" as const,
    fontSize:      10,
    color:         "#666666",
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginBottom:  12,
    marginTop:     20,
  };

  if (cargando) {
    return (
      <View style={{ marginBottom: 28 }}>
        <SkeletonLine style={{ width: "45%", height: 10, marginBottom: 12, marginTop: 20, borderRadius: 4 }} />
        <SkeletonLine style={{ height: 62, borderRadius: 12, marginBottom: 8 }} />
        <SkeletonLine style={{ height: 62, borderRadius: 12, marginBottom: 8 }} />
        <SkeletonLine style={{ height: 62, borderRadius: 12 }} />
      </View>
    );
  }

  if (error || !recomendaciones || recomendaciones.length === 0) {
    return (
      <View style={{ marginBottom: 28 }}>
        <Text style={labelStyle}>Para profundizar</Text>
        <Pressable
          onPress={cargar}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <View
            style={{
              flexDirection:     "row",
              alignItems:        "center",
              justifyContent:    "center",
              gap:               8,
              backgroundColor:   "#111111",
              borderRadius:      12,
              borderWidth:       1,
              borderColor:       "#1E1E1E",
              paddingVertical:   14,
            }}
          >
            <Ionicons name="refresh-outline" size={14} color="#555555" />
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#555555" }}>
              Reintentar
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 28 }}>
      <Text style={labelStyle}>
        Para profundizar
      </Text>
      <View style={{ gap: 10 }}>
      {recomendaciones.map((rec) => (
        <Pressable
          key={`${rec.osis}-${rec.capitulo}`}
          onPress={() => onAbrirCapitulo(rec.osis, rec.capitulo)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View
            style={{
              flexDirection:     "row",
              alignItems:        "center",
              gap:               12,
              backgroundColor:   "#111111",
              borderRadius:      12,
              borderWidth:       1,
              borderColor:       "#1E1E1E",
              paddingHorizontal: 14,
              paddingVertical:   12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily:   "CormorantGaramond_600SemiBold",
                  fontSize:     16,
                  color:        "#FFFFFF",
                  marginBottom: 3,
                }}
              >
                {rec.referencia}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize:   13,
                  color:      "#888888",
                  lineHeight: 18,
                }}
              >
                {rec.motivo}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#FF7D7D" />
          </View>
        </Pressable>
      ))}
      </View>
    </View>
  );
}
