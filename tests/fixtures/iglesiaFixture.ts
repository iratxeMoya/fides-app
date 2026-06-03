import type { IglesiaBusqueda, IglesiaDetalle } from "@/lib/api/iglesias";
import type { IglesiaInsert } from "@/lib/db/schema";

/** Fixtures realistas de la Catedral de la Almudena, Madrid */
export const iglesiaBasicaFixture: IglesiaBusqueda = {
  id:           "ChIJSRl_T5AoQg0Rf0vqOL2R_vs",
  nombre:       "Catedral de la Almudena",
  direccion:    "C/ Bailén, s/n, 28071 Madrid",
  lat:          40.4150,
  lng:          -3.7143,
  abiertaAhora: true,
};

export const iglesiaDetalleFixture: IglesiaDetalle = {
  id:        "ChIJSRl_T5AoQg0Rf0vqOL2R_vs",
  nombre:    "Catedral de la Almudena",
  direccion: "C/ Bailén, s/n, 28071 Madrid",
  lat:       40.4150,
  lng:       -3.7143,
  telefono:  "+34 913 65 22 00",
  web:       "https://www.catedraldelaalmudena.es",
  horarios: [
    { dia: "Lunes",     horas: ["09:00", "12:00", "19:00"] },
    { dia: "Martes",    horas: ["09:00", "12:00", "19:00"] },
    { dia: "Miércoles", horas: ["09:00", "12:00", "19:00"] },
    { dia: "Jueves",    horas: ["09:00", "12:00", "19:00"] },
    { dia: "Viernes",   horas: ["09:00", "12:00", "19:00"] },
    { dia: "Sábado",    horas: ["10:00", "12:00", "18:00", "20:00"] },
    { dia: "Domingo",   horas: ["10:00", "12:00", "13:00", "18:00", "20:00"] },
  ],
  fotosRefs: ["photo_ref_almudena_1", "photo_ref_almudena_2"],
};

export const iglesiaInsertFixture: IglesiaInsert = {
  id:        "ChIJSRl_T5AoQg0Rf0vqOL2R_vs",
  nombre:    "Catedral de la Almudena",
  direccion: "C/ Bailén, s/n, 28071 Madrid",
  lat:       40.4150,
  lng:       -3.7143,
  telefono:  "+34 913 65 22 00",
  web:       "https://www.catedraldelaalmudena.es",
  horarios: [
    { dia: "Domingo", horas: ["10:00", "12:00", "18:00"] },
  ],
  updatedAt: new Date(2025, 3, 20),
};
