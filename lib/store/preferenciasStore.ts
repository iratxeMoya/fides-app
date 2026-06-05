import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type PermisoNotificaciones = "unknown" | "granted" | "denied";

type NotificacionKey =
  | "notificacionAngelus"
  | "notificacionPrecepto"
  | "notificacionLectura";

export type HoraKey = "horaAngelus" | "horaPrecepto" | "horaLectura";

export type Hora = { h: number; m: number };

type PreferenciasState = {
  notificacionAngelus: boolean;
  notificacionPrecepto: boolean;
  notificacionLectura: boolean;
  horaAngelus: Hora;
  horaPrecepto: Hora;
  horaLectura: Hora;
  permisoNotificaciones: PermisoNotificaciones;
  _hasHydrated: boolean;
  setNotificacion: (key: NotificacionKey, value: boolean) => void;
  setHora: (key: HoraKey, hora: Hora) => void;
  setPermisoNotificaciones: (estado: PermisoNotificaciones) => void;
  setHasHydrated: (v: boolean) => void;
};

export const usePreferenciasStore = create<PreferenciasState>()(
  persist(
    (set) => ({
      notificacionAngelus: false,
      notificacionPrecepto: false,
      notificacionLectura: false,
      horaAngelus: { h: 12, m: 0 },
      horaPrecepto: { h: 18, m: 0 },
      horaLectura: { h: 8, m: 0 },
      permisoNotificaciones: "unknown",
      _hasHydrated: false,
      setNotificacion: (key, value) => set({ [key]: value }),
      setHora: (key, hora) => set({ [key]: hora }),
      setPermisoNotificaciones: (estado) =>
        set({ permisoNotificaciones: estado }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "fides-preferencias",
      storage: createJSONStorage(() => ({
        getItem: (name) => AsyncStorage.getItem(name).catch(() => null),
        setItem: (name, value) => AsyncStorage.setItem(name, value).catch(() => {}),
        removeItem: (name) => AsyncStorage.removeItem(name).catch(() => {}),
      })),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
