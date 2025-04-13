import { Suspense } from "react";
import { BarLoader } from "react-spinners";
import { notFound } from "next/navigation";
import { getAccountWithTransactions } from "@/lib/actions/account";
import TransactionTable from "@/components/TransactionTable";
import AccountChart from "@/components/AccountChart";
import { Transaction } from "@/types/transaction";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const accountData = await getAccountWithTransactions(id);

  if (!accountData || 'error' in accountData) {
    notFound();
  }

  const { transactions, ...account } = accountData;

  return (
    <div className="space-y-8 px-5">
      <div className="flex gap-4 items-end justify-between">
        <div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight gradient-title capitalize">
            {account.name}
          </h1>
          <p className="text-muted-foreground">
            {account.type.charAt(0) + account.type.slice(1).toLowerCase()}{" "}
            Account
          </p>
        </div>

        <div className="text-right pb-2">
          <div className="text-xl sm:text-2xl font-bold">
            ${typeof account.balance === 'string' 
              ? parseFloat(account.balance).toFixed(2)
              : Number(account.balance).toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground">
            {account._count?.transactions || 0} Transactions
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <AccountChart transactions={transactions as Transaction[]} />
      </Suspense>

      {/* Transactions Table */}
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <TransactionTable transactions={transactions as Transaction[]} />
      </Suspense>
    </div>
  );
}
