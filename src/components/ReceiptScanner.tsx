"use client";

import { useRef, useEffect } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useFetch from "@/hooks/useFetch";
import { scanReceipt } from "@/lib/actions/transaction";
import { Transaction, TransactionType, TransactionStatus } from "@/types/transaction";

interface ReceiptScannerProps {
  onScanComplete: (data: Transaction) => void;
  buttonVariant?: "default" | "outline" | "ghost";
  buttonText?: string;
  loadingText?: string;
  maxFileSizeMB?: number;
}

/**
 * A component that scans receipts and extracts transaction data
 */
export const ReceiptScanner = ({
  onScanComplete,
  buttonVariant = "outline",
  buttonText = "Scan Receipt with AI",
  loadingText = "Scanning Receipt...",
  maxFileSizeMB = 5,
}: ReceiptScannerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxFileSize = maxFileSizeMB * 1024 * 1024;

  const {
    loading: scanReceiptLoading,
    fn: scanReceiptFn,
    data: scannedData,
  } = useFetch(scanReceipt, {
    showErrorToast: true,
    onError: () => {
      // Errors are already shown via toast by the useFetch hook
    }
  });

  const handleReceiptScan = async (file: File) => {
    if (!file) return;
    
    if (file.size > maxFileSize) {
      toast.error(`File size should be less than ${maxFileSizeMB}MB`);
      return;
    }

    try {
      await scanReceiptFn(file);
    } catch {
      // Error is handled by useFetch hook
    }
  };

  // Convert scanned data to transaction format
  const mapScanDataToTransaction = (scanData: unknown): Transaction => {
    // Create a properly typed interface for receipt data
    interface ReceiptData {
      type?: string;
      amount?: number | string;
      date?: string | Date;
      description?: string;
      category?: string;
      merchantName?: string;
    }
    
    // Cast to our specific interface instead of any
    const data = scanData as ReceiptData;
    
    return {
      id: "", // Will be assigned by server
      type: (data.type as TransactionType) || TransactionType.EXPENSE,
      amount: data.amount?.toString() || "0",
      description: data.description || "",
      date: new Date(data.date || new Date()),
      category: data.category || "Uncategorized",
      isRecurring: false,
      status: TransactionStatus.COMPLETED,
      userId: "", // Will be assigned by server
      accountId: "", // Will be selected by user
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  useEffect(() => {
    if (scannedData && !scanReceiptLoading) {
      try {
        const transactionData = mapScanDataToTransaction(scannedData);
        onScanComplete(transactionData);
        toast.success("Receipt scanned successfully");
      } catch {
        toast.error("Failed to process receipt data");
        // No need for console.error, error is displayed to user via toast
      }
    }
  // Only run this effect when these dependencies change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedData, scanReceiptLoading]);

  return (
    <div className="flex items-center gap-4">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleReceiptScan(file);
        }}
      />
      <Button
        type="button"
        variant={buttonVariant}
        className="w-full h-10 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 animate-gradient hover:opacity-90 transition-opacity text-white hover:text-white"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanReceiptLoading}
      >
        {scanReceiptLoading ? (
          <>
            <Loader2 className="mr-2 animate-spin" />
            <span>{loadingText}</span>
          </>
        ) : (
          <>
            <Camera className="mr-2" />
            <span>{buttonText}</span>
          </>
        )}
      </Button>
    </div>
  );
};
