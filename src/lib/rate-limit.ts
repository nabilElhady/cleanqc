import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// 1. Initialize Redis connection
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://dummy-url-for-build.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'dummy-token',
})

// 2. Define Aggressive Public Limits (e.g., Webhooks, Login attempts)
// 10 requests per 10 seconds per IP
const publicRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: '@upstash/ratelimit/public',
})

// 3. Define Generous Tenant/Org Limits (e.g., Dashboard actions, bulk job creation)
// 100 requests per 10 seconds per Organization
const tenantRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '10 s'),
  analytics: true,
  prefix: '@upstash/ratelimit/tenant',
})

/**
 * Validates the rate limit and automatically returns a 429 Response if exceeded.
 * 
 * @param request The Next.js API Request
 * @param orgId Optional: If provided, limits by Organization ID. If null, limits by IP.
 * @returns NextResponse (429) if blocked, otherwise null.
 */
export async function enforceRateLimit(request: NextRequest | Request, orgId?: string | null): Promise<NextResponse | null> {
  // If we don't have the real env variables (like during local dev before setting it up), skip to avoid breaking app
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return null;
  }

  try {
    let success = true;
    let limit = 0;
    let reset = 0;
    let remaining = 0;

    if (orgId) {
      // Authenticated Route: Limit by Tenant
      const result = await tenantRateLimit.limit(`tenant_${orgId}`);
      success = result.success;
      limit = result.limit;
      reset = result.reset;
      remaining = result.remaining;
    } else {
      // Public Route: Limit by IP Address
      const clientIp = ('ip' in request ? request.ip : undefined) || request.headers.get('x-forwarded-for') || 'anonymous_ip';
      const result = await publicRateLimit.limit(`ip_${clientIp}`);
      success = result.success;
      limit = result.limit;
      reset = result.reset;
      remaining = result.remaining;
    }

    if (!success) {
      console.warn(`[SECURITY] Rate limit exceeded for ${orgId ? `Tenant: ${orgId}` : 'IP'}`)
      return NextResponse.json(
        { error: 'Too Many Requests. Please slow down.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString()
          }
        }
      )
    }

    return null; // Passed validation

  } catch (error) {
    // Failsafe: If Redis goes down, we FAIL OPEN so we don't accidentally block legitimate traffic
    console.error('[SECURITY] Rate Limiter Connection Error:', error)
    return null;
  }
}
