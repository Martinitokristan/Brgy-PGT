// Simple in-memory rate limiter for API routes
// Tracks requests by a key (e.g. IP or email) within a sliding window

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check if a request is rate limited.
 * @param key    Unique identifier (e.g. "resend:user@example.com" or "forgot:192.168.1.1")
 * @param limit  Max number of requests allowed in the window
 * @param windowMs  Time window in milliseconds
 * @returns { limited: boolean, remaining: number, retryAfterMs: number }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // First request or window expired — start fresh
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (entry.count >= limit) {
    return {
      limited: true,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return { limited: false, remaining: limit - entry.count, retryAfterMs: 0 };
}
