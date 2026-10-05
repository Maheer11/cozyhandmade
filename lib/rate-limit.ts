// Best-effort per-key rate limiting for small public endpoints. In-memory,
// so it resets on a cold start and isn't shared between server instances;
// it stops one client hammering one instance, not a distributed attack.

export function createRateLimiter(maxPerWindow: number, windowMs: number) {
  const recentByKey = new Map<string, number[]>();
  return {
    /** Records an attempt; true if this key is over the limit (attempt not counted). */
    isLimited(key: string, now: number = Date.now()): boolean {
      const recent = (recentByKey.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= maxPerWindow) {
        recentByKey.set(key, recent);
        return true;
      }
      recent.push(now);
      recentByKey.set(key, recent);
      return false;
    },
    reset(): void {
      recentByKey.clear();
    },
  };
}
