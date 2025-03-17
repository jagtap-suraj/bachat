// import { Decimal } from "@prisma/client/runtime/library";";
import { Transaction } from "./transaction";
import { User } from "./user";

// Enum definitions for reference (same as in your schema)
export enum AccountType {
  CURRENT = "CURRENT",
  SAVINGS = "SAVINGS",
}

export interface Account {
  id?: string;
  name: string;
  type: AccountType;
  balance: string; // TODO: Use Decimal type from Prisma for accurate representation of monetary values
  isDefault: boolean;
}
