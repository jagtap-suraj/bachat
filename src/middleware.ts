import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);

// Define API routes that should be rate limited
const isApiRoute = createRouteMatcher([
  "/api/(.*)",
]);

// Initialize Redis client
// You'll need to add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your .env file
let redis: Redis | undefined;
let ratelimit: Ratelimit | undefined;

try {
  // Only initialize if environment variables are available
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Create rate limiter that allows 20 requests per 10 seconds
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "10 s"),
      analytics: true,
    });
  }
} catch (error) {
  console.error("Failed to initialize rate limiter:", error);
}

/**
 * Middleware function that handles authentication and rate limiting
 */
export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Handle authentication for protected routes
  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }

  // Apply rate limiting to API routes
  if (isApiRoute(req) && ratelimit) {
    // Use IP address as identifier, or userId if available
    const identifier = userId || req.headers.get('x-forwarded-for') || 'anonymous';
    
    try {
      const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
      
      // If rate limit exceeded, return 429 Too Many Requests
      if (!success) {
        return NextResponse.json(
          { 
            error: "Too many requests", 
            limit, 
            remaining, 
            reset: new Date(reset).toISOString() 
          },
          { 
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
            }
          }
        );
      }
    } catch (error) {
      // If rate limiting fails, log error but allow request to proceed
      console.error("Rate limiting error:", error);
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
