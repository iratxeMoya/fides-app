import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonCard, SkeletonLine } from "@/components/home/SkeletonCard";
import type { MensajeChatLocal } from "@/lib/api/chat";
import {
  buildSystemPromptNIM,
  enviarMensajeChatNIM,
} from "@/lib/api/nim";
import { translateRefES, type LecturaDelDia } from "@/lib/api/biblia";
import {
  getLecturasFavoritas,
  saveLecturaFavorita,
  deleteLecturaFavorita,
  getMensajesChat,
  saveMensajeChat,
  deleteMensajesChat,
} from "@/lib/db/queries";
import { NotasPersonales } from "@/components/lectura/NotasPersonales";

// ─── Color litúrgico ──────────────────────────────────────────────────────────

const COLOR_LITURGICO_MAP: Record<string, string> = {
  verde:  "#86EFAC",
  morado: "#C084FC",
  rojo:   "#FF7D7D",
  blanco: "#FFFFFF",
  rosa:   "#F9A8D4",
};

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SkeletonLectura() {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <SkeletonLine style={{ width: "40%", height: 10, marginBottom: 8, borderRadius: 4 }} />
      <SkeletonLine style={{ width: "75%", height: 22, marginBottom: 20, borderRadius: 4 }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ marginBottom: 24 }}>
          <SkeletonLine style={{ width: "30%", height: 10, marginBottom: 12, borderRadius: 4 }} />
          {[0, 1, 2, 3].map((j) => (
            <SkeletonLine
              key={j}
              style={{ width: `${85 + (j % 2) * 10}%`, height: 14, marginBottom: 7, borderRadius: 4 }}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Indicador de escritura ───────────────────────────────────────────────────

function PuntosAnimados() {
  const dots = useRef(
    Array.from({ length: 3 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.stagger(
        180,
        dots.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, { toValue: -5, duration: 260, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0,  duration: 260, useNativeDriver: true }),
          ])
        )
      )
    );
    loop.start();
    return () => loop.stop();
  }, [dots]);

  return (
    <View style={{ flexDirection: "row", gap: 5, alignItems: "center", height: 18 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width:           6,
            height:          6,
            borderRadius:    3,
            backgroundColor: "#666666",
            transform:       [{ translateY: dot }],
          }}
        />
      ))}
    </View>
  );
}

// ─── Burbujas de chat ─────────────────────────────────────────────────────────

function BurbujaChat({ mensaje }: { mensaje: MensajeChatLocal }) {
  const esUsuario = mensaje.role === "user";
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: esUsuario ? "flex-end" : "flex-start",
        marginBottom:   10,
      }}
    >
      <View
        style={{
          maxWidth:              "82%",
          paddingHorizontal:     14,
          paddingVertical:       10,
          borderRadius:          16,
          borderBottomRightRadius: esUsuario ? 4 : 16,
          borderBottomLeftRadius:  esUsuario ? 16 : 4,
          backgroundColor:       esUsuario ? "rgba(255,125,125,0.14)" : "#1A1A1A",
          borderWidth:           1,
          borderColor:           esUsuario ? "rgba(255,125,125,0.28)" : "#2A2A2A",
        }}
      >
        <Text
          style={{
            color:      "#D4D4D4",
            fontFamily: "Inter_400Regular",
            fontSize:   14,
            lineHeight: 21,
          }}
        >
          {mensaje.content ?? ""}
        </Text>
      </View>
    </View>
  );
}

function BurbujaEscribiendo() {
  return (
    <View style={{ flexDirection: "row", justifyContent: "flex-start", marginBottom: 10 }}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical:   12,
          borderRadius:      16,
          borderBottomLeftRadius: 4,
          backgroundColor:   "#1A1A1A",
          borderWidth:       1,
          borderColor:       "#2A2A2A",
        }}
      >
        <PuntosAnimados />
      </View>
    </View>
  );
}

// ─── Sección de lectura ───────────────────────────────────────────────────────

