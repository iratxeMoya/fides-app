// ─── TTL constants ────────────────────────────────────────────────────────────

export const TTL_5M  =  5 * 60 * 1_000;
export const TTL_1H  = 60 * 60 * 1_000;
export const TTL_24H = 24 * 60 * 60 * 1_000;

// ─── MemoryCache ──────────────────────────────────────────────────────────────

type Entry<T> = { data: T; expiresAt: number };

export class MemoryCache {
  private readonly store = new Map<string, Entry<unknown>>();

  /** Devuelve el valor cacheado o null si expiró / no existe */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = TTL_1H): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  /**
   * Patrón get-or-set: devuelve el valor cacheado si existe,
   * de lo contrario ejecuta `fn`, cachea el resultado y lo devuelve.
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs: number = TTL_1H
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await fn();
    this.set(key, fresh, ttlMs);
    return fresh;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Invalida todas las claves que comienzan con el prefijo dado */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

// Singleton compartido por todos los módulos de API
export const apiCache = new MemoryCache();
