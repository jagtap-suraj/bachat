import { AccountCard } from "@/components/AccountCard";
import { CreateAccountDrawer } from "@/components/CreateAccountDrawer";
import { Card, CardContent } from "@/components/ui/card";
import { getUserAccounts } from "@/lib/actions/dashboard";
import { Plus } from "lucide-react";
import React from "react";

const DashboardPage = async () => {
  const accounts = await getUserAccounts();
  return (
    <div className="space-y-8">
      {/* Budget Progress */}
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
        {accounts &&
          accounts.length > 0 &&
          accounts?.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
      </div>
    </div>
  );
};

export default DashboardPage;
