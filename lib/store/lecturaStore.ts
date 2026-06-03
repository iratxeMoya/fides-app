import { create } from "zustand";

type LecturaDelDia = {
  fecha: string;
  tiempoLiturgico: string;
  evangelio: string;
  evangelioRef: string;
  primeraLectura?: string;
  primeraLecturaRef?: string;
  salmo?: string;
  salmoRef?: string;
  color: string;
};

type LecturaStore = {
  lecturaDelDia: LecturaDelDia | null;
  cargando: boolean;
  error: string | null;
  setLecturaDelDia: (lectura: LecturaDelDia) => void;
  setCargando: (cargando: boolean) => void;
  setError: (error: string | null) => void;
};

export const useLecturaStore = create<LecturaStore>((set) => ({
  lecturaDelDia: null,
  cargando: false,
  error: null,
  setLecturaDelDia: (lectura) => set({ lecturaDelDia: lectura }),
  setCargando: (cargando) => set({ cargando }),
  setError: (error) => set({ error }),
}));
