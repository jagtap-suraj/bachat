"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { validateBalance } from "./account";
import { Budget } from "@/types/budget";
import { getUserFromAuth } from "./auth";

export type SuccessBudgetResponse = {
  success: true;
  data: { budget: Budget | null; currentExpenses?: number };
};
export type ErrorBudgetResponse = { success: false; error: string };

export const getCurrentBudget = async (
  accountId: string
): Promise<SuccessBudgetResponse | ErrorBudgetResponse> => {
  try {
    const user = await getUserFromAuth();

    const budget = await db.budget.findFirst({
      where: {
        userId: user.id,
      },
    });

    // Get current month's expenses
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0); // 0th day of the next month = last day of the current month

    const expenses = await db.transaction.aggregate({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        accountId,
      },
      _sum: {
        amount: true,
      },
    });

    return {
      success: true,
      data: {
        budget: budget ? { ...budget, amount: budget.amount.toString() } : null,
        currentExpenses: expenses._sum.amount
          ? expenses._sum.amount.toNumber()
          : 0,
      },
    };
  } catch (error) {
    console.error("Error fetching budget:", error);
    return { success: false, error: error.message };
  }
};

export const updateBudget = async (
  amount: string
): Promise<SuccessBudgetResponse | ErrorBudgetResponse> => {
  try {
    const user = await getUserFromAuth();

    const parsedAmount = await validateBalance(amount);

    // Update or create budget
    const budget = await db.budget.upsert({
      where: {
        userId: user.id,
      },
      update: {
        amount: parsedAmount,
      },
      create: {
        userId: user.id,
        amount: parsedAmount,
      },
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      data: {
        budget: { ...budget, amount: budget.amount.toString() },
      },
    };
  } catch (error) {
    console.error("Error updating budget:", error);
    return { success: false, error: error.message };
  }
};
