import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getLecturaFavoritaById, getMensajesChat } from "@/lib/db/queries";
import { NotasPersonales } from "@/components/lectura/NotasPersonales";
import { translateRefES } from "@/lib/api/biblia";
import type { ChatMensaje, LecturaFavorita } from "@/lib/db/schema";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SeccionTexto = { referencia: string; texto: string };
type ContenidoGuardado = {
  primeraLectura?: SeccionTexto;
  salmo?:          SeccionTexto;
  evangelio:       SeccionTexto;
};

function parsearContenido(textoCompleto: string): ContenidoGuardado | null {
  try {
    const parsed = JSON.parse(textoCompleto);
    if (parsed?.evangelio) return parsed as ContenidoGuardado;
    return null;
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Sección de lectura ───────────────────────────────────────────────────────

function SeccionLectura({
  etiqueta,
  referencia,
  texto,
  esEvangelio = false,
}: {
  etiqueta:    string;
  referencia:  string;
  texto:       string;
  esEvangelio?: boolean;
}) {
  return (
    <View
      style={{
        marginBottom: 28,
        ...(esEvangelio
          ? { borderLeftWidth: 3, borderLeftColor: "#FF7D7D", paddingLeft: 14 }
          : {}),
      }}
    >
      <Text
        style={{
          fontFamily:    "Inter_500Medium",
          fontSize:      10,
          color:         "#666666",
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom:  6,
        }}
      >
        {etiqueta}
      </Text>
      <Text
        style={{
          fontFamily:    "Inter_500Medium",
          fontSize:      12,
          color:         "#FF7D7D",
          letterSpacing: 1,
          marginBottom:  10,
        }}
      >
        {referencia}
      </Text>
      <Text
        style={{
          fontFamily: "CormorantGaramond_400Regular_Italic",
          fontSize:   16,
          color:      "#C0C0C0",
          lineHeight: 26,
        }}
      >
        {texto}
      </Text>
    </View>
  );
}

function SeccionSalmo({ referencia, texto }: { referencia: string; texto: string }) {
  return (
    <View
      style={{
        marginBottom:    28,
        padding:         16,
        backgroundColor: "#111111",
        borderRadius:    12,
        borderWidth:     1,
        borderColor:     "#2A2A2A",
      }}
    >
      <Text
        style={{
          fontFamily:    "Inter_500Medium",
          fontSize:      10,
          color:         "#666666",
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom:  6,
        }}
      >
        Salmo responsorial
      </Text>
      <Text
        style={{
          fontFamily:    "Inter_500Medium",
          fontSize:      12,
          color:         "#FF7D7D",
          letterSpacing: 1,
          marginBottom:  12,
        }}
      >
        {referencia}
      </Text>
      <Text
        style={{
          fontFamily: "CormorantGaramond_400Regular_Italic",
          fontSize:   15,
          color:      "#A0A0A0",
          lineHeight: 24,
        }}
      >
        {texto}
      </Text>
    </View>
  );
}

// ─── Burbuja de chat IA (solo lectura) ───────────────────────────────────────

function BurbujaChat({ mensaje }: { mensaje: ChatMensaje }) {
  const esUsuario = mensaje.role === "user";
  return (
    <View
      style={{
        flexDirection:  "row",
        justifyContent: esUsuario ? "flex-end" : "flex-start",
        marginBottom:   10,
      }}
    >
      <View
        style={{
          maxWidth:                "82%",
          paddingHorizontal:       14,
          paddingVertical:         10,
          borderRadius:            16,
          borderBottomRightRadius: esUsuario ? 4 : 16,
          borderBottomLeftRadius:  esUsuario ? 16 : 4,
          backgroundColor:         esUsuario ? "rgba(255,125,125,0.14)" : "#1A1A1A",
          borderWidth:             1,
          borderColor:             esUsuario ? "rgba(255,125,125,0.28)" : "#2A2A2A",
        }}
      >
        <Text style={{ color: "#D4D4D4", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 }}>
          {mensaje.content}
        </Text>
      </View>
    </View>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function LecturaGuardadaScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id     = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const fecha = useMemo(
    () => (id ? id.replace(/-evangelio$/, "") : ""),
    [id]
  );

  const [lectura,  setLectura]  = useState<LecturaFavorita | null>(null);
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getLecturaFavoritaById(id), getMensajesChat(fecha)]).then(
      ([lec, msgs]) => {
        if (lec) setLectura(lec);
        setMensajes(msgs);
        setCargando(false);
      }
    );
  }, [id, fecha]);

  const contenido = useMemo(
    () => lectura ? parsearContenido(lectura.textoCompleto) : null,
    [lectura]
  );

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
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 16, color: "#FFFFFF", marginLeft: 4 }}>
          Lectura guardada
        </Text>
      </View>

      {cargando ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#FF7D7D" />
        </View>
      ) : !lectura ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: "#555555", textAlign: "center" }}>
            No se encontró esta lectura
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Fecha */}
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#555555", marginBottom: 4 }}>
              {formatFecha(lectura.fecha)}
            </Text>

            {/* Referencia bíblica */}
            <Text
              style={{
                fontFamily:   "CormorantGaramond_600SemiBold",
                fontSize:     26,
                color:        "#FF7D7D",
                lineHeight:   32,
                marginBottom: 4,
              }}
            >
              {translateRefES(lectura.fuente)}
            </Text>

            {/* Nombre litúrgico */}
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#666666", marginBottom: 24 }}>
              {lectura.titulo}
            </Text>

            {/* ── Secciones ── */}
            {contenido ? (
              <>
                {contenido.primeraLectura && (
                  <SeccionLectura
                    etiqueta="Primera Lectura"
                    referencia={contenido.primeraLectura.referencia}
                    texto={contenido.primeraLectura.texto}
                  />
                )}
                {contenido.salmo && (
                  <SeccionSalmo
                    referencia={contenido.salmo.referencia}
                    texto={contenido.salmo.texto}
                  />
                )}
                <SeccionLectura
                  etiqueta="Evangelio"
                  referencia={contenido.evangelio.referencia}
                  texto={contenido.evangelio.texto}
                  esEvangelio
                />
              </>
            ) : (
              // Fallback para lecturas guardadas con el formato antiguo
              <View style={{ borderLeftWidth: 3, borderLeftColor: "#FF7D7D", paddingLeft: 14, marginBottom: 32 }}>
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 10, color: "#666666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                  Evangelio
                </Text>
                <Text style={{ fontFamily: "CormorantGaramond_400Regular_Italic", fontSize: 16, color: "#C0C0C0", lineHeight: 26 }}>
                  {lectura.textoCompleto}
                </Text>
              </View>
            )}

            {/* Reflexión con la Lectio — solo si hay mensajes de chat IA */}
            {mensajes.length > 0 && (
              <>
                <View style={{ borderTopWidth: 1, borderTopColor: "#1E1E1E", marginBottom: 24 }} />
                <Text style={{ fontFamily: "CormorantGaramond_600SemiBold", fontSize: 20, color: "#FFFFFF", marginBottom: 4 }}>
                  Reflexión con la Lectio
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#555555", lineHeight: 18, marginBottom: 16 }}>
                  Conversación guardada de este día
                </Text>
                {mensajes.map((m) => <BurbujaChat key={m.id} mensaje={m} />)}
                <View style={{ height: 8 }} />
              </>
            )}

            {/* Mis reflexiones */}
            <View style={{ borderTopWidth: 1, borderTopColor: "#1E1E1E", marginBottom: 24 }} />
            <NotasPersonales lecturaFecha={fecha} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
