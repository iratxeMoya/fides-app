import { eq, ne, asc, desc, and } from "drizzle-orm";
import { db } from "./client";
import {
  iglesias,
  chatMensajes,
  lecturasFavoritas,
  type Iglesia,
  type IglesiaInsert,
  type ChatMensaje,
  type ChatMensajeInsert,
  type LecturaFavorita,
  type LecturaFavoritaInsert,
} from "./schema";

// ─── Iglesias ─────────────────────────────────────────────────────────────────

/**
 * Inserta o actualiza una iglesia (upsert por placeId / id).
 * Devuelve el id de la fila.
 */
export async function saveIglesia(data: IglesiaInsert): Promise<string> {
  await db
    .insert(iglesias)
    .values(data)
    .onConflictDoUpdate({
      target: iglesias.id,
      set: {
        nombre:    data.nombre,
        direccion: data.direccion,
        lat:       data.lat,
        lng:       data.lng,
        horarios:  data.horarios,
        updatedAt: data.updatedAt,
      },
    });
  return data.id;
}

/** Devuelve una iglesia por su id (placeId de Google), o null si no existe. */
export async function getIglesiaById(id: string): Promise<Iglesia | null> {
  const rows = await db
    .select()
    .from(iglesias)
    .where(eq(iglesias.id, id));
  return rows[0] ?? null;
}

// ─── Mensajes de chat ─────────────────────────────────────────────────────────

/** Persiste un mensaje de la conversación para una fecha litúrgica dada. */
export async function saveMensajeChat(data: ChatMensajeInsert): Promise<void> {
  await db.insert(chatMensajes).values(data);
}

/**
 * Devuelve los mensajes del chat IA para una lectura dada (excluye notas personales),
 * ordenados cronológicamente.
 */
export async function getMensajesChat(lecturaFecha: string): Promise<ChatMensaje[]> {
  return db
    .select()
    .from(chatMensajes)
    .where(
      and(
        eq(chatMensajes.lecturaFecha, lecturaFecha),
        ne(chatMensajes.role, "nota_personal")
      )
    )
    .orderBy(asc(chatMensajes.createdAt));
}

/** Devuelve las notas personales del usuario para una lectura, ordenadas cronológicamente. */
export async function getNotasPersonales(lecturaFecha: string): Promise<ChatMensaje[]> {
  return db
    .select()
    .from(chatMensajes)
    .where(
      and(
        eq(chatMensajes.lecturaFecha, lecturaFecha),
        eq(chatMensajes.role, "nota_personal")
      )
    )
    .orderBy(asc(chatMensajes.createdAt));
}

/** Actualiza el contenido de una nota personal. */
export async function updateNotaPersonal(id: string, content: string): Promise<void> {
  await db.update(chatMensajes).set({ content }).where(eq(chatMensajes.id, id));
}

/** Elimina una nota personal por su id. */
export async function deleteNotaPersonal(id: string): Promise<void> {
  await db.delete(chatMensajes).where(eq(chatMensajes.id, id));
}

// ─── Lecturas favoritas ───────────────────────────────────────────────────────

/** Devuelve todas las lecturas guardadas, ordenadas por fecha descendente. */
export async function getLecturasFavoritas(): Promise<LecturaFavorita[]> {
  return db
    .select()
    .from(lecturasFavoritas)
    .orderBy(desc(lecturasFavoritas.fecha));
}

/**
 * Guarda una lectura en favoritos.
 * Devuelve el id de la fila insertada.
 */
export async function saveLecturaFavorita(
  data: LecturaFavoritaInsert
): Promise<string> {
  await db.insert(lecturasFavoritas).values(data).onConflictDoNothing();
  return data.id;
}

/** Elimina una lectura de favoritos por su id. */
export async function deleteLecturaFavorita(id: string): Promise<void> {
  await db.delete(lecturasFavoritas).where(eq(lecturasFavoritas.id, id));
}

/** Devuelve una lectura guardada por su id, o null si no existe. */
export async function getLecturaFavoritaById(id: string): Promise<LecturaFavorita | null> {
  const rows = await db.select().from(lecturasFavoritas).where(eq(lecturasFavoritas.id, id));
  return rows[0] ?? null;
}

/** Actualiza las notas personales de una lectura guardada. */
export async function updateNotasLecturaFavorita(id: string, notas: string | null): Promise<void> {
  await db.update(lecturasFavoritas).set({ notasUsuario: notas }).where(eq(lecturasFavoritas.id, id));
}
