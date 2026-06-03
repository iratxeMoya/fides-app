import React, { useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LIBROS_RECOMENDADOS } from "@/lib/data/libros";
import type { CategoriaLectura } from "@/lib/db/schema";

// ─── Colores y etiquetas de categoría ────────────────────────────────────────

const CATEGORIA_COLOR: Record<CategoriaLectura, string> = {
  filosofia:      "#C084FC",
  teologia:       "#86EFAC",
  espiritualidad: "#FF7D7D",
  apologetica:    "#93C5FD",
};

const CATEGORIA_LABEL: Record<CategoriaLectura, string> = {
  filosofia:      "Filosofía",
  teologia:       "Teología",
  espiritualidad: "Espiritualidad",
  apologetica:    "Apologética",
};

// ─── Sección con título ───────────────────────────────────────────────────────

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <Text
        style={{
          fontFamily:    "Inter_500Medium",
          fontSize:      10,
          color:         "#666666",
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom:  10,
        }}
      >
        {titulo}
      </Text>
      {children}
    </View>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function LibroDetalleScreen() {
  const params    = useLocalSearchParams<{ id: string }>();
  const id        = Array.isArray(params.id) ? params.id[0] : params.id;
  const router    = useRouter();
  const [imgErr, setImgErr] = useState(false);

  const libro = LIBROS_RECOMENDADOS.find((l) => l.id === id);
  const color = libro ? CATEGORIA_COLOR[libro.categoria] : "#FF7D7D";

  const coverUri =
    libro?.isbn && !imgErr
      ? `https://covers.openlibrary.org/b/isbn/${libro.isbn}-L.jpg`
      : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0A" }} edges={["top"]}>

      {/* ── Header ── */}
      <View
        style={{
          flexDirection:     "row",
          alignItems:        "center",
          paddingHorizontal: 16,
          paddingVertical:   12,
          borderBottomWidth: 1,
          borderBottomColor: "#1A1A1A",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize:   16,
            color:      "#FFFFFF",
            marginLeft: 4,
          }}
        >
          Detalle
        </Text>
      </View>

      {/* ── Contenido ── */}
      {!libro ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: "#555555" }}>
            Libro no encontrado
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Portada + info básica ── */}
          <View
            style={{
              alignItems:      "center",
              paddingTop:      32,
              paddingBottom:   28,
              paddingHorizontal: 24,
              borderBottomWidth: 1,
              borderBottomColor: "#1A1A1A",
            }}
          >
            {/* Portada */}
            {coverUri ? (
              <Image
                source={{ uri: coverUri }}
                style={{
                  width:        140,
                  height:       210,
                  borderRadius: 8,
                  marginBottom: 24,
                }}
                onError={() => setImgErr(true)}
              />
            ) : (
              <View
                style={{
                  width:           140,
                  height:          210,
                  borderRadius:    8,
                  backgroundColor: `${color}18`,
                  borderWidth:     1,
                  borderColor:     `${color}35`,
                  alignItems:      "center",
                  justifyContent:  "center",
                  marginBottom:    24,
                }}
              >
                <Ionicons
                  name={
                    libro.categoria === "filosofia"      ? "library-outline"          :
                    libro.categoria === "teologia"       ? "book-outline"             :
                    libro.categoria === "espiritualidad" ? "heart-outline"            :
                                                           "shield-checkmark-outline"
                  }
                  size={48}
                  color={color}
                />
              </View>
            )}

            {/* Categoría badge */}
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical:   3,
                borderRadius:      6,
                backgroundColor:   `${color}18`,
                borderWidth:       1,
                borderColor:       `${color}35`,
                marginBottom:      12,
              }}
            >
              <Text
                style={{
                  fontFamily:    "Inter_500Medium",
                  fontSize:      9,
                  color,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                }}
              >
                {CATEGORIA_LABEL[libro.categoria]}
              </Text>
            </View>

            {/* Título */}
            <Text
              style={{
                fontFamily: "CormorantGaramond_600SemiBold",
                fontSize:   28,
                color:      "#FFFFFF",
                lineHeight: 34,
                textAlign:  "center",
                marginBottom: 8,
              }}
            >
              {libro.titulo}
            </Text>

            {/* Autor */}
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize:   14,
                color:      "#888888",
                textAlign:  "center",
              }}
            >
              {libro.autor}
            </Text>
          </View>

          {/* ── Secciones de texto ── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>

            {/* Sinopsis */}
            <Seccion titulo="Sinopsis">
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize:   15,
                  color:      "#C0C0C0",
                  lineHeight: 24,
                }}
              >
                {libro.descripcion}
              </Text>
            </Seccion>

            {/* Sobre el autor */}
            {libro.autorBio && (
              <Seccion titulo="Sobre el autor">
                <View
                  style={{
                    backgroundColor: "#111111",
                    borderRadius:    12,
                    borderWidth:     1,
                    borderColor:     "#2A2A2A",
                    padding:         16,
                  }}
                >
                  <Text
                    style={{
                      fontFamily:   "Inter_500Medium",
                      fontSize:     13,
                      color:        "#FFFFFF",
                      marginBottom: 6,
                    }}
                  >
                    {libro.autor}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize:   13,
                      color:      "#888888",
                      lineHeight: 21,
                    }}
                  >
                    {libro.autorBio}
                  </Text>
                </View>
              </Seccion>
            )}

            {/* Amazon */}
            {libro.urlCompra && (
              <Seccion titulo="Dónde conseguirlo">
                {libro.precio && (
                  <View
                    style={{
                      flexDirection:  "row",
                      alignItems:     "center",
                      gap:            8,
                      marginBottom:   14,
                    }}
                  >
                    <Ionicons name="pricetag-outline" size={14} color="#666666" />
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize:   13,
                        color:      "#888888",
                      }}
                    >
                      {libro.precio}
                      {"  "}
                      <Text style={{ fontSize: 11, color: "#555555" }}>
                        (precio orientativo)
                      </Text>
                    </Text>
                  </View>
                )}
                <Pressable
                  onPress={() => Linking.openURL(libro.urlCompra!).catch(() => null)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                >
                  <View
                    style={{
                      flexDirection:     "row",
                      alignItems:        "center",
                      justifyContent:    "center",
                      gap:               10,
                      paddingVertical:   14,
                      paddingHorizontal: 20,
                      borderRadius:      14,
                      backgroundColor:   "#FF9900",
                    }}
                  >
                    <Ionicons name="logo-amazon" size={18} color="#000000" />
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize:   15,
                        color:      "#000000",
                      }}
                    >
                      Ver en Amazon
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color="#000000" />
                  </View>
                </Pressable>
              </Seccion>
            )}

          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
