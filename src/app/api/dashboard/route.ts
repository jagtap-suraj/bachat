import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rateLimit";
import { createCacheKey, getCache, setCache } from "@/lib/cache";
import { serialize } from "@/lib/actions/serialize";

/**
 * Get cached dashboard data for a user
 * This includes accounts, recent transactions, and monthly expense breakdown
 */
export const GET = withRateLimit(
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
      
      // Extract query parameters
      const url = new URL(req.url);
      const accountId = url.searchParams.get('accountId');
      
      // Create cache key based on user ID and optional account ID
      const cacheKey = createCacheKey(userId, "dashboard", { accountId });
      
      // Try to get data from cache first
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return NextResponse.json({
          success: true,
          data: cachedData,
          cached: true
        });
      }
      
      // If not in cache, get from database
      // Get user from clerk ID
      const user = await db.user.findUnique({
        where: { clerkUserId: userId },
      });
      
      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      
      // Get accounts
      const accounts = await db.account.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });
      
      // Use specified accountId or default account or first account
      const targetAccountId = accountId || 
        accounts.find(a => a.isDefault)?.id || 
        accounts[0]?.id;
      
      // Get transactions for the account
      const allTransactions = await db.transaction.findMany({
        where: { 
          userId: user.id,
          ...(targetAccountId ? { accountId: targetAccountId } : {})
        },
        orderBy: { date: "desc" },
      });
      
      // Get recent transactions (last 5)
      const recentTransactions = allTransactions.slice(0, 5);
      
      // Calculate expense breakdown for current month
      const currentDate = new Date();
      const currentMonthExpenses = allTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return (
          t.type === "EXPENSE" &&
          transactionDate.getMonth() === currentDate.getMonth() &&
          transactionDate.getFullYear() === currentDate.getFullYear()
        );
      });
      
      // Group expenses by category
      const expensesByCategory = currentMonthExpenses.reduce(
        (acc: { [key: string]: number }, transaction) => {
          const category = transaction.category;
          if (!acc[category]) {
            acc[category] = 0;
          }
          acc[category] += transaction.amount.toNumber();
          return acc;
        },
        {}
      );
      
      // Format data for pie chart
      const pieChartData = Object.entries(expensesByCategory).map(
        ([category, amount]) => ({
          name: category,
          value: amount,
        })
      );
      
      // Prepare response data
      const responseData = {
        accounts: await Promise.all(accounts.map(account => serialize(account))),
        recentTransactions: await Promise.all(recentTransactions.map(tx => serialize(tx))),
        expensesByCategory: pieChartData,
        selectedAccountId: targetAccountId,
      };
      
      // Cache for 5 minutes (300 seconds)
      await setCache(cacheKey, responseData, 300);
      
      return NextResponse.json({
        success: true,
        data: responseData,
        cached: false
      });
    } catch (error) {
      console.error("Dashboard API error:", error);
      return NextResponse.json(
        { error: "Failed to get dashboard data" },
        { status: 500 }
      );
    }
  },
  {
    // Use the global rate limiter (20 reqs per 10s)
    identifier: async () => {
      const { userId } = await auth();
      return userId || "anonymous";
    }
  }
); 