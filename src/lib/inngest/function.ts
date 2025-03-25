import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/prisma";
import EmailTemplate from "../../../emails/template";
import { sendEmail } from "@/lib/actions/sendEmail";

function isNewMonth(lastAlertDate: Date, currentDate: Date) {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
}

export const checkBudgetAlerts = inngest.createFunction(
  { id: "check-budget-alerts" },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    // Fetch all default accounts of all users
    const budgets = await step.run("fetch-budgets", async () => {
      return await db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: {
                where: {
                  isDefault: true,
                },
              },
            },
          },
        },
      });
    });

    for (const budget of budgets) {
      const defaultAccount = budget.user.accounts[0];
      if (!defaultAccount) continue; // Skip if no default account

      await step.run(`check-budget-${budget.id}`, async () => {
        const startDate = new Date();
        startDate.setDate(1); // Start of current month

        // Calculate total expenses for the default account only
        const expenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            accountId: defaultAccount.id, // Only consider default account
            type: "EXPENSE",
            date: {
              gte: startDate,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const totalExpenses = expenses._sum.amount?.toNumber() || 0;
        const budgetAmount = budget.amount;
        const percentageUsed = (totalExpenses / Number(budgetAmount)) * 100;

        // Check if we should send an alert
        if (
          percentageUsed >= 80 && // Default threshold of 80%
          (!budget.lastAlertSent ||
            isNewMonth(new Date(budget.lastAlertSent), new Date()))
        ) {
          console.log("From checkBudgetAlerts");
          console.table({
            totalExpenses,
            budgetAmount,
            percentageUsed,
          });
          await sendEmail({
            to: budget.user.email,
            subject: `Budget Alert for ${defaultAccount.name}`,
            react: EmailTemplate({
              userName: budget.user.name,
              type: "budget-alert",
              data: {
                percentageUsed,
                budgetAmount: Number(Number(budgetAmount).toFixed(1)),
                totalExpenses: Number(totalExpenses.toFixed(1)),
              },
            }),
          });

          // Update last alert sent
          await db.budget.update({
            where: { id: budget.id },
            data: { lastAlertSent: new Date() },
          });
        }
      });
    }
  }
);
