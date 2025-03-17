import { Account } from "./account";
import { Budget } from "./budget";
import { Transaction } from "./transaction";

export interface User {
  id: string;
  clerkUserId: string;
  email: string;
  name?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
}
