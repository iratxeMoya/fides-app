/**
 * Tests de la capa de persistencia local (Drizzle + expo-sqlite).
 *
 * Se mockea el cliente Drizzle para evitar depender de una base de datos real.
 * Los mocks simulan el comportamiento del query builder de Drizzle (thenable chains).
 */

import {
  saveIglesia,
  getIglesiaById,
  saveMensajeChat,
  getMensajesChat,
  getLecturasFavoritas,
  saveLecturaFavorita,
} from "@/lib/db/queries";
import { iglesiaInsertFixture } from "../fixtures/iglesiaFixture";
import { lecturaFixture } from "../fixtures/lecturaFixture";

// ─── Mock del cliente Drizzle ─────────────────────────────────────────────────
// Usamos un estado mutable accesible desde los tests.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _state: { rows: any[]; writeError: Error | null } = {
  rows:       [],
  writeError: null,
};

jest.mock("@/lib/db/client", () => {
  // Cadena thenable para operaciones SELECT
  const selectChain: any = {
    from:    () => selectChain,
    where:   () => selectChain,
    orderBy: () => selectChain,
    then(resolve: any, reject?: any) {
      return Promise.resolve(_state.rows).then(resolve, reject);
    },
    catch(onRejected: any) {
      return Promise.resolve(_state.rows).catch(onRejected);
    },
  };

  // Cadena thenable para operaciones INSERT / DELETE
  const writeChain: any = {
    values:             () => writeChain,
    onConflictDoUpdate: () => writeChain,
    where:              () => writeChain,
    then(resolve: any, reject?: any) {
      if (_state.writeError) {
        return Promise.reject(_state.writeError).then(resolve, reject);
      }
      return Promise.resolve(undefined).then(resolve, reject);
    },
    catch(onRejected: any) {
      if (_state.writeError) {
        return Promise.reject(_state.writeError).catch(onRejected);
      }
      return Promise.resolve(undefined).catch(onRejected);
    },
  };

  return {
    db: {
      select: () => selectChain,
      insert: () => writeChain,
      delete: () => writeChain,
    },
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  _state.rows       = [];
  _state.writeError = null;
});

// ─── saveIglesia ──────────────────────────────────────────────────────────────

describe("saveIglesia", () => {
  test("resuelve con el id de la iglesia insertada", async () => {
    const id = await saveIglesia(iglesiaInsertFixture);
    expect(id).toBe(iglesiaInsertFixture.id);
  });

  test("insertar dos veces el mismo placeId no lanza error (upsert)", async () => {
    await expect(saveIglesia(iglesiaInsertFixture)).resolves.toBe(iglesiaInsertFixture.id);
    await expect(saveIglesia(iglesiaInsertFixture)).resolves.toBe(iglesiaInsertFixture.id);
  });
});

// ─── getIglesiaById ───────────────────────────────────────────────────────────

describe("getIglesiaById", () => {
  test("devuelve null cuando la iglesia no existe en la base de datos", async () => {
    _state.rows = [];
    const result = await getIglesiaById("id-que-no-existe");
    expect(result).toBeNull();
  });

  test("devuelve la iglesia cuando existe", async () => {
    _state.rows = [iglesiaInsertFixture];
    const result = await getIglesiaById(iglesiaInsertFixture.id);
    expect(result).not.toBeNull();
    expect(result?.nombre).toBe(iglesiaInsertFixture.nombre);
  });
});

// ─── saveMensajeChat ──────────────────────────────────────────────────────────

describe("saveMensajeChat", () => {
  test("persiste correctamente role y content sin lanzar error", async () => {
    await expect(
      saveMensajeChat({
        id:           "msg-001",
        lecturaFecha: "2025-04-27",
        role:         "user",
        content:      "¿Qué significa que Jesús sea el buen Pastor?",
        createdAt:    new Date(2025, 3, 27, 10, 0),
      })
    ).resolves.toBeUndefined();
  });

  test("guarda un mensaje de asistente sin error", async () => {
    await expect(
      saveMensajeChat({
        id:           "msg-002",
        lecturaFecha: "2025-04-27",
        role:         "assistant",
        content:      "El buen Pastor cuida de sus ovejas con amor gratuito.",
        createdAt:    new Date(2025, 3, 27, 10, 1),
      })
    ).resolves.toBeUndefined();
  });
});

// ─── getMensajesChat ──────────────────────────────────────────────────────────

describe("getMensajesChat", () => {
  test("devuelve los mensajes en orden cronológico (el más antiguo primero)", async () => {
    const t1 = new Date(2025, 3, 27, 10, 0);
    const t2 = new Date(2025, 3, 27, 10, 5);

    _state.rows = [
      { id: "msg-001", lecturaFecha: "2025-04-27", role: "user",      content: "Pregunta",   createdAt: t1 },
      { id: "msg-002", lecturaFecha: "2025-04-27", role: "assistant", content: "Respuesta",  createdAt: t2 },
    ];

    const mensajes = await getMensajesChat("2025-04-27");
    expect(mensajes).toHaveLength(2);
    expect(mensajes[0].role).toBe("user");
    expect(mensajes[1].role).toBe("assistant");
  });

  test("devuelve array vacío si no hay mensajes para esa fecha", async () => {
    _state.rows = [];
    const mensajes = await getMensajesChat("2025-01-01");
    expect(mensajes).toHaveLength(0);
  });
});

// ─── getLecturasFavoritas ─────────────────────────────────────────────────────

describe("getLecturasFavoritas", () => {
  test("devuelve array vacío cuando la tabla está vacía", async () => {
    _state.rows = [];
    const favoritas = await getLecturasFavoritas();
    expect(favoritas).toHaveLength(0);
  });

  test("devuelve las lecturas guardadas cuando existen", async () => {
    _state.rows = [
      {
        id:            "2025-04-27-evangelio",
        fecha:         "2025-04-27",
        titulo:        lecturaFixture.titulo,
        fuente:        lecturaFixture.referencia,
        textoCompleto: lecturaFixture.texto,
        notasUsuario:  null,
      },
    ];

    const favoritas = await getLecturasFavoritas();
    expect(favoritas).toHaveLength(1);
    expect(favoritas[0].titulo).toBe(lecturaFixture.titulo);
  });
});

// ─── saveLecturaFavorita ──────────────────────────────────────────────────────

describe("saveLecturaFavorita", () => {
  test("devuelve el id de la lectura guardada", async () => {
    const id = await saveLecturaFavorita({
      id:            "2025-04-27-evangelio",
      fecha:         "2025-04-27",
      titulo:        lecturaFixture.titulo,
      fuente:        lecturaFixture.referencia,
      textoCompleto: lecturaFixture.texto,
      notasUsuario:  null,
    });
    expect(id).toBe("2025-04-27-evangelio");
  });
});