function SeccionLectura({
  etiqueta,
  referencia,
  texto,
  esEvangelio = false,
}: {
  etiqueta:   string;
  referencia: string;
  texto:      string;
  esEvangelio?: boolean;
}) {
  return (
    <View
      style={{
        marginBottom:    24,
        ...(esEvangelio
          ? {
              borderLeftWidth: 3,
              borderLeftColor: "#FF7D7D",
              paddingLeft:     14,
            }
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
        marginBottom:    24,
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

// ─── Input bar del chat ───────────────────────────────────────────────────────

type InputBarProps = {
  value:          string;
  onChangeText:   (t: string) => void;
  onSend:         () => void;
  enviando:       boolean;
  deshabilitado:  boolean;
  insetBottom:    number;
};

function ChatInputBar({
  value,
  onChangeText,
  onSend,
  enviando,
  deshabilitado,
  insetBottom,
}: InputBarProps) {
  const puedeEnviar = value.trim().length > 0 && !enviando && !deshabilitado;

  return (
    <View
      style={{
        flexDirection:  "row",
        alignItems:     "flex-end",
        gap:            10,
        paddingHorizontal: 16,
        paddingTop:     10,
        paddingBottom:  insetBottom + 10,
        borderTopWidth: 1,
        borderTopColor: "#1E1E1E",
        backgroundColor:"#0A0A0A",
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Escribe tu reflexión…"
        placeholderTextColor="#444444"
        multiline
        returnKeyType="default"
        style={{
          flex:            1,
          color:           "#FFFFFF",
          fontFamily:      "Inter_400Regular",
          fontSize:        14,
          lineHeight:      20,
          backgroundColor: "#111111",
          borderRadius:    14,
          borderWidth:     1,
          borderColor:     "#2A2A2A",
          paddingHorizontal: 14,
          paddingVertical:   10,
          maxHeight:       120,
        }}
      />
      <Pressable
        onPress={onSend}
        disabled={!puedeEnviar}
        style={({ pressed }) => ({
          opacity: !puedeEnviar ? 0.45 : pressed ? 0.75 : 1,
        })}
      >
        <View
          style={{
            width:           40,
            height:          40,
            borderRadius:    20,
            backgroundColor: puedeEnviar ? "#FF7D7D" : "rgba(255,125,125,0.12)",
            borderWidth:     puedeEnviar ? 0 : 1,
            borderColor:     "rgba(255,125,125,0.45)",
            alignItems:      "center",
            justifyContent:  "center",
          }}
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={puedeEnviar ? "#FFFFFF" : "#FF7D7D"}
          />
        </View>
      </Pressable>
    </View>
  );
}

// ─── LecturaDelDiaTab ─────────────────────────────────────────────────────────

type Props = {
  cargando:          boolean;
  lectura:           LecturaDelDia | null;
  error:             string | null;
  hoy:               Date;
  guardada:          boolean;
  onGuardadaChange:  (v: boolean) => void;
};

type ModoReflexion = "notas" | "chat";

export function LecturaDelDiaTab({ cargando, lectura, error, hoy, guardada, onGuardadaChange }: Props) {
  const insets     = useSafeAreaInsets();
  const scrollRef  = useRef<ScrollView>(null);
  const abortRef   = useRef<AbortController | null>(null);

  const [modo,             setModo]             = useState<ModoReflexion>("notas");
  const [mensajes,         setMensajes]         = useState<MensajeChatLocal[]>([]);
  const [escribiendo,      setEscribiendo]      = useState(false);
  const [textoStreaming,   setTextoStreaming]    = useState("");
  const [inputTexto,       setInputTexto]       = useState("");
  const [mensajesCargados, setMensajesCargados] = useState(false);
  const [esperandoRateLimit, setEsperandoRateLimit] = useState(false);
  const fechaDb = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
  const favId   = `${fechaDb}-evangelio`;

  // Ref para acceder siempre al último estado de mensajes sin re-crear enviar
  const mensajesRef = useRef(mensajes);
  useEffect(() => { mensajesRef.current = mensajes; }, [mensajes]);

  // System prompt memoizado
  const systemPrompt = useMemo(
    () => (lectura ? buildSystemPromptNIM(lectura) : ""),
    [lectura]
  );

  // Auto-scroll al final cuando llegan mensajes o streaming en modo chat
  useEffect(() => {
    if (modo !== "chat") return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(t);
  }, [mensajes.length, textoStreaming, escribiendo, modo]);

  // Abortar si el componente se desmonta durante streaming
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // Cargar historial del chat desde SQLite al montar
  useEffect(() => {
    getMensajesChat(fechaDb)
      .then((rows) => {
        if (rows.length > 0) {
          setMensajes(rows.map((r) => ({
            id:      r.id,
            role:    r.role as "user" | "assistant",
            content: r.content ?? "",
          })));
        }
      })
      .catch(() => {})
      .finally(() => setMensajesCargados(true));
  }, [fechaDb]);

  // Cuando el modo chat se activa y el historial ya está cargado, la IA abre con la primera pregunta
  const iniciarChat = useCallback(async () => {
    if (!lectura || mensajesRef.current.length > 0) return;
    setEscribiendo(true);
    setTextoStreaming("");
    const controller = new AbortController();
    abortRef.current = controller;
    let respuesta = "";
    try {
      for await (const chunk of enviarMensajeChatNIM(
        [{ id: "init", role: "user", content: "Inicia la reflexión." }],
        systemPrompt,
        controller.signal,
        (esperando) => setEsperandoRateLimit(esperando),
      )) {
        respuesta += chunk;
        setTextoStreaming(respuesta);
      }
      if (respuesta) {
        const msg: MensajeChatLocal = { id: `a-${Date.now()}`, role: "assistant", content: respuesta };
        setMensajes([msg]);
        saveMensajeChat({ id: msg.id, lecturaFecha: fechaDb, role: "assistant", content: msg.content, createdAt: new Date() }).catch(() => {});
      }
    } catch {
      // silencioso — el usuario puede escribir igualmente
    } finally {
      setTextoStreaming("");
      setEscribiendo(false);
    }
  }, [lectura, systemPrompt, fechaDb]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (modo === "chat" && mensajesCargados) iniciarChat();
  }, [modo, lectura, mensajesCargados]); // eslint-disable-line react-hooks/exhaustive-deps

  const borrarHistorial = useCallback(() => {
    Alert.alert(
      "Borrar conversación",
      "La reflexión de hoy se eliminará. Podrás comenzar de nuevo.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            abortRef.current?.abort();
            setMensajes([]);
            mensajesRef.current = [];
            setTextoStreaming("");
            setEscribiendo(false);
            setEsperandoRateLimit(false);
            await deleteMensajesChat(fechaDb).catch(() => {});
            iniciarChat();
          },
        },
      ]
    );
  }, [fechaDb, iniciarChat]);

  const enviar = useCallback(async () => {
    const texto = inputTexto.trim();
    if (!texto || escribiendo || !lectura) return;

    setInputTexto("");

    const userMsg: MensajeChatLocal = { id: `u-${Date.now()}`, role: "user", content: texto };
    const nuevosMensajes: MensajeChatLocal[] = [...mensajesRef.current, userMsg];
    setMensajes(nuevosMensajes);
    saveMensajeChat({ id: userMsg.id, lecturaFecha: fechaDb, role: "user", content: userMsg.content, createdAt: new Date() }).catch(() => {});
    setEscribiendo(true);
    setTextoStreaming("");

    const controller = new AbortController();
    abortRef.current = controller;

    let respuesta = "";
    try {
      for await (const chunk of enviarMensajeChatNIM(
        nuevosMensajes,
        systemPrompt,
        controller.signal,
        (esperando) => setEsperandoRateLimit(esperando),
      )) {
        respuesta += chunk;
        setTextoStreaming(respuesta);
      }

      const aMsg: MensajeChatLocal = { id: `a-${Date.now()}`, role: "assistant", content: respuesta };
      setMensajes((prev) => [...prev, aMsg]);
      saveMensajeChat({ id: aMsg.id, lecturaFecha: fechaDb, role: "assistant", content: aMsg.content, createdAt: new Date() }).catch(() => {});
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        setMensajes((prev) => [
          ...prev,
          {
            id:      `err-${Date.now()}`,
            role:    "assistant",
            content: "No se pudo obtener respuesta. Verifica tu conexión.",
          },
        ]);
      }
    } finally {
      setTextoStreaming("");
      setEscribiendo(false);
    }
  }, [inputTexto, escribiendo, lectura, systemPrompt]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (cargando) return <SkeletonLectura />;

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !lectura) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text
          style={{
            fontFamily: "CormorantGaramond_600SemiBold",
            fontSize:   20,
            color:      "#FFFFFF",
            marginBottom: 8,
            textAlign:  "center",
          }}
        >
          No se pudo cargar la lectura
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize:   14,
            color:      "#666666",
            textAlign:  "center",
          }}
        >
          {error ?? "Comprueba tu conexión e inténtalo de nuevo."}
        </Text>
      </View>
    );
  }

  const colorHex =
    COLOR_LITURGICO_MAP[lectura.colorLiturgico?.toLowerCase()] ?? "#A0A0A0";

  const fechaRaw = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
  }).format(hoy);
  const fechaStr = fechaRaw.charAt(0).toUpperCase() + fechaRaw.slice(1);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* ── Scroll: lecturas + chat ── */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HEADER ── */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontFamily:   "Inter_400Regular",
              fontSize:     12,
              color:        "#666666",
              marginBottom: 4,
            }}
          >
            {fechaStr}
          </Text>
          <Text
            style={{
              fontFamily:  "CormorantGaramond_600SemiBold",
              fontSize:    26,
              color:       "#FFFFFF",
              lineHeight:  32,
              marginBottom: 8,
            }}
          >
            {lectura.titulo}
          </Text>
          {/* Color litúrgico badge */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colorHex }}
            />
            <Text
              style={{
                fontFamily:    "Inter_500Medium",
                fontSize:      10,
                color:         "#666666",
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              {lectura.colorLiturgico}
            </Text>
          </View>
        </View>

        {/* ── PRIMERA CARTA ── */}
        {lectura.primeraLectura && (
          <SeccionLectura
            etiqueta="Primera Lectura"
            referencia={translateRefES(lectura.primeraLectura.referencia)}
            texto={lectura.primeraLectura.texto}
          />
        )}

        {/* ── SALMO ── */}
        {lectura.salmo && (
          <SeccionSalmo
            referencia={translateRefES(lectura.salmo.referencia)}
            texto={lectura.salmo.texto}
          />
        )}

        {/* ── EVANGELIO ── */}
        <SeccionLectura
          etiqueta="Evangelio"
          referencia={translateRefES(lectura.referencia)}
          texto={lectura.texto}
          esEvangelio
        />

        {/* ── GUARDAR EN FAVORITOS ── */}
        <Pressable
          onPress={async () => {
            const next = !guardada;
            onGuardadaChange(next);
            try {
              if (next && lectura) {
                // Guardamos todas las secciones como JSON estructurado
                const secciones: {
                  primeraLectura?: { referencia: string; texto: string };
                  salmo?:          { referencia: string; texto: string };
                  evangelio:       { referencia: string; texto: string };
                } = {
                  evangelio: {
                    referencia: translateRefES(lectura.referencia),
                    texto:      lectura.texto,
                  },
                };
                if (lectura.primeraLectura) {
                  secciones.primeraLectura = {
                    referencia: translateRefES(lectura.primeraLectura.referencia),
                    texto:      lectura.primeraLectura.texto,
                  };
                }
                if (lectura.salmo) {
                  secciones.salmo = {
                    referencia: translateRefES(lectura.salmo.referencia),
                    texto:      lectura.salmo.texto,
                  };
                }
                await saveLecturaFavorita({
                  id:            favId,
                  fecha:         fechaDb,
                  titulo:        lectura.titulo,
                  fuente:        translateRefES(lectura.referencia),
                  textoCompleto: JSON.stringify(secciones),
                  notasUsuario:  null,
                });
              } else {
                await deleteLecturaFavorita(favId);
              }
            } catch {
              onGuardadaChange(!next);
            }
          }}
          style={({ pressed }) => ({
            opacity:   pressed ? 0.7 : 1,
            alignSelf: "flex-start",
            marginBottom: 28,
          })}
        >
          <View
            style={{
              flexDirection:     "row",
              alignItems:        "center",
              gap:               8,
              paddingVertical:   8,
              paddingHorizontal: 12,
              borderRadius:      10,
              backgroundColor:   guardada ? "rgba(255,125,125,0.12)" : "transparent",
              borderWidth:       1,
              borderColor:       guardada ? "rgba(255,125,125,0.3)" : "#2A2A2A",
            }}
          >
            <Ionicons
              name={guardada ? "bookmark" : "bookmark-outline"}
              size={16}
              color={guardada ? "#FF7D7D" : "#666666"}
            />
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize:   13,
                color:      guardada ? "#FF7D7D" : "#666666",
              }}
            >
              {guardada ? "Guardado en favoritos" : "Guardar en favoritos"}
            </Text>
          </View>
        </Pressable>

        {/* ── DIVISOR ── */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#1E1E1E",
            marginBottom:   20,
          }}
        />

        {/* ── SELECTOR DE MODO ── */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <View
          style={{
            flex:            1,
            flexDirection:   "row",
            backgroundColor: "#161616",
            borderRadius:    28,
            padding:         4,
          }}
        >
          {(["notas", "chat"] as ModoReflexion[]).map((m, i) => {
            const activo  = modo === m;
            const primero = i === 0;
            const ultimo  = i === 1;
            const r = 24;
            return (
              <View
                key={m}
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
                  onPress={() => setModo(m)}
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
                      numberOfLines={1}
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize:   12,
                        lineHeight: 12,
                        color:      activo ? "#FFFFFF" : "#666666",
                      }}
                    >
                      {m === "notas" ? "Mis notas" : "Reflexión guiada"}
                    </Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
        {modo === "chat" && mensajes.length > 0 && (
          <Pressable
            onPress={borrarHistorial}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={18} color="#555555" />
          </Pressable>
        )}
        </View>

        {/* ── MODO NOTAS ── */}
        {modo === "notas" && (
          <NotasPersonales lecturaFecha={fechaDb} />
        )}

        {/* ── MODO CHAT ── */}
        {modo === "chat" && (
          <>
            {mensajes.map((m) => <BurbujaChat key={m.id} mensaje={m} />)}
            {esperandoRateLimit && (
              <View style={{ alignItems: "center", paddingVertical: 14, paddingHorizontal: 20 }}>
                <Text
                  style={{
                    fontFamily: "CormorantGaramond_400Regular_Italic",
                    fontSize:   15,
                    color:      "#555555",
                    textAlign:  "center",
                    lineHeight: 22,
                  }}
                >
                  Hay muchas almas en oración ahora mismo.{"\n"}Tu reflexión llegará enseguida…
                </Text>
              </View>
            )}
            {escribiendo && textoStreaming
              ? <BurbujaChat mensaje={{ id: "streaming", role: "assistant", content: textoStreaming }} />
              : escribiendo ? <BurbujaEscribiendo /> : null
            }
            <View style={{ height: 12 }} />
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── INPUT BAR CHAT (solo en modo reflexión guiada) ── */}
      {modo === "chat" && (
        <ChatInputBar
          value={inputTexto}
          onChangeText={setInputTexto}
          onSend={enviar}
          enviando={escribiendo}
          deshabilitado={!lectura}
          insetBottom={insets.bottom}
        />
      )}
    </KeyboardAvoidingView>
  );
}
