import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// ─── Tipos para columnas JSON ─────────────────────────────────────────────────

/** Horario de misa de una iglesia para un día de la semana */
export type HorarioMisa = {
  /** "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado" | "Domingo" */
  dia: string;
  /** Formato "HH:MM" — ej. ["08:00", "10:00", "12:00", "19:30"] */
  horas: string[];
  /**
   * true cuando el horario se infirió de un rango opening_hours (no de service_times exacto).
   * La UI puede mostrar "horario estimado" en este caso.
   */
  inferido?: boolean;
  /**
   * true para la misa vespertina del sábado que anticipa el precepto dominical
   * (misas.org day=7). Permite distinguirla de las misas ordinarias del sábado.
   */
  esVigilia?: boolean;
};

export type CategoriaLectura =
  | "filosofia"
  | "teologia"
  | "espiritualidad"
  | "apologetica";

export type ChatRole = "user" | "assistant" | "nota_personal";

// ─── Tabla: iglesias ──────────────────────────────────────────────────────────

export const iglesias = sqliteTable("iglesias", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  direccion: text("direccion").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  telefono: text("telefono"),
  web: text("web"),
  /** JSON serializado: HorarioMisa[] */
  horarios: text("horarios", { mode: "json" })
    .$type<HorarioMisa[]>()
    .notNull()
    .$defaultFn(() => []),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// ─── Tabla: lecturas_favoritas ────────────────────────────────────────────────

/** Lecturas del evangelio o textos litúrgicos guardados por el usuario */
export const lecturasFavoritas = sqliteTable(
  "lecturas_favoritas",
  {
    id: text("id").primaryKey(),
    /** Fecha del día litúrgico — "YYYY-MM-DD" */
    fecha: text("fecha").notNull(),
    /** Título del texto — ej. "Domingo IV de Cuaresma" */
    titulo: text("titulo").notNull(),
    /** Referencia bíblica o fuente — ej. "Jn 9:1-41" */
    fuente: text("fuente").notNull(),
    textoCompleto: text("texto_completo").notNull(),
    /** Notas personales del usuario; null si no ha escrito ninguna */
    notasUsuario: text("notas_usuario"),
  },
  (t) => [index("idx_lecturas_favoritas_fecha").on(t.fecha)]
);

// ─── Tabla: lecturas_recomendadas ─────────────────────────────────────────────

/** Biblioteca de lecturas recomendadas: filosofía, teología, espiritualidad... */
export const lecturasRecomendadas = sqliteTable("lecturas_recomendadas", {
  id: text("id").primaryKey(),
  titulo: text("titulo").notNull(),
  autor: text("autor").notNull(),
  /** Una de las cuatro categorías del dominio */
  categoria: text("categoria").$type<CategoriaLectura>().notNull(),
  descripcion: text("descripcion").notNull(),
  isbn: text("isbn"),
  imageUrl: text("image_url"),
  urlCompra: text("url_compra"),
  /** JSON serializado: string[] — etiquetas de búsqueda/filtrado */
  tags: text("tags", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => []),
});

// ─── Tabla: chat_mensajes ─────────────────────────────────────────────────────

/** Conversación del usuario con la IA sobre una lectura concreta */
export const chatMensajes = sqliteTable(
  "chat_mensajes",
  {
    id: text("id").primaryKey(),
    /** Fecha de la lectura sobre la que se reflexiona — "YYYY-MM-DD" */
    lecturaFecha: text("lectura_fecha").notNull(),
    role: text("role").$type<ChatRole>().notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("idx_chat_mensajes_lectura_fecha").on(t.lecturaFecha)]
);

// ─── Tipos inferidos desde el schema ─────────────────────────────────────────

export type Iglesia = typeof iglesias.$inferSelect;
export type IglesiaInsert = typeof iglesias.$inferInsert;

export type LecturaFavorita = typeof lecturasFavoritas.$inferSelect;
export type LecturaFavoritaInsert = typeof lecturasFavoritas.$inferInsert;

export type LecturaRecomendada = typeof lecturasRecomendadas.$inferSelect;
export type LecturaRecomendadaInsert = typeof lecturasRecomendadas.$inferInsert;

export type ChatMensaje = typeof chatMensajes.$inferSelect;
export type ChatMensajeInsert = typeof chatMensajes.$inferInsert;
