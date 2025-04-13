import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rateLimit";
import { auth } from "@clerk/nextjs/server";

/**
 * Transaction API route with rate limiting and authentication
 * This route will allow 10 requests per 10 seconds per user
 */
export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      // Get authenticated user
      const { userId } = await auth();
      
      if (!userId) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      
      // Parse request body
      const body = await req.json();
      
      // Your transaction creation logic here
      // This is just a placeholder
      return NextResponse.json({
        success: true,
        message: "Transaction created",
        data: { id: "example-id", ...body }
      });
    } catch (error) {
      console.error("Transaction API error:", error);
      return NextResponse.json(
        { error: "Failed to process transaction" },
        { status: 500 }
      );
    }
  },
  {
    limiter: "transaction", // Use the transaction rate limiter (10 reqs per 10s)
    identifier: async () => {
      // Use the user ID as the rate limit identifier
      const { userId } = await auth();
      return userId || "anonymous";
    }
  }
);

/**
 * Get transactions with rate limiting
 */
export const GET = withRateLimit(
  async () => {
    try {
      // Get authenticated user
      const { userId } = await auth();
      
      if (!userId) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      
      // Your logic to get transactions
      // This is just a placeholder
      return NextResponse.json({
        success: true,
        data: [
          { id: "1", amount: 100, type: "EXPENSE" },
          { id: "2", amount: 200, type: "INCOME" }
        ]
      });
    } catch (error) {
      console.error("Get transactions API error:", error);
      return NextResponse.json(
        { error: "Failed to get transactions" },
        { status: 500 }
      );
    }
  },
  {
    // Uses the global rate limiter (20 reqs per 10s)
    identifier: async () => {
      // Use the user ID as the rate limit identifier
      const { userId } = await auth();
      return userId || "anonymous";
    }
  }
); 