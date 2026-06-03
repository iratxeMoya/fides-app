import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getLecturaDelDia, type LecturaDelDia } from "@/lib/api/biblia";
import { getLecturasFavoritas }    from "@/lib/db/queries";
import { LecturaDelDiaTab }        from "@/components/lectura/LecturaDelDiaTab";
import { LecturasRecomendadasTab } from "@/components/lectura/LecturasRecomendadasTab";
import { GuardadosTab }            from "@/components/lectura/GuardadosTab";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Tab = "lecturas" | "recomendadas" | "guardados";

// ─── Tab switcher ─────────────────────────────────────────────────────────────

function TabHeader({
  tabActivo,
  onChange,
}: {
  tabActivo: Tab;
  onChange:  (t: Tab) => void;
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "lecturas",     label: "Del día"       },
    { key: "recomendadas", label: "Recomendadas"  },
    { key: "guardados",    label: "Guardados"     },
  ];

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingVertical:   12,
        borderBottomWidth: 1,
        borderBottomColor: "#1A1A1A",
      }}
    >
      {/* Contenedor segmented control */}
      <View
        style={{
          flexDirection:   "row",
          backgroundColor: "#222222",
          borderRadius:    28,
          padding:         4,
        }}
      >
        {tabs.map((t, i) => {
          const activo  = tabActivo === t.key;
          const primero = i === 0;
          const ultimo  = i === tabs.length - 1;
          const r = 24;
          return (
            <View
              key={t.key}
              style={{
                flex:                    1,
                overflow:                "hidden",
                borderTopLeftRadius:     primero ? r : 6,
                borderBottomLeftRadius:  primero ? r : 6,
                borderTopRightRadius:    ultimo  ? r : 6,
                borderBottomRightRadius: ultimo  ? r : 6,
              }}
            >
              <Pressable
                onPress={() => onChange(t.key)}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <View
                  style={{
                    alignItems:      "center",
                    paddingVertical: 9,
                    backgroundColor: activo ? "#FF7D7D" : "transparent",
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
                    {t.label}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── LecturaScreen ────────────────────────────────────────────────────────────

export default function LecturaScreen() {
  const hoy = useMemo(() => new Date(), []);

  const [tabActivo,  setTabActivo]  = useState<Tab>("lecturas");
  const [cargando,   setCargando]   = useState(true);
  const [lectura,    setLectura]    = useState<LecturaDelDia | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [guardada,   setGuardada]   = useState(false);

  // Calcular el ID del favorito de hoy una sola vez
  const favId = useMemo(() => {
    const y  = hoy.getFullYear();
    const mo = String(hoy.getMonth() + 1).padStart(2, "0");
    const d  = String(hoy.getDate()).padStart(2, "0");
    return `${y}-${mo}-${d}-evangelio`;
  }, [hoy]);

  const cargarLectura = useCallback(async () => {
    setCargando(true);
    setError(null);
    const resultado = await getLecturaDelDia(hoy);
    if (resultado.ok) setLectura(resultado.data);
    else setError(resultado.error);
    setCargando(false);
  }, [hoy]);

  useEffect(() => {
    cargarLectura();
    // Cargar estado guardado desde DB una sola vez al montar
    getLecturasFavoritas()
      .then((favs) => setGuardada(favs.some((f) => f.id === favId)))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#0A0A0A" }}
      edges={["top"]}
    >
      {/* ── Tabs internos ── */}
      <TabHeader tabActivo={tabActivo} onChange={setTabActivo} />

      {/* ── Contenido activo ── */}
      {tabActivo === "lecturas" ? (
        <LecturaDelDiaTab
          cargando={cargando}
          lectura={lectura}
          error={error}
          hoy={hoy}
          guardada={guardada}
          onGuardadaChange={setGuardada}
        />
      ) : tabActivo === "recomendadas" ? (
        <LecturasRecomendadasTab />
      ) : (
        <GuardadosTab active={tabActivo === "guardados"} />
      )}
    </SafeAreaView>
  );
}
