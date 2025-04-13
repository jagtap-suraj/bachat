"use client";

import { Transaction } from "@/types/transaction";
import React, { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { categoryColors } from "@/data/categories";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import useFetch from "@/hooks/useFetch";
import { bulkDeleteTransactions } from "@/lib/actions/account";
import BarLoader from "react-spinners/BarLoader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw,
  Clock,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Search,
  Trash,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ITEMS_PER_PAGE = 10;

const RECURRING_INTERVALS = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

const TransactionTable = ({
  transactions,
}: {
  transactions: Transaction[];
}) => {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // Tracks which transactions are selected
  const [searchTerm, setSearchTerm] = useState(""); // Stores the search text for filtering transactions.
  const [typeFilter, setTypeFilter] = useState(""); // Stores the selected transaction type (Income or Expense).
  const [recurringFilter, setRecurringFilter] = useState(""); // Stores recurring/non-recurring filter value.
  const [currentPage, setCurrentPage] = useState(1); // Tracks the current page number for pagination.
  // Tracks how transactions are sorted (by date, amount, or category).
  const [sortConfig, setSortConfig] = useState({
    field: "date",
    direction: "desc",
  });

  // Memoized filtered and sorted transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions]; // get the full list of transactions.

    // Check if the transaction description includes the search term (case-insensitive).
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter((transaction) =>
        transaction.description?.toLowerCase().includes(searchLower)
      );
    }

    // Check if the transaction type matches the selected type (Income/Expense).
    if (typeFilter) {
      result = result.filter((transaction) => transaction.type === typeFilter);
    }

    // Check if the recurring filter is set to "recurring" or "non-recurring".
    if (recurringFilter) {
      result = result.filter((transaction) => {
        if (recurringFilter === "recurring") return transaction.isRecurring;
        return !transaction.isRecurring;
      });
    }

    /**
     * - The sort method takes a comparison function as an argument. This function defines the sorting logic.
     * - The comparison function compares two transactions (a and b) at a time and determines their order in the sorted array.
     */
    result.sort((a, b) => {
      let comparison = 0; // store the result of the comparison between a and b.

      switch (sortConfig.field) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          // Subtracting the timestamps gives a +ve number if a.date is later than b.date else -ve
          break;
        case "amount":
          comparison = Number(a.amount) - Number(b.amount);
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
        default:
          comparison = 0;
      }

      /**
       * - If the sorting direction is "asc", the comparison result is returned as is.
       * - If the sorting direction is "desc", the comparison result is multiplied by -1 to switch the order.
       */
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });

    return result;
  }, [transactions, searchTerm, typeFilter, recurringFilter, sortConfig]);

  /**
   * Handles sorting of transactions by a specific field (e.g., date, amount, category).
   * Steps:
   * 1. Check if the selected field is already the current sort field.
   * 2. If the field is the same, toggle the sort direction (ascending to descending or vice versa).
   * 3. If the field is different, set the new field and default to ascending order.
   * 4. Update the sort configuration state, which triggers a re-render and re-sorting of transactions.
   */
  const handleSort = (field: string) => {
    setSortConfig((current) => ({
      field,
      direction:
        current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  /**
   * Handles selecting or deselecting a transaction by its ID.
   * Steps:
   * 1. Check if the transaction ID is already in the selectedIds array.
   * 2. If it is, remove it from the array (deselect).
   * 3. If it is not, add it to the array (select).
   * 4. Update the selectedIds state, which triggers a re-render to reflect the selection.
   */
  const handleSelect = (id: string | undefined) => {
    if (!id) return; // Skip if id is undefined
    
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  /**
   * Handles selecting or deselecting all transactions on the current page.
   * Steps:
   * 1. Check if all transactions on the current page are already selected.
   * 2. If they are, clear the selectedIds array (deselect all).
   * 3. If they are not, add all transaction IDs from the current page to the selectedIds array (select all).
   * 4. Update the selectedIds state, which triggers a re-render to reflect the selection.
   */
  const handleSelectAll = () => {
    setSelectedIds((current) =>
      current.length === paginatedTransactions.length
        ? []
        : paginatedTransactions.filter(t => t.id !== undefined).map((t) => t.id as string)
    );
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setRecurringFilter("");
    setCurrentPage(1);
    setSelectedIds([]);
  };

  // Delete transactions
  const {
    loading: deleteLoading,
    fn: deleteFn,
  } = useFetch(bulkDeleteTransactions);

  /**
   * Handles bulk deletion of selected transactions.
   * Steps:
   * 1. Display a confirmation dialog to confirm the deletion.
   * 2. If the user cancels, do nothing.
   * 3. If the user confirms, call the deleteFn function with the selected transaction IDs.
   * 4. The deleteFn function sends a request to the server to delete the transactions.
   * 5. Once the deletion is complete, the component re-renders to reflect the updated list of transactions.
   */
  const handleBulkDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedIds.length} transactions?`
      )
    )
      return;

    deleteFn(selectedIds);
  };

  /**
   * Calculates the total number of pages based on the number of filtered transactions and the items per page.
   */
  const totalPages = Math.ceil(
    filteredAndSortedTransactions.length / ITEMS_PER_PAGE
  );

  /**
   * Paginates the filtered and sorted transactions based on the current page.
   * Steps:
   * 1. Calculate the start index for the current page: (currentPage - 1) * ITEMS_PER_PAGE.
   * 2. Use Array.slice to extract the transactions for the current page.
   * 3. Return the subset of transactions for the current page.
   */
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedTransactions.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );
  }, [filteredAndSortedTransactions, currentPage]);

  /**
   * Handles changing the current page.
   * Steps:
   * 1. Update the currentPage state to the new page number.
   * 2. Clear the selectedIds array to reset the selection when the page changes.
   * 3. This triggers a re-render, showing the transactions for the new page.
   */
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setSelectedIds([]); // Clear selections on page change
  };

  return (
    <div className="space-y-4">
      {/* Loading Indicator */}
      {deleteLoading && (
        <BarLoader className="mt-4" width={"100%"} color="#9333ea" />
      )}

      {/* Filters Section */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => {
              // Update the search term and reset the current page to 1
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8"
          />
        </div>

        {/* Filters and Bulk Actions */}
        <div className="flex gap-2">
          {/* Type Filter Dropdown */}
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              // Update the type filter and reset the current page to 1
              setTypeFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
            </SelectContent>
          </Select>

          {/* Recurring Filter Dropdown */}
          <Select
            value={recurringFilter}
            onValueChange={(value) => {
              // Update the recurring filter and reset the current page to 1
              setRecurringFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Transactions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recurring">Recurring Only</SelectItem>
              <SelectItem value="non-recurring">Non-recurring Only</SelectItem>
            </SelectContent>
          </Select>

          {/* Bulk Delete Button (Visible when transactions are selected) */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete Selected ({selectedIds.length})
              </Button>
            </div>
          )}

          {/* Clear Filters Button (Visible when filters are applied) */}
          {(searchTerm || typeFilter || recurringFilter) && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleClearFilters}
              title="Clear filters"
            >
              <X className="h-4 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-md border">
        <Table>
          {/* Table Header */}
          <TableHeader>
            <TableRow>
              {/* Checkbox for Selecting All Transactions */}
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    // Check if all transactions on the current page are selected
                    selectedIds.length === paginatedTransactions.length &&
                    paginatedTransactions.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>

              {/* Date Column with Sorting */}
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center">
                  Date
                  {/* Show sorting indicator (up/down arrow) */}
                  {sortConfig.field === "date" &&
                    (sortConfig.direction === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>

              {/* Description Column */}
              <TableHead>Description</TableHead>

              {/* Category Column with Sorting */}
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("category")}
              >
                <div className="flex items-center">
                  Category
                  {/* Show sorting indicator (up/down arrow) */}
                  {sortConfig.field === "category" &&
                    (sortConfig.direction === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>

              {/* Amount Column with Sorting */}
              <TableHead
                className="cursor-pointer text-right"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center justify-end">
                  Amount
                  {/* Show sorting indicator (up/down arrow) */}
                  {sortConfig.field === "amount" &&
                    (sortConfig.direction === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>

              {/* Recurring Column */}
              <TableHead>Recurring</TableHead>

              {/* Actions Column */}
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody>
            {/* Show "No transactions found" message if the list is empty */}
            {paginatedTransactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              // Render each transaction row
              paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  {/* Checkbox for Selecting the Transaction */}
                  <TableCell>
                    <Checkbox
                      checked={transaction.id ? selectedIds.includes(transaction.id) : false}
                      onCheckedChange={() => handleSelect(transaction.id)}
                    />
                  </TableCell>

                  {/* Date */}
                  <TableCell>
                    {format(new Date(transaction.date), "PP")}
                  </TableCell>

                  {/* Description */}
                  <TableCell>{transaction.description}</TableCell>

                  {/* Category (with colored badge) */}
                  <TableCell className="capitalize">
                    <span
                      style={{
                        background: categoryColors[transaction.category],
                      }}
                      className="px-2 py-1 rounded text-white text-sm"
                    >
                      {transaction.category}
                    </span>
                  </TableCell>

                  {/* Amount (colored based on type: Income/Expense) */}
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      transaction.type === "EXPENSE"
                        ? "text-red-500"
                        : "text-green-500"
                    )}
                  >
                    {transaction.type === "EXPENSE" ? "-" : "+"}$
                    {Number(transaction.amount).toFixed(2)}
                  </TableCell>

                  {/* Recurring Badge (with tooltip for next date) */}
                  <TableCell>
                    {transaction.isRecurring ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant="secondary"
                              className="gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200"
                            >
                              <RefreshCw className="h-3 w-3" />
                              {transaction.recurringInterval &&
                                RECURRING_INTERVALS[
                                  transaction.recurringInterval
                                ]}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <div className="font-medium">Next Date:</div>
                              <div>
                                {format(
                                  new Date(transaction.nextRecurringDate ?? 0),
                                  "PPP"
                                )}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        One-time
                      </Badge>
                    )}
                  </TableCell>

                  {/* Actions Dropdown (Edit/Delete) */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/transaction/create?edit=${transaction.id}`
                            )
                          }
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => transaction.id && deleteFn([transaction.id])}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {/* Previous Page Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Current Page Indicator */}
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>

          {/* Next Page Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;
