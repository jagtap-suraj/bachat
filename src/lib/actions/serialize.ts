"use server";

import { Decimal } from "@prisma/client/runtime/library";

/**
 * - Serializes a transaction object by converting certain properties to plain numbers.
 *
 * - This function takes an object creates a shallow copy of it.
 * - checks for the presence of the `balance` and `amount` properties.
 * - If either of these properties exists, it converts them to plain JS numbers using the `toNumber()` method.
 * - The modified object is then returned.
 */
export const serialize = async (obj: any) => {
  if (!obj || typeof obj !== "object") return obj; // Ensure obj is valid

  const serialized: any = { ...obj };

  if (obj.balance instanceof Decimal) {
    serialized.balance = obj.balance.toNumber();
  }

  if (obj.amount instanceof Decimal) {
    serialized.amount = obj.amount.toNumber();
  }

  return serialized;
};
