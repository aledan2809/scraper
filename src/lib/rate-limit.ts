/**
 * Simple in-memory rate limiting utility
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store requests per IP address
const rateLimitMap = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per hour per IP

/**
 * Get client IP address from Next.js request
 */
export function getClientIP(request: any): string {
  // Try various headers for IP detection
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-vercel-forwarded-for') ||
                     request.ip ||
                     'unknown';

  if (forwarded) {
    // x-forwarded-for can be a comma-separated list
    return forwarded.split(',')[0].trim();
  }

  return realIP || remoteAddr;
}

/**
 * Check if request should be rate limited
 */
export function isRateLimited(clientIP: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIP);

  if (!entry) {
    // First request from this IP
    rateLimitMap.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    });
    return false;
  }

  // Check if window has expired
  if (now > entry.resetTime) {
    // Reset the window
    rateLimitMap.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    });
    return false;
  }

  // Check if limit exceeded
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  // Increment counter
  entry.count++;
  rateLimitMap.set(clientIP, entry);
  return false;
}

/**
 * Get rate limit information for headers
 */
export function getRateLimitInfo(clientIP: string) {
  const entry = rateLimitMap.get(clientIP);

  if (!entry) {
    return {
      limit: MAX_REQUESTS_PER_WINDOW,
      remaining: MAX_REQUESTS_PER_WINDOW,
      resetTime: Date.now() + RATE_LIMIT_WINDOW_MS
    };
  }

  return {
    limit: MAX_REQUESTS_PER_WINDOW,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count),
    resetTime: entry.resetTime
  };
}

/**
 * Cleanup old entries periodically (optional optimization)
 */
export function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

// Auto-cleanup every 10 minutes
setInterval(cleanupExpiredEntries, 10 * 60 * 1000);