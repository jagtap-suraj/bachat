import { PrismaClient } from "@prisma/client";

// Extend the global object to include the `prisma` property
const globalWithPrisma = global as typeof globalThis & { prisma: PrismaClient };

// Initialize the Prisma client
export const db = globalWithPrisma.prisma || new PrismaClient();

// In development, reuse the same Prisma client instance across hot reloads
if (process.env.NODE_ENV !== "production" && !globalWithPrisma.prisma) {
  globalWithPrisma.prisma = db;
}
