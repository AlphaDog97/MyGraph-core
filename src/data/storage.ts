export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export class MemoryKeyValueStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

export function getBrowserStorage(): KeyValueStorage | null {
  if (typeof globalThis === "undefined") return null;
  const candidate = (globalThis as { localStorage?: KeyValueStorage }).localStorage;
  return candidate ?? null;
}

export function readStoredJson<T>(
  key: string,
  fallback: T,
  storage: KeyValueStorage | null = getBrowserStorage()
): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredJson(
  key: string,
  value: unknown,
  storage: KeyValueStorage | null = getBrowserStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in privacy mode or restricted browser contexts.
  }
}
