import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  maxRequests: number; // Max requests per window
  windowMs: number; // Time window in milliseconds
}

// In-memory store for rate limiting (works in development)
// For production at scale, consider using Upstash Redis: https://upstash.com/blog/nextjs-rate-limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

export function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  // Use the first available IP
  const ip = cfConnectingIp || realIp || forwardedFor?.split(",")[0]?.trim() || "unknown";

  return ip;
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
): { success: boolean; remaining: number; resetIn: number } {
  cleanup();

  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  // If no record exists or window has expired, create new record
  if (!record || record.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  // Increment count
  record.count++;

  // Check if over limit
  if (record.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    };
  }

  return {
    success: true,
    remaining: config.maxRequests - record.count,
    resetIn: record.resetTime - now,
  };
}

// Higher-order function to wrap API routes with rate limiting
export function withRateLimit(
  handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
) {
  return async (request: NextRequest, ...args: unknown[]) => {
    const identifier = getClientIdentifier(request);
    const result = rateLimit(identifier, config);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          retryAfter: Math.ceil(result.resetIn / 1000)
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(result.resetIn / 1000)),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(result.resetIn / 1000)),
          }
        }
      );
    }

    const response = await handler(request, ...args);

    // Add rate limit headers to response
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetIn / 1000)));

    return response;
  };
}

// Preset configurations for different use cases
export const rateLimitPresets = {
  // Standard API routes: 100 requests per minute
  standard: { maxRequests: 100, windowMs: 60000 },

  // Strict: 20 requests per minute (for sensitive operations)
  strict: { maxRequests: 20, windowMs: 60000 },

  // Relaxed: 200 requests per minute (for read-heavy routes)
  relaxed: { maxRequests: 200, windowMs: 60000 },

  // Auth routes: 10 requests per minute
  auth: { maxRequests: 10, windowMs: 60000 },
};
