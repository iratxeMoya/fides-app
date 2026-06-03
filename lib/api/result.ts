// ─── Result<T> ────────────────────────────────────────────────────────────────
// Patrón de error explícito: evita throw/catch en los módulos de API.
// Los llamadores comprueban `result.ok` antes de acceder a `result.data`.

export type Ok<T> = { readonly ok: true; readonly data: T };
export type Err = { readonly ok: false; readonly error: string; readonly code?: number };
export type Result<T> = Ok<T> | Err;

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

export function err(error: string, code?: number): Err {
  return { ok: false, error, code };
}

/**
 * Ejecuta `fn` y captura cualquier excepción, devolviendo un Result<T>.
 * Aporta un mensaje de contexto opcional para facilitar el diagnóstico.
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(context ? `[${context}] ${message}` : message);
  }
}

/** Extrae el valor si ok, o lanza el error como excepción (para uso en casos donde el caller ya maneja try/catch) */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.data;
  throw new Error(result.error);
}
