import { create } from "zustand";

type Coordenadas = {
  latitud: number;
  longitud: number;
};

type Iglesia = {
  id: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  diocese?: string | null;
  telefono?: string | null;
  sitioWeb?: string | null;
};

type IglesiaStore = {
  iglesias: Iglesia[];
  iglesiaSeleccionada: Iglesia | null;
  ubicacionUsuario: Coordenadas | null;
  cargando: boolean;
  setIglesias: (iglesias: Iglesia[]) => void;
  setIglesiaSeleccionada: (iglesia: Iglesia | null) => void;
  setUbicacionUsuario: (coords: Coordenadas) => void;
  setCargando: (cargando: boolean) => void;
};

export const useIglesiaStore = create<IglesiaStore>((set) => ({
  iglesias: [],
  iglesiaSeleccionada: null,
  ubicacionUsuario: null,
  cargando: false,
  setIglesias: (iglesias) => set({ iglesias }),
  setIglesiaSeleccionada: (iglesia) => set({ iglesiaSeleccionada: iglesia }),
  setUbicacionUsuario: (coords) => set({ ubicacionUsuario: coords }),
  setCargando: (cargando) => set({ cargando }),
}));
