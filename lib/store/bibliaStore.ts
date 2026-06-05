import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface BibliaState {
  leidos: Record<string, number[]>;
  marcarLeido: (osis: string, cap: number) => void;
  desmarcarLeido: (osis: string, cap: number) => void;
}

export const useBibliaStore = create<BibliaState>()(
  persist(
    (set) => ({
      leidos: {},
      marcarLeido: (osis, cap) =>
        set((s) => {
          const caps = s.leidos[osis] ?? [];
          if (caps.includes(cap)) return s;
          return { leidos: { ...s.leidos, [osis]: [...caps, cap] } };
        }),
      desmarcarLeido: (osis, cap) =>
        set((s) => ({
          leidos: {
            ...s.leidos,
            [osis]: (s.leidos[osis] ?? []).filter((c) => c !== cap),
          },
        })),
    }),
    {
      name: "fides-biblia",
      storage: createJSONStorage(() => ({
        getItem:    (name)        => AsyncStorage.getItem(name).catch(() => null),
        setItem:    (name, value) => AsyncStorage.setItem(name, value).catch(() => {}),
        removeItem: (name)        => AsyncStorage.removeItem(name).catch(() => {}),
      })),
    }
  )
);
