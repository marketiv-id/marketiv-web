"use client";

import { useState } from "react";
import type { Transaction } from "@/types/umkm-dashboard.types";
import { formatCurrency } from "@/lib/formatters";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { CreditCard, ShieldCheck } from "lucide-react";

interface PendingPaymentModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onCancelPayment: (paymentId: string) => Promise<void>;
}

export function PendingPaymentModal({
  transaction,
  isOpen,
  onClose,
  onCancelPayment,
}: PendingPaymentModalProps) {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      await onCancelPayment(transaction.id);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent className="max-w-md w-full rounded-2xl border border-neutral-200/80 bg-white p-5 sm:p-6 shadow-xl">
        <ResponsiveModalHeader className="border-b border-neutral-200/60 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ResponsiveModalTitle className="text-base sm:text-lg font-extrabold text-ink-950">
              Selesaikan Pembayaran
            </ResponsiveModalTitle>
            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
              Menunggu Bayar
            </span>
          </div>
          <ResponsiveModalDescription className="text-xs text-text-muted mt-1">
            Kode Transaksi: <span className="font-mono text-ink-800 font-bold">{transaction.midtransOrderId ?? transaction.id}</span>
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        {/* Payment Summary Box */}
        <div className="rounded-xl bg-orange-50/80 border border-orange-200/90 p-4 mb-5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <span className="block text-[10px] font-extrabold text-orange-950 uppercase tracking-wide">
                Total yang Harus Dibayar
              </span>
              <span className="text-[11px] text-orange-800 font-medium block">
                Termasuk biaya transaksi & layanan
              </span>
            </div>
            <span className="text-xl font-black text-orange-600 font-display shrink-0">
              {formatCurrency(transaction.totalAmount ?? transaction.amount)}
            </span>
          </div>
          
          {(transaction.feeAmount ?? 0) > 0 && (
            <div className="mt-3 pt-3 border-t border-orange-200/50 space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-orange-800/80">
                <span>Target Anggaran</span>
                <span>{formatCurrency(transaction.baseAmount ?? transaction.amount)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-medium text-orange-800/80">
                <span>Biaya Platform (2%)</span>
                <span>{formatCurrency(transaction.feeAmount ?? 0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          {transaction.redirectUrl ? (
            <a
              href={transaction.redirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full min-h-[46px] px-6 rounded-full border border-orange-900/20 bg-gradient-to-b from-[#fb7a18] to-primary-600 text-white text-xs sm:text-sm font-extrabold shadow-[0_10px_28px_rgba(234,88,12,.28),inset_0_1px_0_rgba(255,255,255,.22)] hover:shadow-[0_14px_36px_rgba(234,88,12,.36)] hover:-translate-y-px active:scale-[.98] transition-all cursor-pointer whitespace-nowrap"
            >
              <CreditCard className="w-4 h-4 shrink-0" strokeWidth={2.5} />
              <span>Bayar Sekarang via Midtrans</span>
            </a>
          ) : (
            <div className="text-xs font-medium text-amber-900 leading-relaxed bg-amber-50 border border-amber-200/80 rounded-xl p-3.5">
              Tautan pembayaran tidak tersedia atau telah kedaluwarsa. Silakan batalkan transaksi ini untuk membuat pembayaran baru.
            </div>
          )}

          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full min-h-[44px] px-5 rounded-full border border-neutral-200/80 bg-white text-ink-950 text-xs sm:text-sm font-bold shadow-2xs hover:bg-neutral-50 active:scale-[.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {cancelling ? "Membatalkan…" : "Batalkan Transaksi Ini"}
          </button>
        </div>

        {/* Security reassurance footer */}
        <div className="mt-4 pt-3 border-t border-neutral-200/50 flex items-center justify-center gap-1.5 text-[11px] text-text-muted text-center font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Status pembayaran akan diperbarui otomatis setelah dana ditransfer.</span>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
