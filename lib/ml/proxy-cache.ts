interface MlProxyCacheEntry {
  expiresAtMs: number;
  payload: unknown;
}

interface MlProxyCacheStore {
  entries: Map<string, MlProxyCacheEntry>;
}

declare global {
  var __mlProxyCacheStore: MlProxyCacheStore | undefined;
}

function getStore(): MlProxyCacheStore {
  if (!globalThis.__mlProxyCacheStore) {
    globalThis.__mlProxyCacheStore = { entries: new Map() };
  }
  return globalThis.__mlProxyCacheStore;
}

export function getCachedMlPayload<T>(key: string): T | null {
  const store = getStore();
  const entry = store.entries.get(key);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAtMs) {
    store.entries.delete(key);
    return null;
  }

  return entry.payload as T;
}

export function setCachedMlPayload(
  key: string,
  payload: unknown,
  ttlSeconds: number,
): void {
  const store = getStore();
  const expiresAtMs = Date.now() + ttlSeconds * 1000;
  store.entries.set(key, { payload, expiresAtMs });
}

