/**
 * In-memory fixed-window limiter for the login form.
 *
 * Deliberately simple: on serverless this is per-instance, so it slows a
 * naive brute force rather than stopping a distributed one. That's the right
 * trade for a single shop's admin login; a shared store (Upstash/Redis) is the
 * upgrade if this ever matters more.
 */

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfterSeconds: 0 };
  }

  entry.count += 1;

  if (entry.count > MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - entry.count,
    retryAfterSeconds: 0,
  };
}

/** Called after a successful login so a correct password clears the count. */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `login:${ip}`;
}
