"use server";

import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getUserFromAuth } from "./auth";
import { serialize } from "./serialize";
import type { Prisma } from "@prisma/client";
import { AccountFormData, AccountType } from "@/types/account";
import { createCacheKey, invalidateCache, getCache, setCache } from "@/lib/cache";

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

export const setDefaultAccount = async (
  userId: string,
  shouldBeDefault: boolean,
  accountId?: string
) => {
  if (!shouldBeDefault || !accountId) return; // No need to change anything

  try {
    return await db.$transaction(async (prisma: Prisma.TransactionClient) => {
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
    throw error; // Re-throw the error for the caller to handle
  }
};

export const toggleDefaultAccount = async (accountId: string) => {
  try {
    if (!accountId) throw new Error("Account ID is required");

    const user = await getUserFromAuth();
    const account = await setDefaultAccount(user.id, true, accountId);

    if (!account) throw new Error("Failed to set default account");

    // Invalidate the accounts cache for this user
    await invalidateCache(createCacheKey(user.id, "accounts"));
    
    revalidatePath("/dashboard");
    return { success: true, data: await serialize(account) };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAccountWithTransactions = async (accountId: string) => {
  try {
    const user = await getUserFromAuth();
    const account = await db.account.findUnique({
      where: { id: accountId, userId: user.id },
      include: {
        transactions: { orderBy: { date: "desc" } },
        _count: { select: { transactions: true } },
      },
    });

    if (!account) throw new Error("Account not found");

    /**
     * Serialization note:
     *
     * `serialize` returns Promises, so `map(serialize)` creates an array of Promises.
     * Components can't access Promise properties directly.
     *
     * Solution: Use `await Promise.all(array.map(serialize))` to resolve all Promises
     * before returning data to components.
     */
    return {
      ...(await serialize(account)),
      transactions: await Promise.all(account.transactions.map(serialize)),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Cached version of getUserAccounts - using the better manual implementation instead
export const getUserAccounts = async () => {
  return getUserAccountsCached();
};

// Better implementation that handles caching manually for async key generation
export const getUserAccountsCached = async () => {
  try {
    const user = await getUserFromAuth();
    
    // Create a proper cache key with the user ID
    const cacheKey = createCacheKey(user.id, "accounts");
    
    // Try to get from cache first
    const cachedAccounts = await getCache(cacheKey);
    if (cachedAccounts) {
      return cachedAccounts;
    }
    
    // If not in cache, get from DB
    const accounts = await getUserAccountsFromDb(user.id);
    const serializedAccounts = await Promise.all(
      accounts.map(async (account) => await serialize(account))
    );
    
    // Cache the result for 5 minutes
    await setCache(cacheKey, serializedAccounts, 300);
    
    return serializedAccounts;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * - createAccount is an asynchronous function that handles the logic for creating a new account.
 * - It interacts with our database using Prisma and performs operations like:
 *    - Validating the user.
 *    - Converting the balance from a string to a float.
 *    - Setting the account as the default (if applicable).
 *    - Creating the account in the database.
 *    - It returns a response indicating success or failure.
 */
export const createAccount = async (data: AccountFormData) => {
  try {
    const user = await getUserFromAuth();
    const balanceFloat = await validateBalance(data.balance);

    const existingAccounts = await getUserAccountsFromDb(user.id);
    const shouldBeDefault = existingAccounts.length === 0 || Boolean(data.isDefault);

    const account = await db.account.create({
      data: {
        name: data.name,
        type: data.type as AccountType,
        balance: balanceFloat,
        userId: user.id,
        isDefault: shouldBeDefault,
      },
    });

    if (shouldBeDefault) {
      await setDefaultAccount(user.id, true, account.id);
    }

    // Invalidate the accounts cache for this user
    await invalidateCache(createCacheKey(user.id, "accounts"));
    
    revalidatePath("/dashboard");
    return { success: true, data: await serialize(account) };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to create account",
    };
  }
};

export const bulkDeleteTransactions = async (transactionIds: string[]) => {
  try {
    const user = await getUserFromAuth();

    // Get transactions to calculate balance changes
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId: user.id,
      },
    });

    // Group transactions by account to update balances
    const accountBalanceChanges = transactions.reduce(
      (acc: Record<string, number>, transaction) => {
        const amount = typeof transaction.amount === 'object' && transaction.amount !== null && 'toNumber' in transaction.amount 
          ? transaction.amount.toNumber() 
          : Number(transaction.amount);
          
        const change = transaction.type === "EXPENSE" ? amount : -amount;
        acc[transaction.accountId] = (acc[transaction.accountId] || 0) + change;
        return acc;
      },
      {} as Record<string, number>
    );

    // Delete transactions and update account balances in a transaction
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete transactions
      await tx.transaction.deleteMany({
        where: {
          id: { in: transactionIds },
          userId: user.id,
        },
      });

      // Update account balances
      for (const [accountId, balanceChange] of Object.entries(
        accountBalanceChanges
      )) {
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/account/[id]");

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
