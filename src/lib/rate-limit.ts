export type LimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();

  return {
    take(key: string, now = Date.now()): LimitResult {
      const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
      if (recent.length >= limit) {
        const oldest = recent[0] ?? now;
        const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
        hits.set(key, recent);
        return { ok: false, retryAfterSeconds };
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 5000) {
        const first = hits.keys().next().value;
        if (first) hits.delete(first);
      }
      return { ok: true };
    },
  };
}
