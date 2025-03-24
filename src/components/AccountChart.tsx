"use client";

import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from "@/types/transaction";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const DATE_RANGES = {
  "7D": { label: "Last 7 Days", days: 7 },
  "1M": { label: "Last Month", days: 30 },
  "3M": { label: "Last 3 Months", days: 90 },
  "6M": { label: "Last 6 Months", days: 180 },
  ALL: { label: "All Time", days: null as null },
};

type DateRangeKey = keyof typeof DATE_RANGES;

// interface for daily transaction data
interface DailyData {
  date: string;
  income: number;
  expense: number;
}

// interface for totals
interface Totals {
  income: number;
  expense: number;
}

const AccountChart = ({ transactions }: { transactions: Transaction[] }) => {
  const [dateRange, setDateRange] = useState<DateRangeKey>("1M");

  const filteredData = useMemo(() => {
    const range = DATE_RANGES[dateRange];
    const now = new Date();

    // Calculate the start date based on the selected range
    // If range.days is null (ALL option), use Unix epoch start (Jan 1, 1970)
    const startDate = range.days
      ? startOfDay(subDays(now, range.days)) // Go back X days from today
      : startOfDay(new Date(0)); // Start from beginning of time

    // Filter transactions within date range and only completed ones
    const filtered = transactions.filter(
      (t) =>
        new Date(t.date) >= startDate &&
        new Date(t.date) <= endOfDay(now) &&
        t.status === TransactionStatus.COMPLETED
    );

    // Group transactions by date to consolidate daily totals
    // This creates an object where keys are formatted dates and values are daily totals
    const grouped = filtered.reduce<Record<string, DailyData>>(
      (acc, transaction) => {
        // Format the transaction date to a readable string (e.g., "Mar 24")
        const date = format(new Date(transaction.date), "MMM dd");

        // Initialize the accumulator entry for this date if it doesn't exist
        if (!acc[date]) {
          acc[date] = { date, income: 0, expense: 0 };
        }

        // Convert the transaction amount from string to number
        // This is necessary because the Transaction type defines amount as string
        const amount = parseFloat(transaction.amount);

        // Add the amount to either income or expense based on transaction type
        if (transaction.type === TransactionType.INCOME) {
          acc[date].income += amount;
        } else {
          acc[date].expense += amount;
        }

        return acc;
      },
      {}
    );

    // Convert the grouped object to an array for Recharts
    // Sort chronologically by date to ensure proper timeline display
    return Object.values(grouped).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [transactions, dateRange]);

  // Calculate totals for the selected period
  const totals = useMemo(() => {
    return filteredData.reduce<Totals>(
      (acc, day) => ({
        income: acc.income + day.income, // Sum all daily incomes
        expense: acc.expense + day.expense, // Sum all daily expenses
      }),
      { income: 0, expense: 0 }
    );
  }, [filteredData]);

  return (
    <Card>
      {/* Header section with title and date range selector */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <CardTitle className="text-base font-normal">
          Transaction Overview
        </CardTitle>
        {/* Date range dropdown selector */}
        <Select
          defaultValue={dateRange}
          onValueChange={(value) => setDateRange(value as DateRangeKey)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            {/* Map each date range option to a select item */}
            {Object.entries(DATE_RANGES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      {/* Main content section with totals and chart */}
      <CardContent>
        {/* Summary statistics section */}
        <div className="flex justify-around mb-6 text-sm">
          {/* Total Income display */}
          <div className="text-center">
            <p className="text-muted-foreground">Total Income</p>
            <p className="text-lg font-bold text-green-500">
              ${totals.income.toFixed(2)}
            </p>
          </div>

          {/* Total Expenses display */}
          <div className="text-center">
            <p className="text-muted-foreground">Total Expenses</p>
            <p className="text-lg font-bold text-red-500">
              ${totals.expense.toFixed(2)}
            </p>
          </div>

          {/* Net Amount display (Income - Expenses) */}
          <div className="text-center">
            <p className="text-muted-foreground">Net</p>
            <p
              className={`text-lg font-bold ${
                totals.income - totals.expense >= 0
                  ? "text-green-500" // Green for positive net
                  : "text-red-500" // Red for negative net
              }`}
            >
              ${(totals.income - totals.expense).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Bar chart container with fixed height */}
        <div className="h-[300px]">
          {/* ResponsiveContainer ensures the chart resizes with its parent */}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              {/* Grid lines for better readability */}
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              {/* X-axis configuration (date) */}
              <XAxis
                dataKey="date"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />

              {/* Y-axis configuration (dollar amount) */}
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`} // Format as currency
              />

              {/* Tooltip for hovering over bars */}
              <Tooltip
                formatter={(value) => {
                  if (typeof value === "number") {
                    return [`$${value.toFixed(2)}`, undefined]; // Format value with 2 decimal places
                  }
                  return [`$${value}`, undefined];
                }}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />

              {/* Legend for distinguishing income vs expense */}
              <Legend />

              {/* Income bars (green) */}
              <Bar
                dataKey="income"
                name="Income"
                fill="#22c55e" // Green color
                radius={[4, 4, 0, 0]} // Rounded top corners
              />

              {/* Expense bars (red) */}
              <Bar
                dataKey="expense"
                name="Expense"
                fill="#ef4444" // Red color
                radius={[4, 4, 0, 0]} // Rounded top corners
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountChart;
