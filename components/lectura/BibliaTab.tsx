import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

import { LIBROS_BIBLIA, type LibroBiblia } from "@/constants/biblia";
import { getCapitulo, type Versiculo } from "@/lib/api/biblia";
import { SkeletonLine } from "@/components/home/SkeletonCard";
import { useBibliaStore } from "@/lib/store/bibliaStore";

// ─── Constantes ───────────────────────────────────────────────────────────────

const ACCENT = "#FF7D7D";

// Referencia estable para evitar infinite-loop con useSyncExternalStore
const EMPTY_LEIDOS: number[] = [];

// Elimina tildes y pasa a minúsculas para búsqueda laxa
function normalizar(s: string): string {
  return s.normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase();
}

const SECCIONES = [
  { title: "ANTIGUO TESTAMENTO", data: LIBROS_BIBLIA.filter((l) => l.testamento === "AT") },
  { title: "NUEVO TESTAMENTO",   data: LIBROS_BIBLIA.filter((l) => l.testamento === "NT") },
];

// ─── Tipos de vista ───────────────────────────────────────────────────────────

type Vista =
  | { tipo: "libros" }
  | { tipo: "capitulos"; libro: LibroBiblia }
  | { tipo: "lector"; libro: LibroBiblia; capitulo: number };

// ─── Vista 1: Lista de libros ─────────────────────────────────────────────────

function ListaLibros({
  onSeleccionar,
}: {
  onSeleccionar: (libro: LibroBiblia) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const leidos = useBibliaStore((s) => s.leidos);

  const query = normalizar(busqueda.trim());
  const librosFiltrados = useMemo(
    () =>
      query
        ? LIBROS_BIBLIA.filter(
            (l) =>
              normalizar(l.nombre).includes(query) ||
              normalizar(l.abrev).includes(query)
          )
        : null,
    [query]
  );

  const renderFila = useCallback(
    ({ item: libro }: { item: LibroBiblia }) => {
      const leidosCount = (leidos[libro.osis] ?? []).length;
      const todoLeido = leidosCount === libro.capitulos && leidosCount > 0;
      return (
        <Pressable
          onPress={() => onSeleccionar(libro)}
          android_ripple={{ color: "#FFFFFF10" }}
        >
          <View
            style={{
              flexDirection:     "row",
              alignItems:        "center",
              justifyContent:    "space-between",
              paddingVertical:   14,
              paddingHorizontal: 20,
              borderBottomWidth: 1,
              borderBottomColor: "#1A1A1A",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize:   15,
                color:      "#DDDDDD",
                flex:       1,
              }}
            >
              {libro.nombre}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {leidosCount > 0 && (
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize:   11,
                    color:      todoLeido ? "#7DB87D" : ACCENT,
                  }}
                >
                  {todoLeido ? "✓" : `${leidosCount}/${libro.capitulos}`}
                </Text>
              )}
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize:   12,
                  color:      "#555555",
                }}
              >
                {libro.capitulos} cap
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#444444" />
            </View>
          </View>
        </Pressable>
      );
    },
    [leidos, onSeleccionar]
  );

  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontFamily:        "Inter_400Regular",
          fontSize:          11,
          color:             "#555555",
          paddingHorizontal: 20,
          paddingTop:        12,
          paddingBottom:     4,
        }}
      >
        Traducción: Biblia de La Merced (BLM)
      </Text>
      {/* Buscador */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop:        8,
          paddingBottom:     8,
        }}
      >
        <View
          style={{
            flexDirection:  "row",
            alignItems:     "center",
            backgroundColor: "#111111",
            borderRadius:   10,
            borderWidth:    1,
            borderColor:    "#2A2A2A",
            paddingHorizontal: 12,
            paddingVertical:   10,
            gap:            8,
          }}
        >
          <Ionicons name="search" size={15} color="#555555" />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar libro…"
            placeholderTextColor="#555555"
            style={{
              flex:       1,
              fontFamily: "Inter_400Regular",
              fontSize:   14,
              color:      "#DDDDDD",
              padding:    0,
            }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {busqueda.length > 0 && (
            <Pressable onPress={() => setBusqueda("")} android_ripple={null}>
              <Ionicons name="close-circle" size={16} color="#555555" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Lista */}
      {librosFiltrados ? (
        <FlatList
          data={librosFiltrados}
          keyExtractor={(item) => item.osis}
          renderItem={renderFila}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 48 }}>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize:   14,
                  color:      "#555555",
                }}
              >
                Sin resultados para «{busqueda}»
              </Text>
            </View>
          }
        />
      ) : (
        <SectionList
          sections={SECCIONES}
          keyExtractor={(item) => item.osis}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          renderSectionHeader={({ section }) => (
            <View
              style={{
                paddingTop:        24,
                paddingBottom:     8,
                paddingHorizontal: 20,
                backgroundColor:   "#0A0A0A",
              }}
            >
              <Text
                style={{
                  fontFamily:    "Inter_500Medium",
                  fontSize:      10,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color:         ACCENT,
                }}
              >
                {section.title}
              </Text>
            </View>
          )}
          renderItem={renderFila}
        />
      )}
    </View>
  );
}

