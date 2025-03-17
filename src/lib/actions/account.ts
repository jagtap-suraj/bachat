"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getUserFromAuth } from "./auth";
import { serialize } from "./serialize";
import { Account } from "@/types/account";

export const validateBalance = async (balance: string) => {
  const balanceFloat = parseFloat(balance);
  if (isNaN(balanceFloat) || balanceFloat < 0) {
    throw new Error("Invalid balance amount");
  }
  return balanceFloat;
};

export const getUserAccountsFromDb = async (userId: string) => {
  return await db.account.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });
};

// export const setDefaultAccount = async (
//   userId: string,
//   shouldBeDefault: boolean,
//   accountId?: string
// ) => {
//   if (!shouldBeDefault || !accountId) return; // No need to change anything

//   // Log inputs for debugging
//   console.log("accountId:", accountId);
//   console.log("userId:", userId);

//   // Unset previous default account
//   await db.account.updateMany({
//     where: { userId, NOT: { id: accountId } },
//     data: { isDefault: false },
//   });

//   // Set new default account
//   return await db.account.update({
//     where: { id: accountId, userId },
//     data: { isDefault: true },
//   });
// };

export const setDefaultAccount = async (
  userId: string,
  shouldBeDefault: boolean,
  accountId?: string
) => {
  if (!shouldBeDefault || !accountId) return; // No need to change anything

  // Log inputs for debugging
  console.log("accountId:", accountId);
  console.log("userId:", userId);

  try {
    return await db.$transaction(async (prisma) => {
      // Unset previous default account
      await prisma.account.updateMany({
        where: { userId, NOT: { id: accountId }, isDefault: true },
        data: { isDefault: false },
      });

      // Set new default account
      return await prisma.account.update({
        where: { id: accountId, userId },
        data: { isDefault: true },
      });
    });
  } catch (error) {
    console.error("Transaction failed:", error);
    throw error; // Re-throw the error for the caller to handle
  }
};

export async function toggleDefaultAccount(accountId: string) {
  try {
    if (!accountId) throw new Error("Account ID is required");

    const user = await getUserFromAuth();
    const account = await setDefaultAccount(user.id, true, accountId);

    if (!account) throw new Error("Failed to set default account");

    revalidatePath("/dashboard");
    return { success: true, data: await serialize(account) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getAccountWithTransactions(accountId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const account = db.account.findUnique({
    where: { id: accountId, userId: user.id },
    include: {
      transactions: { orderBy: { date: "desc" } },
      _count: { select: { transactions: true } },
    },
  });

  if (!account) throw new Error("Account not found");

  return account;
}

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
    const user = await getUserFromAuth();
    const balanceFloat = await validateBalance(data.balance);

    const existingAccounts = await getUserAccountsFromDb(user.id);
    const shouldBeDefault = existingAccounts.length === 0 || data.isDefault;

    // const account = await db.$transaction(async (prisma) => {
    //   // Create a new account
    //   const newAccount = await prisma.account.create({
    //     data: {
    //       ...data,
    //       balance: balanceFloat,
    //       userId: user.id,
    //       isDefault: shouldBeDefault,
    //     },
    //   });

    //   console.log("New account created:", newAccount);

    //   // Set as default if necessary
    //   try {
    //     if (shouldBeDefault) {
    //       await setDefaultAccount(user.id, true, newAccount.id);
    //     }
    //   } catch (error) {
    //     console.error("Failed to set default account:", error);
    //     throw new Error("Account created, but failed to set as default.");
    //   }

    //   return newAccount;
    // });

    const account = await db.account.create({
      data: {
        ...data,
        balance: balanceFloat,
        userId: user.id,
        isDefault: shouldBeDefault,
      },
    });

    if (shouldBeDefault) {
      await setDefaultAccount(user.id, true, account.id);
    }

    revalidatePath("/dashboard");
    return { success: true, data: await serialize(account) };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to create account",
    };
  }
}

export async function getUserAccounts() {
  try {
    const user = await getUserFromAuth();
    const accounts = await getUserAccountsFromDb(user.id);

    return await Promise.all(
      accounts.map(async (account) => await serialize(account))
    );
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw new Error(
      "Unable to retrieve accounts at this time. Please try again later."
    );
  }
}
