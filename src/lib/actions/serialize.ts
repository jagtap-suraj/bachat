"use server";

import { Decimal } from "@prisma/client/runtime/library";

type SerializedObject<T> = T extends Decimal
  ? number
  : T extends Date
  ? Date
  : T extends object
  ? { [K in keyof T]: SerializedObject<T[K]> }
  : T;

/**
 * Serializes database objects by converting Decimal values to numbers and handling nested objects
 * 
 * @param obj Object potentially containing Decimal values
 * @returns A serialized version with Decimal values converted to numbers
 */
export const serialize = async <T>(obj: T): Promise<SerializedObject<T>> => {
  if (!obj || typeof obj !== "object") return obj as SerializedObject<T>;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return Promise.all(obj.map((item) => serialize(item))) as unknown as SerializedObject<T>;
  }

  // Create a copy of the object to avoid mutating the original
  const serialized = { ...obj } as Record<string, unknown>;

  // Process each property
  for (const key in serialized) {
    const value = serialized[key];
    
    // Handle Decimal values
    if (value instanceof Decimal) {
      serialized[key] = value.toNumber();
    } 
    // Handle nested objects (but not Dates which are also objects)
    else if (value && typeof value === 'object' && !(value instanceof Date)) {
      serialized[key] = await serialize(value);
    }
  }

  return serialized as SerializedObject<T>;
};
