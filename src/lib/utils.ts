import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Combines multiple class names with tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts any form of amount (string, number, Decimal) to a JavaScript number
 */
export function toNumber(amount: string | number | Decimal | null | undefined): number {
  if (amount === null || amount === undefined) {
    return 0;
  }
  
  if (typeof amount === 'string') {
    return parseFloat(amount) || 0;
  }
  
  if (typeof amount === 'number') {
    return amount;
  }
  
  // Handle Decimal
  if (typeof amount === 'object' && 'toNumber' in amount && typeof amount.toNumber === 'function') {
    return amount.toNumber();
  }
  
  return 0;
}

/**
 * Formats a number as currency
 */
export function formatCurrency(amount: number | string | Decimal): string {
  const value = toNumber(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}
