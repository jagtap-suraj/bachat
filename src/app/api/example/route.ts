import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rateLimit";

/**
 * Example API route with rate limiting
 * This route will allow 10 requests per 10 seconds
 */
export const GET = withRateLimit(
  async () => {
    // Your API logic here
    return NextResponse.json({ message: "Hello, this is a rate-limited API!" });
  },
  {
    limiter: "transaction", // Use the transaction rate limiter (10 reqs per 10s)
    identifier: async (req) => {
      // Use a custom identifier function
      // Here we're using the user's IP, but you could use session ID, user ID, etc.
      return req.headers.get("x-forwarded-for") || "anonymous";
    }
  }
); 