// "use server"; // This tells Next.js that this action runs on the server side (on the server).

import { getUserFromAuth } from "@/lib/actions/auth";
import { db } from "@/lib/prisma";
import { serialize } from "@/lib/actions/serialize";

export const getDashboardData = async () => {
  try {
    const user = await getUserFromAuth();
    const transactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    });
    return await Promise.all(
      transactions.map(async (transaction) => await serialize(transaction))
    );
  } catch (error) {
    return { success: false, error: error.message };
  }
};
