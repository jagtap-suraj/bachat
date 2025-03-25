import AccountCard from "@/components/AccountCard";
import BudgetProgress from "@/components/BudgetProgress";
import CreateAccountDrawer from "@/components/CreateAccountDrawer";
import { Card, CardContent } from "@/components/ui/card";
import { getUserAccounts } from "@/lib/actions/account";
import {
  getCurrentBudget,
  ErrorBudgetResponse,
  SuccessBudgetResponse,
} from "@/lib/actions/budget";
import { Account } from "@/types/account";
import { Budget } from "@/types/budget";
import { Plus } from "lucide-react";
import React from "react";

export default async function DashboardPage() {
  const result = await getUserAccounts();
  const accounts = Array.isArray(result) ? result : [];

  const defaultAccount = accounts?.find((account) => account.isDefault);

  // Get budget for default account
  let budgetResponse: SuccessBudgetResponse | ErrorBudgetResponse | null = null;
  let budgetData: Budget | null = null;
  let currentExpenses: number | null = null;
  if (defaultAccount) {
    budgetResponse = await getCurrentBudget(defaultAccount.id);
    if (budgetResponse.success) {
      budgetData = budgetResponse.data.budget;
      currentExpenses = budgetResponse.data.currentExpenses ?? null;
    }
  }

  return (
    <div className="space-y-8">
      {/* Budget Progress */}
      {defaultAccount && (
        <BudgetProgress
          initialBudget={budgetData}
          currentExpenses={currentExpenses || 0}
        />
      )}
      {/* Dashboard Overview */}
      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CreateAccountDrawer>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
              <Plus className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Add New Account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>
        {Array.isArray(accounts) &&
          accounts.length > 0 &&
          accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
      </div>
    </div>
  );
}
