"use server";

import { RecurringInterval, Transaction } from "@/types/transaction";
import { getUserFromAuth } from "@/lib/actions/auth";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { serialize } from "@/lib/actions/serialize";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { defaultCategories } from "@/data/categories";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export const createTransaction = async (data: Transaction) => {
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
      console.error("Account not found for ID:", data.accountId);
      return {
        success: false,
        error: "Account not found",
      };
    }

    // Calculate new balance
    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + Number(balanceChange);

    // Create transaction and update account balance
    // Create transaction and update account balance
    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
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

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return {
      success: true,
      data: await serialize(transaction),
    };
  } catch (error) {
    console.error("Transaction creation error:", error); // Log the error
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
};

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
      console.log("Scanned receipt data:", data);
      return {
        type: data.type,
        amount: parseFloat(data.amount),
        date: new Date(data.date),
        description: data.description,
        category: data.category,
        merchantName: data.merchantName,
      };
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      throw new Error("Invalid response format from Gemini");
    }
  } catch (error) {
    console.error("Error scanning receipt:", error);
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
