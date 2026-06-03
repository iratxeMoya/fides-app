import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getNotasPersonales,
  saveMensajeChat,
  updateNotaPersonal,
  deleteNotaPersonal,
} from "@/lib/db/queries";
import type { ChatMensaje } from "@/lib/db/schema";

// ─── Burbuja editable ─────────────────────────────────────────────────────────

function BurbujaEditable({
  nota,
  editando,
  editTexto,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  nota:         ChatMensaje;
  editando:     boolean;
  editTexto:    string;
  onStartEdit:  () => void;
  onEditChange: (t: string) => void;
  onSaveEdit:   () => void;
  onCancelEdit: () => void;
  onDelete:     () => void;
}) {
  if (editando) {
    return (
      <View style={{ marginBottom: 12, alignItems: "flex-end" }}>
        <View
          style={{
            width:                   "92%",
            backgroundColor:         "rgba(255,125,125,0.14)",
            borderRadius:            16,
            borderBottomRightRadius: 4,
            borderWidth:             1,
            borderColor:             "rgba(255,125,125,0.28)",
            paddingHorizontal:       14,
            paddingVertical:         12,
          }}
        >
          <TextInput
            value={editTexto}
            onChangeText={onEditChange}
            multiline
            autoFocus
            textAlignVertical="top"
            style={{
              color:      "#D4D4D4",
              fontFamily: "Inter_400Regular",
              fontSize:   14,
              lineHeight: 21,
              minHeight:  56,
            }}
          />
          <View
            style={{
              flexDirection:  "row",
              gap:            12,
              marginTop:      10,
              justifyContent: "flex-end",
              alignItems:     "center",
            }}
          >
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#664444" }}>
                Eliminar
              </Text>
            </Pressable>
            <View style={{ width: 1, height: 12, backgroundColor: "#333333" }} />
            <Pressable
              onPress={onCancelEdit}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#666666" }}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={onSaveEdit}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: "#FF7D7D" }}>
                Guardar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection:  "row",
        justifyContent: "flex-end",
        alignItems:     "flex-end",
        gap:            8,
        marginBottom:   10,
      }}
    >
      <Pressable
        onPress={onStartEdit}
        hitSlop={10}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginBottom: 6 })}
      >
        <Ionicons name="pencil-outline" size={13} color="#444444" />
      </Pressable>
      <View
        style={{
          maxWidth:                "82%",
          paddingHorizontal:       14,
          paddingVertical:         10,
          borderRadius:            16,
          borderBottomRightRadius: 4,
          backgroundColor:         "rgba(255,125,125,0.14)",
          borderWidth:             1,
          borderColor:             "rgba(255,125,125,0.28)",
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
          {nota.content}
        </Text>
      </View>
    </View>
  );
}

// ─── NotasPersonales ──────────────────────────────────────────────────────────

export function NotasPersonales({ lecturaFecha }: { lecturaFecha: string }) {
  const [notas,      setNotas]      = useState<ChatMensaje[]>([]);
  const [cargando,   setCargando]   = useState(true);
  const [inputTexto, setInputTexto] = useState("");
  const [editando,   setEditando]   = useState<string | null>(null);
  const [editTexto,  setEditTexto]  = useState("");

  useEffect(() => {
    if (!lecturaFecha) return;
    getNotasPersonales(lecturaFecha)
      .then((ns) => { setNotas(ns); setCargando(false); })
      .catch(() => setCargando(false));
  }, [lecturaFecha]);

  async function guardarNota() {
    const texto = inputTexto.trim();
    if (!texto) return;
    const nueva = {
      id:          `nota-${Date.now()}`,
      lecturaFecha,
      role:        "nota_personal" as const,
      content:     texto,
      createdAt:   new Date(),
    };
    await saveMensajeChat(nueva);
    setNotas((prev) => [...prev, nueva as ChatMensaje]);
    setInputTexto("");
  }

  async function guardarEdicion(id: string) {
    const texto = editTexto.trim();
    if (!texto) return;
    await updateNotaPersonal(id, texto);
    setNotas((prev) => prev.map((n) => (n.id === id ? { ...n, content: texto } : n)));
    setEditando(null);
  }

  async function eliminarNota(id: string) {
    await deleteNotaPersonal(id);
    setNotas((prev) => prev.filter((n) => n.id !== id));
    setEditando(null);
  }

  const puedeGuardar = inputTexto.trim().length > 0;

  return (
    <View>
      {/* Título */}
      <Text
        style={{
          fontFamily:   "CormorantGaramond_600SemiBold",
          fontSize:     20,
          color:        "#FFFFFF",
          marginBottom: 4,
        }}
      >
        Mis reflexiones
      </Text>
      <Text
        style={{
          fontFamily:   "Inter_400Regular",
          fontSize:     12,
          color:        "#555555",
          lineHeight:   18,
          marginBottom: 16,
        }}
      >
        Escribe tus pensamientos sobre la lectura de este día
      </Text>

      {/* Burbujas */}
      {cargando ? (
        <ActivityIndicator color="#FF7D7D" style={{ marginBottom: 12, alignSelf: "flex-start" }} />
      ) : (
        notas.map((n) => (
          <BurbujaEditable
            key={n.id}
            nota={n}
            editando={editando === n.id}
            editTexto={editTexto}
            onStartEdit={() => { setEditando(n.id); setEditTexto(n.content); }}
            onEditChange={setEditTexto}
            onSaveEdit={() => guardarEdicion(n.id)}
            onCancelEdit={() => setEditando(null)}
            onDelete={() => eliminarNota(n.id)}
          />
        ))
      )}

      {/* Input */}
      <View
        style={{
          flexDirection: "row",
          alignItems:    "center",
          gap:           10,
          marginTop:     notas.length > 0 ? 4 : 0,
        }}
      >
        <TextInput
          value={inputTexto}
          onChangeText={setInputTexto}
          placeholder="Escribe una reflexión..."
          placeholderTextColor="#444444"
          multiline
          textAlignVertical="top"
          style={{
            flex:              1,
            color:             "#D4D4D4",
            fontFamily:        "Inter_400Regular",
            fontSize:          14,
            lineHeight:        20,
            backgroundColor:   "#111111",
            borderRadius:      14,
            borderWidth:       1,
            borderColor:       "#2A2A2A",
            paddingHorizontal: 14,
            paddingVertical:   10,
            maxHeight:         120,
          }}
        />
        <Pressable
          onPress={guardarNota}
          disabled={!puedeGuardar}
          style={({ pressed }) => ({
            opacity: !puedeGuardar ? 0.45 : pressed ? 0.75 : 1,
          })}
        >
          <View
            style={{
              width:           40,
              height:          40,
              borderRadius:    20,
              backgroundColor: puedeGuardar ? "#FF7D7D" : "rgba(255,125,125,0.12)",
              borderWidth:     puedeGuardar ? 0 : 1,
              borderColor:     "rgba(255,125,125,0.45)",
              alignItems:      "center",
              justifyContent:  "center",
            }}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={puedeGuardar ? "#FFFFFF" : "#FF7D7D"}
            />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
