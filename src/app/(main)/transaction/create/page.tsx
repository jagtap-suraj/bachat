import AddTransactionForm from "@/components/TransactionForm";
import { defaultCategories } from "@/data/categories";
import { getUserAccounts } from "@/lib/actions/account";
import { getTransaction } from "@/lib/actions/transaction";
import { Account } from "@/types/account";
import { Transaction } from "@/types/transaction";

export default async function AddTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const accountsResult = await getUserAccounts();
  const accounts = Array.isArray(accountsResult) ? accountsResult as Account[] : [];

  // Use searchParams instead of params
  const { edit: editId } = await searchParams;

  let initialData = null;
  if (editId) {
    try {
      const transaction = await getTransaction(editId);
      initialData = transaction as Transaction;
    } catch (error) {
      console.error("Error fetching transaction:", error);
      // Optionally, you could add error handling here
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5">
      <div className="flex justify-center md:justify-normal mb-8">
        <h1 className="text-5xl gradient-title">Add Transaction</h1>
      </div>
      <AddTransactionForm
        accounts={accounts}
        categories={defaultCategories}
        editMode={!!editId}
        initialData={initialData}
      />
    </div>
  );
}
