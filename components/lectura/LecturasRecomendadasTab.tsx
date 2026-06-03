import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LIBROS_RECOMENDADOS, type LibroData } from "@/lib/data/libros";
import type { CategoriaLectura } from "@/lib/db/schema";

// ─── Categorías ────────────────────────────────────────────────────────────────

type FiltroCategoria = "todos" | CategoriaLectura;

const FILTROS: { key: FiltroCategoria; label: string }[] = [
  { key: "todos",          label: "Todos" },
  { key: "filosofia",      label: "Filosofía" },
  { key: "teologia",       label: "Teología" },
  { key: "espiritualidad", label: "Espiritualidad" },
  { key: "apologetica",    label: "Apologética" },
];

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

// ─── Chip de filtro ───────────────────────────────────────────────────────────

function FiltroChip({
  label,
  activo,
  primero,
  ultimo,
  onPress,
}: {
  label:   string;
  activo:  boolean;
  primero: boolean;
  ultimo:  boolean;
  onPress: () => void;
}) {
  const r = 24;
  return (
    <View
      style={{
        overflow:                "hidden",
        borderTopLeftRadius:     primero ? r : 6,
        borderBottomLeftRadius:  primero ? r : 6,
        borderTopRightRadius:    ultimo  ? r : 6,
        borderBottomRightRadius: ultimo  ? r : 6,
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      >
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical:   8,
            backgroundColor:   activo ? "#FF7D7D" : "transparent",
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize:   12,
              lineHeight: 12,
              color:      activo ? "#FFFFFF" : "#777777",
            }}
          >
            {label}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

// ─── Portada decorativa ───────────────────────────────────────────────────────

function PortadaDecorativa({ categoria }: { categoria: CategoriaLectura }) {
  const color = CATEGORIA_COLOR[categoria];
  return (
    <View
      style={{
        width:           52,
        height:          72,
        borderRadius:    6,
        backgroundColor: `${color}18`,
        borderWidth:     1,
        borderColor:     `${color}35`,
        alignItems:      "center",
        justifyContent:  "center",
        flexShrink:      0,
      }}
    >
      <Ionicons
        name={
          categoria === "filosofia"      ? "library-outline"      :
          categoria === "teologia"       ? "book-outline"          :
          categoria === "espiritualidad" ? "heart-outline"         :
                                           "shield-checkmark-outline"
        }
        size={22}
        color={color}
      />
    </View>
  );
}

// ─── Card de libro ────────────────────────────────────────────────────────────

function LibroCard({ libro }: { libro: LibroData }) {
  const color  = CATEGORIA_COLOR[libro.categoria];
  const router = useRouter();

  function verMas() {
    router.push(`/libro/${libro.id}`);
  }

  return (
    <View
      style={{
        backgroundColor: "#111111",
        borderWidth:     1,
        borderColor:     "#2A2A2A",
        borderRadius:    14,
        padding:         14,
        marginBottom:    12,
        flexDirection:   "row",
        gap:             14,
      }}
    >
      {/* Portada decorativa */}
      <PortadaDecorativa categoria={libro.categoria} />

      {/* Contenido */}
      <View style={{ flex: 1 }}>
        {/* Badge de categoría */}
        <View
          style={{
            alignSelf:         "flex-start",
            paddingHorizontal: 8,
            paddingVertical:   2,
            borderRadius:      6,
            backgroundColor:   `${color}18`,
            borderWidth:       1,
            borderColor:       `${color}35`,
            marginBottom:      6,
          }}
        >
          <Text
            style={{
              fontFamily:    "Inter_500Medium",
              fontSize:      9,
              color,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {CATEGORIA_LABEL[libro.categoria]}
          </Text>
        </View>

        {/* Título */}
        <Text
          style={{
            fontFamily:   "CormorantGaramond_600SemiBold",
            fontSize:     16,
            color:        "#FFFFFF",
            lineHeight:   20,
            marginBottom: 2,
          }}
          numberOfLines={2}
        >
          {libro.titulo}
        </Text>

        {/* Autor */}
        <Text
          style={{
            fontFamily:   "Inter_400Regular",
            fontSize:     11,
            color:        "#666666",
            marginBottom: 8,
          }}
        >
          {libro.autor}
        </Text>

        {/* Descripción */}
        <Text
          style={{
            fontFamily:   "Inter_400Regular",
            fontSize:     12,
            color:        "#808080",
            lineHeight:   18,
            marginBottom: 10,
          }}
          numberOfLines={3}
        >
          {libro.descripcion}
        </Text>

        {/* CTA */}
        {libro.urlCompra && (
          <Pressable
            onPress={verMas}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, alignSelf: "flex-start" })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize:   12,
                  color:      "#FF7D7D",
                }}
              >
                Ver más
              </Text>
              <Ionicons name="arrow-forward" size={11} color="#FF7D7D" />
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── LecturasRecomendadasTab ──────────────────────────────────────────────────

export function LecturasRecomendadasTab() {
  const [filtro, setFiltro] = useState<FiltroCategoria>("todos");

  const librosFiltrados = useMemo(() => {
    if (filtro === "todos") return LIBROS_RECOMENDADOS;
    return LIBROS_RECOMENDADOS.filter((l) => l.categoria === filtro);
  }, [filtro]);

  return (
    <View style={{ flex: 1 }}>
      {/* ── Filtros ── */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: "#1A1A1A" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
        >
          <View
            style={{
              flexDirection:   "row",
              backgroundColor: "#222222",
              borderRadius:    28,
              padding:         4,
              gap:             2,
            }}
          >
            {FILTROS.map((f, i) => (
              <FiltroChip
                key={f.key}
                label={f.label}
                activo={filtro === f.key}
                primero={i === 0}
                ultimo={i === FILTROS.length - 1}
                onPress={() => setFiltro(f.key)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ── Lista de libros ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Contador */}
        <Text
          style={{
            fontFamily:   "Inter_400Regular",
            fontSize:     11,
            color:        "#555555",
            marginBottom: 14,
          }}
        >
          {librosFiltrados.length} obra{librosFiltrados.length !== 1 ? "s" : ""}
        </Text>

        {librosFiltrados.map((libro) => (
          <LibroCard key={libro.id} libro={libro} />
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
