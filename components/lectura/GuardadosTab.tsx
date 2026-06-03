import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getLecturasFavoritas, deleteLecturaFavorita } from "@/lib/db/queries";
import { translateRefES } from "@/lib/api/biblia";
import type { LecturaFavorita } from "@/lib/db/schema";

function formatFecha(fechaStr: string): string {
  const [y, m, d] = fechaStr.split("-").map(Number);
  const raw = new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

type Props = { active: boolean };

export function GuardadosTab({ active }: Props) {
  const router   = useRouter();
  const [lecturas, setLecturas] = useState<LecturaFavorita[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    try { setLecturas(await getLecturasFavoritas()); } catch {}
    setCargando(false);
  }

  useEffect(() => { if (active) cargar(); }, [active]);

  async function eliminar(id: string) {
    try {
      await deleteLecturaFavorita(id);
      setLecturas((prev) => prev.filter((l) => l.id !== id));
    } catch {}
  }

  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#FF7D7D" />
      </View>
    );
  }

  if (lecturas.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36 }}>
        <Ionicons name="bookmark-outline" size={40} color="#333333" />
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 15, color: "#555555", marginTop: 14, textAlign: "center" }}>
          Aún no has guardado ninguna lectura
        </Text>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#444444", marginTop: 6, textAlign: "center", lineHeight: 20 }}>
          Guarda lecturas desde la pestaña{"\n"}"Del día"
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingVertical: 12, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {lecturas.map((l, i) => (
        <React.Fragment key={l.id}>
          <Pressable
            onPress={() => router.push(`/lectura/${l.id}`)}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
          >
            <View
              style={{
                flexDirection:     "row",
                alignItems:        "center",
                paddingVertical:   14,
                paddingHorizontal: 20,
              }}
            >
            {/* Contenido */}
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text
                style={{
                  fontFamily:   "Inter_400Regular",
                  fontSize:     11,
                  color:        "#555555",
                  marginBottom: 5,
                }}
              >
                {formatFecha(l.fecha)}
              </Text>
              <Text
                style={{
                  fontFamily:   "CormorantGaramond_600SemiBold",
                  fontSize:     21,
                  color:        "#FF7D7D",
                  lineHeight:   26,
                  marginBottom: 2,
                }}
              >
                {translateRefES(l.fuente)}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize:   13,
                  color:      "#666666",
                }}
              >
                {l.titulo}
              </Text>
            </View>

            {/* Papelera centrada a la derecha */}
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); eliminar(l.id); }}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.4 : 0.65 })}
            >
              <Ionicons name="trash-outline" size={19} color="#FF7D7D" />
            </Pressable>
            </View>
          </Pressable>

          {/* Divider sutil */}
          {i < lecturas.length - 1 && (
            <View
              style={{
                height:          1,
                backgroundColor: "#1A1A1A",
                marginHorizontal: 20,
              }}
            />
          )}
        </React.Fragment>
      ))}
    </ScrollView>
  );
}
