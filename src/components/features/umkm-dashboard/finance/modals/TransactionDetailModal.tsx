"use client";

import { useState } from "react";
import { Copy, Check, Info, ReceiptText } from "lucide-react";
import { Transaction } from "@/types/umkm-dashboard.types";
import { TransactionStatusBadge } from "../TransactionStatusBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { getTypeLabel, getReferenceLabel } from "../finance.utils";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal";
import { cn } from "@/lib/utils";

interface TransactionDetailModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, isOpen, onClose }: TransactionDetailModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(transaction.id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent className="max-w-lg w-full p-0 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xl">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-200/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full grid place-items-center bg-orange-50 border border-orange-200/80 text-orange-600 shrink-0">
              <ReceiptText size={18} strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wide block">Bukti Pembayaran</span>
              <h3 className="font-display text-base font-extrabold text-ink-950 tracking-tight leading-tight">
                Resi #{transaction.id.slice(-6).toUpperCase()}
              </h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm max-h-[70vh]">
          <ResponsiveModalDescription className="hidden" />

          {/* Amount & Status Block */}
          <div className="text-center py-5 bg-orange-50/60 rounded-xl border border-orange-200/80 space-y-2">
            <span className="text-[10px] font-extrabold text-orange-950 uppercase tracking-wide block">Total Nominal</span>
            <div className={cn(
              "font-display text-2xl sm:text-3xl font-black tracking-tight",
              transaction.type === "refund" ? "text-emerald-600" : "text-orange-600"
            )}>
              {transaction.type === "refund" ? "+" : ""}{formatCurrency(transaction.amount)}
            </div>
            <div className="flex justify-center mt-1">
              <TransactionStatusBadge status={transaction.status} />
            </div>
          </div>

          {/* Fields List */}
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between items-start gap-4">
              <span className="text-text-muted font-semibold shrink-0">ID Transaksi</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-xs text-ink-950 font-bold truncate">{transaction.id}</span>
                <button
                  onClick={handleCopyId}
                  className="p-1 hover:bg-neutral-100 rounded-md text-neutral-400 hover:text-ink-950 transition-colors cursor-pointer shrink-0"
                  title="Salin ID"
                >
                  {isCopied ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>

            {transaction.midtransOrderId && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-text-muted font-semibold">ID Pesanan Midtrans</span>
                <span className="font-mono text-xs text-ink-950 font-bold">{transaction.midtransOrderId}</span>
              </div>
            )}

            <div className="border-t border-dashed border-neutral-200" />

            <div className="flex justify-between items-center gap-4">
              <span className="text-text-muted font-semibold">Tanggal Dibuat</span>
              <span className="text-ink-950 font-bold">{formatDate(transaction.createdAt)}</span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-text-muted font-semibold">Jenis Transaksi</span>
              <span className="text-ink-950 font-bold">{getTypeLabel(transaction.type)}</span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-text-muted font-semibold">Kategori Fitur</span>
              <span className="text-ink-950 font-bold">{getReferenceLabel(transaction.referenceType)}</span>
            </div>

            <div className="border-t border-dashed border-neutral-200" />

            <div className="space-y-1.5">
              <span className="text-text-muted font-semibold block">Deskripsi Transaksi</span>
              <p className="text-ink-950 font-medium leading-relaxed bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/60">
                {transaction.description}
              </p>
            </div>
          </div>

          {/* Guarantee Note */}
          <div className="bg-orange-50/80 border border-orange-200/90 rounded-xl p-3.5 flex items-start gap-2.5">
            <Info size={16} className="text-orange-600 shrink-0 mt-0.5" />
            <div className="text-xs text-orange-950 leading-relaxed font-medium">
              Seluruh transaksi di Marketiv terlindungi oleh sistem garansi pembayaran otomatis demi keamanan UMKM dan Kreator.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-neutral-200/50 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-8 rounded-full border border-neutral-200/80 bg-white text-ink-950 text-xs font-bold shadow-2xs hover:bg-neutral-50 active:scale-[.98] transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
