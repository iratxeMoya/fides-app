import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import { Platform } from "react-native";

import { getDiasPreceptoDelAnio } from "@/constants/liturgical";
import type { Hora } from "@/lib/store/preferenciasStore";

const ID_ANGELUS = "fides-angelus";
const ID_LECTURA = "fides-lectura";
const PREFIX_PRECEPTO = "fides-precepto-";
const CHANNEL_ID = "fides-liturgico";

export function configurarHandlerNotificaciones(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Avisos litúrgicos",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

function content(
  title: string,
  body: string
): Notifications.NotificationContentInput {
  return {
    title,
    body,
    sound: true,
    ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
  };
}

// ─── Ángelus ──────────────────────────────────────────────────────────────────

export async function scheduleAngelus(hora: Hora): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID_ANGELUS).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: ID_ANGELUS,
    content: content("Ángelus", "El ángel del Señor anunció a María..."),
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: hora.h,
      minute: hora.m,
    },
  });
}

export async function cancelAngelus(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID_ANGELUS).catch(() => {});
}

// ─── Lectura del día ──────────────────────────────────────────────────────────

export async function scheduleLectura(hora: Hora): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID_LECTURA).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: ID_LECTURA,
    content: content(
      "Lectura del día",
      "La lectura del evangelio de hoy te espera en Fides."
    ),
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: hora.h,
      minute: hora.m,
    },
  });
}

export async function cancelLectura(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID_LECTURA).catch(() => {});
}

// ─── Días de precepto ─────────────────────────────────────────────────────────

function diasAvisoProximos(hora: Hora) {
  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const resultado: { fecha: Date; nombre: string; id: string }[] = [];

  for (let offset = 0; offset <= 1; offset++) {
    for (const precepto of getDiasPreceptoDelAnio(anioActual + offset)) {
      // Día anterior al precepto a la hora configurada
      const fecha = new Date(precepto.date);
      fecha.setDate(fecha.getDate() - 1);
      fecha.setHours(hora.h, hora.m, 0, 0);

      if (fecha > ahora) {
        const iso = precepto.date.toISOString().split("T")[0];
        resultado.push({ fecha, nombre: precepto.name, id: `${PREFIX_PRECEPTO}${iso}` });
      }
    }
  }

  return resultado;
}

export async function schedulePreceptos(hora: Hora): Promise<void> {
  // Cancelar los existentes
  const programadas = await Notifications.getAllScheduledNotificationsAsync().catch(() => [] as Notifications.NotificationRequest[]);
  await Promise.all(
    programadas
      .filter((n) => n.identifier.startsWith(PREFIX_PRECEPTO))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );

  // Programar próximos (~16 para dos años vista)
  for (const { fecha, nombre, id } of diasAvisoProximos(hora)) {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: content(
        "Día de precepto mañana",
        `Mañana es ${nombre}. Recuerda asistir a misa.`
      ),
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: fecha,
      },
    });
  }
}

export async function cancelPreceptos(): Promise<void> {
  const programadas = await Notifications.getAllScheduledNotificationsAsync().catch(() => [] as Notifications.NotificationRequest[]);
  await Promise.all(
    programadas
      .filter((n) => n.identifier.startsWith(PREFIX_PRECEPTO))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );
}

// ─── Inicialización al arranque ───────────────────────────────────────────────

export async function inicializarNotificaciones(state: {
  notificacionAngelus: boolean;
  notificacionPrecepto: boolean;
  notificacionLectura: boolean;
  horaAngelus: Hora;
  horaPrecepto: Hora;
  horaLectura: Hora;
}): Promise<void> {
  if (state.notificacionAngelus) await scheduleAngelus(state.horaAngelus);
  if (state.notificacionPrecepto) await schedulePreceptos(state.horaPrecepto);
  if (state.notificacionLectura) await scheduleLectura(state.horaLectura);
}
