"use server";

import { db } from "@/lib/prisma";
import { Transaction } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { subDays } from "date-fns";

const ACCOUNT_ID = "09e3bd8c-74b4-4b11-8049-6b139ab9578c";
const USER_ID = "7327159c-de90-48db-b270-938b3c199c59";

export const seedTransactions = async () => {
  try {
    const transactions: Transaction[] = [
      {
        id: crypto.randomUUID(),
        type: "EXPENSE",
        amount: new Decimal(75.5),
        description: "Grocery Shopping",
        date: subDays(new Date(), 2),
        category: "GROCERIES",
        status: "COMPLETED",
        isRecurring: false,
        userId: USER_ID,
        accountId: ACCOUNT_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        receiptUrl: null,
        recurringInterval: null,
        nextRecurringDate: null,
        lastProcessed: null,
      },
      {
        id: crypto.randomUUID(),
        type: "EXPENSE",
        amount: new Decimal(120.0),
        description: "Car Repair",
        date: subDays(new Date(), 5),
        category: "TRANSPORTATION",
        status: "COMPLETED",
        isRecurring: false,
        userId: USER_ID,
        accountId: ACCOUNT_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        receiptUrl: null,
        recurringInterval: null,
        nextRecurringDate: null,
        lastProcessed: null,
      },
      {
        id: crypto.randomUUID(),
        type: "EXPENSE",
        amount: new Decimal(45.75),
        description: "Dinner Out",
        date: subDays(new Date(), 1),
        category: "DINING",
        status: "COMPLETED",
        isRecurring: false,
        userId: USER_ID,
        accountId: ACCOUNT_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        receiptUrl: null,
        recurringInterval: null,
        nextRecurringDate: null,
        lastProcessed: null,
      },
      // Income Transactions
      {
        id: crypto.randomUUID(),
        type: "INCOME",
        amount: new Decimal(1500.0),
        description: "Monthly Salary",
        date: subDays(new Date(), 7),
        category: "SALARY",
        status: "COMPLETED",
        isRecurring: false,
        userId: USER_ID,
        accountId: ACCOUNT_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        receiptUrl: null,
        recurringInterval: null,
        nextRecurringDate: null,
        lastProcessed: null,
      },
      {
        id: crypto.randomUUID(),
        type: "INCOME",
        amount: new Decimal(250.0),
        description: "Freelance Work",
        date: subDays(new Date(), 3),
        category: "FREELANCE",
        status: "COMPLETED",
        isRecurring: false,
        userId: USER_ID,
        accountId: ACCOUNT_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        receiptUrl: null,
        recurringInterval: null,
        nextRecurringDate: null,
        lastProcessed: null,
      },
    ];

    // Insert transactions and update account balance
    await db.$transaction(async (tx) => {
      // Clear existing transactions for this account
      await tx.transaction.deleteMany({
        where: { accountId: ACCOUNT_ID },
      });

      // Insert new transactions
      await tx.transaction.createMany({
        data: transactions,
      });

      // Calculate total balance change
      const balanceChange = transactions.reduce((total, transaction) => {
        return transaction.type === "INCOME"
          ? total + Number(transaction.amount)
          : total - Number(transaction.amount);
      }, 0);

      // Update account balance
      await tx.account.update({
        where: { id: ACCOUNT_ID },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });
    });

    return {
      success: true,
      message: `Created ${transactions.length} transactions`,
    };
  } catch (error) {
    console.error("Error seeding transactions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
