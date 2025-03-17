"use server";

/**
 * - Serializes a transaction object by converting certain properties to plain numbers.
 *
 * - This function takes an object creates a shallow copy of it.
 * - checks for the presence of the `balance` and `amount` properties.
 * - If either of these properties exists, it converts them to plain JS numbers using the `toNumber()` method.
 * - The modified object is then returned.
 */
const serializeTransaction = (obj: any) => {
  const serialized = { ...obj }; // Create a shallow copy of the object
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};

export default serializeTransaction;