// ─── Vista 2: Grid de capítulos ───────────────────────────────────────────────

function GridCapitulos({
  libro,
  ultimoCapitulo,
  onSeleccionar,
  onVolver,
}: {
  libro: LibroBiblia;
  ultimoCapitulo: number | undefined;
  onSeleccionar: (cap: number) => void;
  onVolver: () => void;
}) {
  const leidosRaw = useBibliaStore((s) => s.leidos[libro.osis]);
  const leidos = leidosRaw ?? EMPTY_LEIDOS;
  const caps = useMemo(
    () => Array.from({ length: libro.capitulos }, (_, i) => i + 1),
    [libro.capitulos]
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View
        style={{
          flexDirection:     "row",
          alignItems:        "center",
          paddingHorizontal: 20,
          paddingTop:        16,
          paddingBottom:     12,
          gap:               12,
        }}
      >
        <Pressable
          onPress={onVolver}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          android_ripple={null}
        >
          <Ionicons name="chevron-back" size={18} color={ACCENT} />
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: ACCENT }}>
            Libros
          </Text>
        </Pressable>
        <Text
          style={{
            fontFamily: "CormorantGaramond_600SemiBold",
            fontSize:   22,
            color:      "#FFFFFF",
            flex:       1,
          }}
        >
          {libro.nombre}
        </Text>
      </View>

      <FlatList
        key={libro.osis}
        data={caps}
        numColumns={7}
        keyExtractor={(item) => String(item)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item: cap }) => {
          const esActivo = ultimoCapitulo === cap;
          const esLeido  = leidos.includes(cap);
          return (
            <View style={{ flex: 1, alignItems: "center", marginVertical: 4 }}>
              <Pressable onPress={() => onSeleccionar(cap)} android_ripple={null}>
                <View
                  style={{
                    width:           40,
                    height:          40,
                    borderRadius:    8,
                    backgroundColor: esActivo ? "#FF7D7D22" : "#111111",
                    borderWidth:     1,
                    borderColor:     esActivo ? "#FF7D7D66" : "#2A2A2A",
                    alignItems:      "center",
                    justifyContent:  "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      fontSize:   13,
                      color:      esActivo ? ACCENT : "#AAAAAA",
                    }}
                  >
                    {cap}
                  </Text>
                  {esLeido && (
                    <View
                      style={{
                        position:     "absolute",
                        bottom:       4,
                        width:        4,
                        height:       4,
                        borderRadius: 2,
                        backgroundColor: ACCENT,
                      }}
                    />
                  )}
                </View>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

// ─── Vista 3: Lector de capítulo ──────────────────────────────────────────────

function LectorCapitulo({
  libro,
  capitulo,
  onCambiarCapitulo,
  onVolver,
}: {
  libro: LibroBiblia;
  capitulo: number;
  onCambiarCapitulo: (cap: number) => void;
  onVolver: () => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [versiculos, setVersiculos] = useState<Versiculo[]>([]);
  const [cargando,   setCargando]   = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const marcarLeido    = useBibliaStore((s) => s.marcarLeido);
  const desmarcarLeido = useBibliaStore((s) => s.desmarcarLeido);
  const esLeido        = useBibliaStore((s) => (s.leidos[libro.osis] ?? []).includes(capitulo));

  const puedePrev = capitulo > 1;
  const puedeNext = capitulo < libro.capitulos;

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setVersiculos([]);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    const resultado = await getCapitulo(libro.osis, capitulo);
    if (resultado.ok) setVersiculos(resultado.data);
    else setError(resultado.error);
    setCargando(false);
  }, [libro.osis, capitulo]);

  useEffect(() => { cargar(); }, [cargar]);

  function toggleLeido() {
    if (esLeido) desmarcarLeido(libro.osis, capitulo);
    else marcarLeido(libro.osis, capitulo);
  }

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-30, 30])
        .failOffsetY([-10, 10])
        .runOnJS(true)
        .onEnd((e) => {
          if (e.translationX < -60 && puedeNext) onCambiarCapitulo(capitulo + 1);
          else if (e.translationX > 60 && puedePrev) onCambiarCapitulo(capitulo - 1);
        }),
    [puedeNext, puedePrev, capitulo, onCambiarCapitulo]
  );

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection:     "row",
            alignItems:        "center",
            justifyContent:    "space-between",
            paddingHorizontal: 20,
            paddingVertical:   14,
            borderBottomWidth: 1,
            borderBottomColor: "#1A1A1A",
          }}
        >
          <Pressable
            onPress={onVolver}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, minWidth: 80 }}
            android_ripple={null}
          >
            <Ionicons name="chevron-back" size={16} color={ACCENT} />
            <Text
              style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: ACCENT }}
              numberOfLines={1}
            >
              {libro.nombre}
            </Text>
          </Pressable>

          {/* Navegación prev / capítulo / next */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable
              onPress={() => puedePrev && onCambiarCapitulo(capitulo - 1)}
              disabled={!puedePrev}
              android_ripple={null}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={puedePrev ? "#888888" : "#333333"}
              />
            </Pressable>
            <Text
              style={{
                fontFamily: "CormorantGaramond_600SemiBold",
                fontSize:   18,
                color:      "#FFFFFF",
                minWidth:   28,
                textAlign:  "center",
              }}
            >
              {capitulo}
            </Text>
            <Pressable
              onPress={() => puedeNext && onCambiarCapitulo(capitulo + 1)}
              disabled={!puedeNext}
              android_ripple={null}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={puedeNext ? "#888888" : "#333333"}
              />
            </Pressable>
          </View>

          <View style={{ minWidth: 80 }} />
        </View>

        {/* Contenido */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop:        24,
            paddingBottom:     48,
          }}
        >
          {cargando && (
            <View style={{ gap: 14 }}>
              {[100, 85, 92, 78, 100, 65, 88, 72].map((w, i) => (
                <SkeletonLine key={i} width={`${w}%`} height={16} />
              ))}
            </View>
          )}

          {error && !cargando && (
            <View style={{ alignItems: "center", gap: 16, paddingTop: 32 }}>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize:   14,
                  color:      "#666666",
                  textAlign:  "center",
                }}
              >
                {error}
              </Text>
              <Pressable onPress={cargar} android_ripple={null}>
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: ACCENT }}>
                  Reintentar
                </Text>
              </Pressable>
            </View>
          )}

          {!cargando && !error && versiculos.map((v) => (
            <Text
              key={v.numero}
              style={{
                fontFamily:   "CormorantGaramond_400Regular",
                fontSize:     17,
                lineHeight:   30,
                color:        "#CCCCCC",
                marginBottom: 2,
              }}
            >
              <Text
                style={{
                  fontFamily:    "Inter_500Medium",
                  fontSize:      10,
                  color:         "#555555",
                  verticalAlign: "top",
                }}
              >
                {v.numero}{" "}
              </Text>
              {v.texto}
            </Text>
          ))}

          {/* Botón leído */}
          {!cargando && !error && versiculos.length > 0 && (
            <Pressable
              onPress={toggleLeido}
              style={{ marginTop: 40, marginBottom: 8, alignSelf: "center" }}
              android_ripple={null}
            >
              <View
                style={{
                  flexDirection:     "row",
                  alignItems:        "center",
                  gap:               8,
                  paddingVertical:   12,
                  paddingHorizontal: 24,
                  borderRadius:      12,
                  backgroundColor:   esLeido ? "#FF7D7D15" : "transparent",
                  borderWidth:       1,
                  borderColor:       esLeido ? "#FF7D7D55" : "#2A2A2A",
                }}
              >
                <Ionicons
                  name={esLeido ? "checkmark-circle" : "checkmark-circle-outline"}
                  size={18}
                  color={esLeido ? ACCENT : "#555555"}
                />
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize:   14,
                    color:      esLeido ? ACCENT : "#555555",
                  }}
                >
                  {esLeido ? "Leído" : "Marcar como leído"}
                </Text>
              </View>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </GestureDetector>
  );
}

