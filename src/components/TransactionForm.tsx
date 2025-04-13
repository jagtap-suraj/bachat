"use client";

import { transactionSchema } from "@/lib/zodSchemas";
import { Account } from "@/types/account";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { defaultCategories } from "@/data/categories";
import {
  Transaction,
  TransactionType,
  RecurringInterval,
  TransactionFormData
} from "@/types/transaction";
import useFetch from "@/hooks/useFetch";
import { createTransaction, updateTransaction } from "@/lib/actions/transaction";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "./ui/input";
import CreateAccountDrawer from "./CreateAccountDrawer";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { Switch } from "./ui/switch";
import { cn, toNumber } from "@/lib/utils";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ReceiptScanner } from "./ReceiptScanner";

const AddTransactionForm = ({
  accounts,
  categories,
  editMode = false,
  initialData = null,
}: {
  accounts: Account[];
  categories: typeof defaultCategories;
  editMode?: boolean;
  initialData?: Transaction | null;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [key, setKey] = useState(0);

  // Determine default values based on edit mode
  const getDefaultValues = (): TransactionFormData => {
    if (editMode && initialData) {
      return {
        type: initialData.type as TransactionType,
        amount: String(initialData.amount),
        description: initialData.description || undefined,
        accountId: initialData.accountId,
        category: initialData.category,
        date: new Date(initialData.date),
        isRecurring: initialData.isRecurring,
        recurringInterval: initialData.recurringInterval as RecurringInterval,
      };
    }
    
    return {
      type: TransactionType.EXPENSE,
      amount: "",
      description: undefined,
      accountId: accounts.find((ac) => ac.isDefault)?.id || "",
      category: "",
      date: new Date(),
      isRecurring: false,
    };
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    reset,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: getDefaultValues(),
  });

  const type = watch("type");
  const isRecurring = watch("isRecurring");
  const date = watch("date");

  // API hooks with proper error handling
  const {
    loading: createLoading,
    fn: createFn,
    data: createResult,
    error: createError,
  } = useFetch(createTransaction);

  const {
    loading: updateLoading,
    fn: updateFn,
    data: updateResult,
    error: updateError,
  } = useFetch(updateTransaction);

  const loading = editMode ? updateLoading : createLoading;
  const result = editMode ? updateResult : createResult;
  const error = editMode ? updateError : createError;

  // Process form submission
  const onSubmit = (data: TransactionFormData) => {
    if (editMode && editId) {
      updateFn(editId, data);
    } else {
      createFn(data);
    }
  };

  // Handle API response
  useEffect(() => {
    // Show success message and redirect on success
    if (result?.success && !loading) {
      toast.success(
        editMode
          ? "Transaction updated successfully"
          : "Transaction created successfully"
      );
      reset();
      if (result.data?.accountId) {
        router.push(`/account/${result.data.accountId}`);
      }
    }
    
    // Show error message if there's an error
    if (error) {
      toast.error(`Error: ${error.message || "Something went wrong"}`);
    }
  }, [result, loading, editMode, reset, router, error]);

  // Handle receipt scanner data
  const handleScanComplete = (scannedData: Transaction) => {
    if (!scannedData) return;
    
    // Update form values from scanned data
    if (scannedData.amount) setValue("amount", String(scannedData.amount));
    if (scannedData.date) setValue("date", new Date(scannedData.date));
    if (scannedData.type) setValue("type", scannedData.type);
    if (scannedData.description) setValue("description", scannedData.description);
    if (scannedData.category) setValue("category", scannedData.category);
    
    // Force rerender of Select components
    setKey(prevKey => prevKey + 1);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Receipt Scanner - Only show in create mode */}
      {!editMode && <ReceiptScanner onScanComplete={handleScanComplete} />}

      {/* Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <Select
          key={`type-${key}`}
          value={type}
          onValueChange={(value: TransactionType) => {
            setValue("type", value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type">
              {type === TransactionType.EXPENSE ? "Expense" : "Income"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TransactionType.EXPENSE}>Expense</SelectItem>
            <SelectItem value={TransactionType.INCOME}>Income</SelectItem>
          </SelectContent>
        </Select>

        {errors.type && (
          <p className="text-sm text-red-500">{errors.type.message}</p>
        )}
      </div>

      {/* Amount */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount.message}</p>
          )}
        </div>

        {/* Account */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Account</label>
          <Select
            onValueChange={(value) => setValue("accountId", value)}
            defaultValue={getValues("accountId")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id || ""}>
                  {account.name} (${toNumber(account.balance).toFixed(2)})
                </SelectItem>
              ))}
              <CreateAccountDrawer>
                <Button
                  variant="ghost"
                  className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                >
                  Create Account
                </Button>
              </CreateAccountDrawer>
            </SelectContent>
          </Select>
          {errors.accountId && (
            <p className="text-sm text-red-500">{errors.accountId.message}</p>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <Select
          key={`category-${key}`}
          onValueChange={(value) => setValue("category", value)}
          defaultValue={getValues("category")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {/* Group by category type */}
            <div>
              <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1 pl-2">
                Income
              </h4>
              {categories
                .filter(cat => cat.type === "INCOME")
                .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase text-gray-500 mb-1 pl-2">
                Expenses
              </h4>
              {categories
                .filter(cat => cat.type === "EXPENSE")
                .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
            </div>
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-red-500">{errors.category.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input
          placeholder="Description"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full pl-3 text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              {date ? format(date, "PPP") : <span>Pick a date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => date && setValue("date", date)}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.date && (
          <p className="text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>

      {/* Recurring */}
      <div className="flex items-center space-x-2">
        <Switch
          id="is-recurring"
          checked={isRecurring}
          onCheckedChange={(checked) => setValue("isRecurring", checked)}
        />
        <label
          htmlFor="is-recurring"
          className="text-sm font-medium leading-none cursor-pointer"
        >
          Recurring Transaction
        </label>
      </div>

      {/* Recurring Interval */}
      {isRecurring && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Recurring Interval</label>
          <Select
            onValueChange={(value) =>
              setValue("recurringInterval", value as RecurringInterval)
            }
            defaultValue={getValues("recurringInterval") as string}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={RecurringInterval.DAILY}>Daily</SelectItem>
              <SelectItem value={RecurringInterval.WEEKLY}>Weekly</SelectItem>
              <SelectItem value={RecurringInterval.MONTHLY}>Monthly</SelectItem>
              <SelectItem value={RecurringInterval.YEARLY}>Yearly</SelectItem>
            </SelectContent>
          </Select>
          {errors.recurringInterval && (
            <p className="text-sm text-red-500">
              {errors.recurringInterval.message}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1">
        <Button
          type="button"
          variant="outline"
          className="w-1/2"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" className="w-1/2" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {editMode ? "Updating..." : "Creating..."}
            </>
          ) : editMode ? (
            "Update Transaction"
          ) : (
            "Create Transaction"
          )}
        </Button>
      </div>
    </form>
  );
};

export default AddTransactionForm;
