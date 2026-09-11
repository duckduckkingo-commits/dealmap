// In-memory token-bucket rate limiter (per-instance). For multi-instance prod, use Redis/Upstash.
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult { ok: boolean; remaining: number; resetAt: number; }

export function rateLimit(key: string, limit = 20, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (entry.count >= limit) return { ok: false, remaining: 0, resetAt: entry.resetAt };
  entry.count += 1;
  return { ok: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export function clientKey(req: Request, route: string): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return `${route}:${ip}`;
}

export const LIMITS: Record<string, { limit: number; windowMs: number }> = {
  login: { limit: 10, windowMs: 10 * 60_000 },
  register: { limit: 10, windowMs: 60 * 60_000 },
  setup: { limit: 5, windowMs: 10 * 60_000 },
  contribute: { limit: 30, windowMs: 60 * 60_000 },
  upload: { limit: 20, windowMs: 60 * 60_000 },
  reset: { limit: 5, windowMs: 60 * 60_000 },
};
