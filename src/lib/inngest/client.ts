import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "bachat", // Unique app ID
  name: "Bachat",
  retryFunction: async (attempt: number) => ({
    delay: Math.pow(2, attempt) * 1000, // Exponential backoff
    maxAttempts: 2,
  }),
});
