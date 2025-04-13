import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

// Initialize Redis client
let redis: Redis | undefined;
let globalRatelimit: Ratelimit | undefined;

try {
  // Only initialize if environment variables are available
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Create default rate limiter
    globalRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "10 s"),
      analytics: true,
      prefix: "ratelimit",
    });
  }
} catch (error) {
  console.error("Failed to initialize rate limiter:", error);
}

/**
 * Rate limit configurations for different API endpoints
 */
export const rateLimiters = {
  // Global rate limiter
  global: globalRatelimit,
  
  // More specific rate limiters
  transaction: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "10 s"),
    analytics: true,
    prefix: "ratelimit:transaction",
  }) : undefined,
  
  auth: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "30 s"),
    analytics: true,
    prefix: "ratelimit:auth",
  }) : undefined,
};

/**
 * Rate limiting middleware for API routes
 * @param req Next.js request
 * @param identifier Unique identifier for the client (e.g., userId, IP address)
 * @param limiter Rate limiter to use (defaults to global)
 * @returns NextResponse with 429 status if rate limited, undefined otherwise
 */
export async function rateLimitRequest(
  req: NextRequest,
  identifier: string,
  limiter: Ratelimit = globalRatelimit!
): Promise<NextResponse | undefined> {
  // If rate limiting is not configured or disabled, allow the request
  if (!limiter) return undefined;
  
  try {
    // Apply rate limiting
    const { success, limit, reset, remaining } = await limiter.limit(identifier);
    
    // Set rate limit headers
    const headers = {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    };
    
    // If rate limited, return 429 response
    if (!success) {
      return NextResponse.json(
        { 
          error: "Too many requests", 
          limit, 
          remaining, 
          reset: new Date(reset).toISOString() 
        },
        { status: 429, headers }
      );
    }
    
    // Request is allowed, return headers to be added to the response
    return undefined;
  } catch (error) {
    // Log error but allow request to proceed
    console.error("Rate limiting error:", error);
    return undefined;
  }
}

/**
 * Apply rate limiting to a handler function
 * @param handler API route handler
 * @param options Rate limiting options
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    identifier?: (req: NextRequest) => string | Promise<string>;
    limiter?: keyof typeof rateLimiters;
  } = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Get the appropriate rate limiter
      const limiter = options.limiter
        ? rateLimiters[options.limiter]
        : rateLimiters.global;
      
      if (!limiter) {
        return handler(req);
      }
      
      // Get client identifier
      const getIdentifier = options.identifier || ((req: NextRequest) => 
        req.headers.get('x-forwarded-for') || 
        req.cookies.get('userId')?.value || 
        'anonymous'
      );
      
      const identifier = await getIdentifier(req);
      
      // Apply rate limiting
      const rateLimitResponse = await rateLimitRequest(req, identifier, limiter);
      
      // If rate limited, return 429 response
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
      
      // Otherwise, proceed with the handler
      return handler(req);
    } catch (error) {
      // Error during rate limiting, proceed with handler
      console.error("Rate limit wrapper error:", error);
      return handler(req);
    }
  };
} 