// ─── BibliaTab ────────────────────────────────────────────────────────────────

export type BibliaNavTarget = { osis: string; capitulo: number };

export function BibliaTab({ navTarget }: { navTarget?: BibliaNavTarget }) {
  const [vista, setVista] = useState<Vista>(() => {
    if (navTarget) {
      const libro = LIBROS_BIBLIA.find((l) => l.osis === navTarget.osis);
      if (libro) return { tipo: "lector", libro, capitulo: navTarget.capitulo };
    }
    return { tipo: "libros" };
  });
  const [ultimoCapitulo, setUltimoCapitulo] = useState<Record<string, number>>({});

  function abrirCapitulos(libro: LibroBiblia) {
    setVista({ tipo: "capitulos", libro });
  }

  function abrirCapitulo(libro: LibroBiblia, cap: number) {
    setUltimoCapitulo((prev) => ({ ...prev, [libro.osis]: cap }));
    setVista({ tipo: "lector", libro, capitulo: cap });
  }

  function cambiarCapitulo(cap: number) {
    if (vista.tipo !== "lector") return;
    setUltimoCapitulo((prev) => ({ ...prev, [vista.libro.osis]: cap }));
    setVista({ ...vista, capitulo: cap });
  }

  if (vista.tipo === "libros") {
    return (
      <View style={{ flex: 1 }}>
        <ListaLibros onSeleccionar={abrirCapitulos} />
      </View>
    );
  }

  if (vista.tipo === "capitulos") {
    return (
      <View style={{ flex: 1 }}>
        <GridCapitulos
          libro={vista.libro}
          ultimoCapitulo={ultimoCapitulo[vista.libro.osis]}
          onSeleccionar={(cap) => abrirCapitulo(vista.libro, cap)}
          onVolver={() => setVista({ tipo: "libros" })}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LectorCapitulo
        libro={vista.libro}
        capitulo={vista.capitulo}
        onCambiarCapitulo={cambiarCapitulo}
        onVolver={() => setVista({ tipo: "capitulos", libro: vista.libro })}
      />
    </View>
  );
}
