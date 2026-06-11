import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

const sqlite = openDatabaseSync("fides.db");

// Crear tablas si no existen (no hay sistema de migraciones)
sqlite.execSync(`
  CREATE TABLE IF NOT EXISTS iglesias (
    id TEXT PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    telefono TEXT,
    web TEXT,
    opening_hours TEXT,
    horarios TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS lecturas_favoritas (
    id TEXT PRIMARY KEY NOT NULL,
    fecha TEXT NOT NULL,
    titulo TEXT NOT NULL,
    fuente TEXT NOT NULL,
    texto_completo TEXT NOT NULL,
    notas_usuario TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_lecturas_favoritas_fecha
    ON lecturas_favoritas (fecha);

  CREATE TABLE IF NOT EXISTS lecturas_recomendadas (
    id TEXT PRIMARY KEY NOT NULL,
    titulo TEXT NOT NULL,
    autor TEXT NOT NULL,
    categoria TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    isbn TEXT,
    image_url TEXT,
    url_compra TEXT,
    tags TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS chat_mensajes (
    id TEXT PRIMARY KEY NOT NULL,
    lectura_fecha TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_chat_mensajes_lectura_fecha
    ON chat_mensajes (lectura_fecha);
`);

// Add columns introduced after the initial release (safe to run on existing DBs)
try {
  sqlite.execSync(`ALTER TABLE iglesias ADD COLUMN opening_hours TEXT;`);
  // Invalidate all cached rows so they re-fetch from OSM and populate opening_hours
  sqlite.execSync(`UPDATE iglesias SET updated_at = 0 WHERE opening_hours IS NULL;`);
} catch { /* column already exists — no action needed */ }

export const db = drizzle(sqlite, { schema });
