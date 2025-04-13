"use server";

import { RecurringInterval, TransactionFormData } from "@/types/transaction";
import { getUserFromAuth } from "@/lib/actions/auth";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { serialize } from "@/lib/actions/serialize";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { defaultCategories } from "@/data/categories";
import type { Prisma } from "@prisma/client";
import { createCacheKey, invalidateCache } from "@/lib/cache";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export const createTransaction = async (data: TransactionFormData) => {
  try {
    const user = await getUserFromAuth();

    // Get request data for ArcJet

    // Check rate limit

    const account = await db.account.findUnique({
      where: {
        id: data.accountId,
        userId: user.id,
      },
    });

    if (!account) {
      return {
        success: false,
        error: "Account not found",
      };
    }

    // Calculate new balance
    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + Number(balanceChange);

    // Create transaction and update account balance
    const transaction = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
          userId: user.id,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    // Invalidate caches
    await invalidateCache(createCacheKey(user.id, "accounts"));
    await invalidateCache(createCacheKey(user.id, "dashboard", { accountId: data.accountId }));
    
    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return {
      success: true,
      data: await serialize(transaction),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
};

export const getTransaction = async (id: string) => {
  const user = await getUserFromAuth();

  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!transaction) throw new Error("Transaction not found");

  return await serialize(transaction);
};

export async function updateTransaction(id: string, data: TransactionFormData) {
  try {
    const user = await getUserFromAuth();

    // Get original transaction to calculate balance change
    const originalTransaction = await db.transaction.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        account: true,
      },
    });

    if (!originalTransaction) throw new Error("Transaction not found");

    // Calculate balance changes
    const oldBalanceChange =
      originalTransaction.type === "EXPENSE"
        ? -originalTransaction.amount.toNumber()
        : originalTransaction.amount.toNumber();

    const newBalanceChange =
      data.type === "EXPENSE" ? -Number(data.amount) : Number(data.amount);

    const netBalanceChange = newBalanceChange - oldBalanceChange;

    // Update transaction and account balance in a transaction
    const transaction = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // Update account balance
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: netBalanceChange,
          },
        },
      });

      return updated;
    });

    // Invalidate caches
    await invalidateCache(createCacheKey(user.id, "accounts"));
    await invalidateCache(createCacheKey(user.id, "dashboard", { accountId: data.accountId }));
    
    // If account changed, invalidate old account cache too
    if (originalTransaction.accountId !== data.accountId) {
      await invalidateCache(createCacheKey(user.id, "dashboard", { accountId: originalTransaction.accountId }));
    }

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: await serialize(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Scan Receipt
export async function scanReceipt(file: File) {
  try {
    const model = genAI?.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    // Convert ArrayBuffer to Base64
    const base64String = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `
      Analyze this receipt image and extract the following information in JSON format:
      - Type (INCOME or EXPENSE)
      - Total amount (just the number)
      - Date (in ISO format)
      - Description or items purchased (brief summary)
      - Merchant/store name
      - Use ONLY these categories:
        ${defaultCategories.map((c) => c.id).join(",")}
      
      Only respond with valid JSON in this exact format:
      {
        "type": "INCOME" | "EXPENSE",
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": ${defaultCategories.map((c) => c.id).join(",")}
      }

      If its not a recipt, return an empty object
    `;

    const result = await model?.generateContent([
      {
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      },
      prompt,
    ]);

    const response = await result?.response;
    const text = response?.text();
    const cleanedText = text?.replace(/```(?:json)?\n?/g, "").trim();

    try {
      const data = JSON.parse(cleanedText ?? "{}");
      return {
        type: data.type,
        amount: parseFloat(data.amount),
        date: new Date(data.date),
        description: data.description,
        category: data.category,
        merchantName: data.merchantName,
      };
    } catch {
      throw new Error("Invalid response format from Gemini");
    }
  } catch {
    throw new Error("Failed to scan receipt");
  }
}

function calculateNextRecurringDate(
  startDate: Date,
  interval: RecurringInterval
) {
  const date = new Date(startDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}
