"use server"; // This tells Next.js that this action runs on the server side (on the server).

import { db } from "@/lib/prisma";
import { Account } from "@/types/account";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import serializeTransaction from "@/lib/actions/serializeTransaction";

/**
 * - createAccount is an asynchronous function that handles the logic for creating a new account.
 * - It interacts with our database using Prisma and performs operations like:
 *    - Validating the user.
 *    - Converting the balance from a string to a float.
 *    - Setting the account as the default (if applicable).
 *    - Creating the account in the database.
 *    - It returns a response indicating success or failure.
 */
export async function createAccount(data: Account) {
  try {
    // Check if the user is logged in
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Check if the user exists in the database
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Convert Balance to Float before saving
    const balanceFloat = parseFloat(data.balance);
    if (isNaN(balanceFloat)) {
      throw new Error("Invalid balance");
    }

    // If it's the first account the user is creating, then make it the default account
    const existingAccounts = await db.account.findMany({
      where: {
        userId: user.id,
      },
    });

    const shouldBeDefault =
      existingAccounts.length === 0 ? true : data.isDefault;

    // if we have to make this the default account, make all other accounts non-default
    if (shouldBeDefault) {
      await db.account.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Create a new account
    const account = await db.account.create({
      data: {
        ...data,
        balance: balanceFloat,
        userId: user.id,
        isDefault: shouldBeDefault, // Override the isDefault based on our logic
        // name: data.name,
        // type: data.type,
      },
    });

    // Serialize the account before returning, conver it back to a number
    const serializedAccount = serializeTransaction(account);

    revalidatePath("/dashboard");
    return { success: true, data: serializedAccount };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to create account",
    };
  }
}

export async function getUserAccounts() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  try {
    const accounts = await db.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    // Serialize accounts before sending to client
    const serializedAccounts = accounts.map(serializeTransaction);

    return serializedAccounts;
  } catch (error) {
    console.error(error.message);
  }
}
