import { Decimal } from "@prisma/client/runtime/library";

// Enum definitions for reference (same as in your schema)
export enum AccountType {
  CURRENT = "CURRENT",
  SAVINGS = "SAVINGS",
}

// Base interface with common properties
export interface AccountBase {
  id?: string;
  name: string;
  type: AccountType;
  isDefault: boolean;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// For UI forms where balance is a string
export interface AccountFormData extends AccountBase {
  balance: string;
}

// For data from Prisma where balance is Decimal
export interface AccountFromDB extends AccountBase {
  balance: Decimal;
  _count?: { transactions: number };
}

// General use Account type that could be either form or DB
export type Account = AccountBase & {
  balance: string | number | Decimal;
};

// For creating new accounts
export type AccountCreateInput = Omit<AccountBase, 'id' | 'createdAt' | 'updatedAt'> & {
  balance: string | number | Decimal;
};
