import AddTransactionForm from "@/components/TransactionForm";
import { defaultCategories } from "@/data/categories";
import { getUserAccounts } from "@/lib/actions/account";

export default async function AddTransactionPage({}) {
  const accountsResult = await getUserAccounts();
  const accounts = Array.isArray(accountsResult) ? accountsResult : [];

  let initialData = null;
  //   if (editId) {
  //     const transaction = await getTransaction(editId);
  //     initialData = transaction;
  //   }

  return (
    <div className="max-w-3xl mx-auto px-5">
      <div className="flex justify-center md:justify-normal mb-8">
        <h1 className="text-5xl gradient-title ">Add Transaction</h1>
      </div>
      <AddTransactionForm
        accounts={accounts}
        categories={defaultCategories}
        // editMode={!!editId}
        initialData={initialData}
      />
    </div>
  );
}
