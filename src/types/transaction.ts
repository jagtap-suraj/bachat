import { Decimal } from "@prisma/client/runtime/library";

// Use enums from Prisma schema directly to ensure consistency
export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum RecurringInterval {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

// Base interface with common properties
export interface TransactionBase {
  id?: string;
  type: TransactionType;
  description?: string | null;
  date: Date;
  category: string;
  receiptUrl?: string | null;
  isRecurring: boolean;
  recurringInterval?: RecurringInterval | null;
  nextRecurringDate?: Date | null;
  lastProcessed?: Date | null;
  status: TransactionStatus;
  userId: string;
  accountId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Type with amount as flexible type
export type TransactionWithAmount<T = Decimal | string | number> = TransactionBase & {
  amount: T;
};

// Form specific type where certain fields are omitted and recurringInterval is always RecurringInterval enum
export interface TransactionFormData {
  type: TransactionType;
  amount: string;
  description?: string;
  date: Date;
  category: string;
  accountId: string;
  isRecurring: boolean;
  recurringInterval?: RecurringInterval;
}

// Common types with specific amount types
export type TransactionFromDB = TransactionWithAmount<Decimal>;
export type Transaction = TransactionWithAmount;
export type TransactionCreateInput = Omit<TransactionWithAmount, 'id' | 'createdAt' | 'updatedAt'>;
