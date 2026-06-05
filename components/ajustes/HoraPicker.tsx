import { useEffect, useState } from "react";
import { View, Text, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Hora } from "@/lib/store/preferenciasStore";

type Props = {
  visible: boolean;
  label: string;
  horaInicial: Hora;
  onConfirmar: (hora: Hora) => void;
  onCancelar: () => void;
};

function NumberWheel({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value).padStart(2, "0"));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value).padStart(2, "0"));
  }, [value, focused]);

  function commit(raw: string) {
    setFocused(false);
    const n = parseInt(raw, 10);
    const clamped = isNaN(n) ? value : Math.min(Math.max(0, n), max);
    onChange(clamped);
    setText(String(clamped).padStart(2, "0"));
  }

  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Pressable
        onPress={() => onChange((value + 1) % (max + 1))}
        style={{ padding: 10 }}
        android_ripple={null}
      >
        <Ionicons name="chevron-up" size={22} color="#555555" />
      </Pressable>

      <View
        style={{
          width: 84,
          height: 72,
          backgroundColor: "#1A1A1A",
          borderWidth: 1,
          borderColor: focused ? "#FF7D7D" : "#2A2A2A",
          borderRadius: 14,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TextInput
          value={text}
          onChangeText={(t) => setText(t.replace(/[^0-9]/g, "").slice(0, 2))}
          onFocus={() => setFocused(true)}
          onBlur={() => commit(text)}
          onSubmitEditing={() => commit(text)}
          keyboardType="numeric"
          maxLength={2}
          selectTextOnFocus
          style={{
            fontFamily: "CormorantGaramond_600SemiBold",
            fontSize: 42,
            color: "#FFFFFF",
            textAlign: "center",
            width: "100%",
            padding: 0,
            includeFontPadding: false,
          }}
        />
      </View>

      <Pressable
        onPress={() => onChange((value - 1 + max + 1) % (max + 1))}
        style={{ padding: 10 }}
        android_ripple={null}
      >
        <Ionicons name="chevron-down" size={22} color="#555555" />
      </Pressable>
    </View>
  );
}

export function HoraPicker({
  visible,
  label,
  horaInicial,
  onConfirmar,
  onCancelar,
}: Props) {
  const insets = useSafeAreaInsets();
  const [h, setH] = useState(horaInicial.h);
  const [m, setM] = useState(horaInicial.m);

  useEffect(() => {
    if (visible) {
      setH(horaInicial.h);
      setM(horaInicial.m);
    }
  }, [visible, horaInicial.h, horaInicial.m]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <Pressable
        style={{ flex: 1, backgroundColor: "#00000088" }}
        onPress={onCancelar}
      />
      <View
        style={{
          backgroundColor: "#111111",
          borderTopWidth: 1,
          borderTopColor: "#2A2A2A",
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 12,
        }}
      >
        {/* Pill */}
        <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 20 }}>
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#2A2A2A",
            }}
          />
        </View>

        {/* Label */}
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 11,
            letterSpacing: 1.3,
            color: "#FF7D7D",
            textTransform: "uppercase",
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          {label}
        </Text>

        {/* Ruedas */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <NumberWheel value={h} max={23} onChange={setH} />

          <Text
            style={{
              fontFamily: "CormorantGaramond_600SemiBold",
              fontSize: 42,
              color: "#333333",
              marginTop: -8,
            }}
          >
            :
          </Text>

          <NumberWheel value={m} max={59} onChange={setM} />
        </View>

        {/* Botones */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={onCancelar}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#2A2A2A",
              alignItems: "center",
            }}
            android_ripple={null}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 15,
                color: "#888888",
              }}
            >
              Cancelar
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onConfirmar({ h, m })}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: "#FF7D7D1A",
              borderWidth: 1,
              borderColor: "#FF7D7D33",
              alignItems: "center",
            }}
            android_ripple={null}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                color: "#FF7D7D",
              }}
            >
              Listo
            </Text>
          </Pressable>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
