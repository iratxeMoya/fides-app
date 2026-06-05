import { View, Text, ScrollView, Alert, Linking } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

import {
  usePreferenciasStore,
  type HoraKey,
  type Hora,
} from "@/lib/store/preferenciasStore";
import { SeccionAjuste } from "@/components/ajustes/SeccionAjuste";
import { FilaAjuste } from "@/components/ajustes/FilaAjuste";
import { HoraPicker } from "@/components/ajustes/HoraPicker";
import {
  scheduleAngelus,
  cancelAngelus,
  scheduleLectura,
  cancelLectura,
  schedulePreceptos,
  cancelPreceptos,
} from "@/lib/notifications/scheduling";

const ACCENT = "#FF7D7D";
const VERSION = Constants.expoConfig?.version ?? "—";

function formatHora(hora: Hora): string {
  return `${String(hora.h).padStart(2, "0")}:${String(hora.m).padStart(2, "0")}`;
}

async function solicitarPermisoNotificaciones(): Promise<boolean> {
  const { status: actual } = await Notifications.getPermissionsAsync();
  if (actual === "granted") return true;
  const { status: nuevo } = await Notifications.requestPermissionsAsync();
  return nuevo === "granted";
}

type PickerConfig = { key: HoraKey; label: string; hora: Hora };

export default function AjustesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    notificacionAngelus,
    notificacionPrecepto,
    notificacionLectura,
    horaAngelus,
    horaPrecepto,
    horaLectura,
    permisoNotificaciones,
    setNotificacion,
    setHora,
    setPermisoNotificaciones,
  } = usePreferenciasStore();

  const [pickerConfig, setPickerConfig] = useState<PickerConfig | null>(null);

  function abrirPicker(key: HoraKey, label: string, hora: Hora) {
    setPickerConfig({ key, label, hora });
  }

  const schedulers: Record<
    "notificacionAngelus" | "notificacionPrecepto" | "notificacionLectura",
    { schedule: (h: Hora) => Promise<void>; cancel: () => Promise<void>; horaKey: HoraKey }
  > = {
    notificacionAngelus:  { schedule: scheduleAngelus,  cancel: cancelAngelus,   horaKey: "horaAngelus"  },
    notificacionPrecepto: { schedule: schedulePreceptos, cancel: cancelPreceptos, horaKey: "horaPrecepto" },
    notificacionLectura:  { schedule: scheduleLectura,   cancel: cancelLectura,   horaKey: "horaLectura"  },
  };

  async function manejarToggle(
    key: "notificacionAngelus" | "notificacionPrecepto" | "notificacionLectura",
    valor: boolean
  ) {
    if (!valor) {
      setNotificacion(key, false);
      schedulers[key].cancel().catch(() => {});
      return;
    }
    const concedido = await solicitarPermisoNotificaciones();
    if (concedido) {
      setPermisoNotificaciones("granted");
      setNotificacion(key, true);
      const hora = usePreferenciasStore.getState()[schedulers[key].horaKey];
      schedulers[key].schedule(hora).catch(() => {});
    } else {
      setPermisoNotificaciones("denied");
      setNotificacion(key, false);
      Alert.alert(
        "Permiso necesario",
        "Para recibir recordatorios, activa las notificaciones de Fides en los ajustes del sistema.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Abrir ajustes", onPress: () => Linking.openSettings() },
        ]
      );
    }
  }

  const sinPermiso = permisoNotificaciones === "denied";

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 16 }}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <Text
            style={{
              fontFamily: "CormorantGaramond_300Light_Italic",
              fontSize: 52,
              letterSpacing: 6,
              color: "#FFFFFF",
              lineHeight: 56,
            }}
          >
            FIDES
          </Text>
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 11,
              letterSpacing: 1.5,
              color: "#888888",
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            Configuración
          </Text>
        </View>

        {/* Banner de permiso denegado */}
        {sinPermiso && (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 20,
              backgroundColor: "#1A1010",
              borderWidth: 1,
              borderColor: "#FF7D7D33",
              borderRadius: 12,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Ionicons name="notifications-off-outline" size={18} color={ACCENT} />
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: ACCENT,
                flex: 1,
                lineHeight: 18,
              }}
            >
              Las notificaciones están desactivadas en los ajustes del sistema.
            </Text>
          </View>
        )}

        {/* Notificaciones */}
        <SeccionAjuste titulo="Notificaciones">
          <FilaAjuste
            icono="alarm-outline"
            label="Ángelus"
            subtitulo={`Cada día a las ${formatHora(horaAngelus)}`}
            tipo="toggle"
            valor={notificacionAngelus}
            onCambio={(v) => manejarToggle("notificacionAngelus", v)}
            onSubtituloPress={() =>
              abrirPicker("horaAngelus", "Ángelus · Hora de aviso", horaAngelus)
            }
            iconColor={notificacionAngelus ? ACCENT : "#555555"}
          />
          <FilaAjuste
            icono="calendar-outline"
            label="Día de precepto"
            subtitulo={`Aviso a las ${formatHora(horaPrecepto)} del día anterior`}
            tipo="toggle"
            valor={notificacionPrecepto}
            onCambio={(v) => manejarToggle("notificacionPrecepto", v)}
            onSubtituloPress={() =>
              abrirPicker("horaPrecepto", "Precepto · Hora de aviso", horaPrecepto)
            }
            iconColor={notificacionPrecepto ? ACCENT : "#555555"}
          />
          <FilaAjuste
            icono="book-outline"
            label="Lectura del día"
            subtitulo={`Cada mañana a las ${formatHora(horaLectura)}`}
            tipo="toggle"
            valor={notificacionLectura}
            onCambio={(v) => manejarToggle("notificacionLectura", v)}
            onSubtituloPress={() =>
              abrirPicker("horaLectura", "Lectura · Hora de aviso", horaLectura)
            }
            iconColor={notificacionLectura ? ACCENT : "#555555"}
            ultimo
          />
        </SeccionAjuste>
      </ScrollView>

      {/* Acerca de — fijo en la parte inferior */}
      <SeccionAjuste titulo="Acerca de">
        <FilaAjuste
          icono="information-circle-outline"
          label="Iratxe Moya"
          subtitulo="Sugerencias y contacto"
          tipo="accion"
          onPress={() => router.push("/acerca-de")}
          ultimo
        />
      </SeccionAjuste>
      <View style={{ height: insets.bottom + 12 }} />

      {/* Picker de hora */}
      {pickerConfig && (
        <HoraPicker
          visible
          label={pickerConfig.label}
          horaInicial={pickerConfig.hora}
          onConfirmar={(hora) => {
            setHora(pickerConfig.key, hora);
            // Reprogramar la notificación correspondiente si está activa
            const notifKey = ({
              horaAngelus: "notificacionAngelus",
              horaPrecepto: "notificacionPrecepto",
              horaLectura: "notificacionLectura",
            } as const)[pickerConfig.key];
            const state = usePreferenciasStore.getState();
            if (state[notifKey]) {
              schedulers[notifKey].schedule(hora).catch(() => {});
            }
            setPickerConfig(null);
          }}
          onCancelar={() => setPickerConfig(null)}
        />
      )}
    </View>
  );
}
