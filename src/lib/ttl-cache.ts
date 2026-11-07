export function createTtlCache<T>(ttlMs: number, maxEntries = 2000) {
  const entries = new Map<string, { expires: number; value: T }>();

  return {
    get(key: string, now = Date.now()): T | undefined {
      const hit = entries.get(key);
      if (!hit) return undefined;
      if (hit.expires <= now) {
        entries.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key: string, value: T, now = Date.now()) {
      if (entries.size >= maxEntries) {
        const first = entries.keys().next().value;
        if (first) entries.delete(first);
      }
      entries.set(key, { expires: now + ttlMs, value });
    },
  };
}
