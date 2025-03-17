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

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string; // TODO: Change to Decimal
  description?: string;
  date: Date;
  category: string;
  receiptUrl?: string;
  isRecurring: boolean;
  recurringInterval?: RecurringInterval;
  nextRecurringDate?: Date;
  lastProcessed?: Date;
  status: TransactionStatus;
  userId: string;
  accountId: string;
  createdAt: Date;
  updatedAt: Date;
}
