"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/formatters";

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal";

interface PaymentSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  finalPrice: number;
}

export function PaymentSimulationModal({
  isOpen,
  onClose,
  onConfirm,
  finalPrice,
}: PaymentSimulationModalProps) {
  const [isPaying, setIsPaying] = useState(false);

  const handleConfirm = async () => {
    if (isPaying) return;
    setIsPaying(true);
    try {
      await onConfirm();
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent className="max-w-md w-full p-6 sm:p-8">
        <ResponsiveModalHeader className="flex items-center gap-3 border-b border-border-soft pb-4">
          <div className="h-10 w-10 rounded-full bg-primary-50 text-primary border border-primary-100 flex items-center justify-center shadow-2xs shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="text-left">
            <ResponsiveModalTitle className="text-sm sm:text-base font-extrabold text-text-primary uppercase tracking-wider leading-none">
              Bayar dengan Midtrans
            </ResponsiveModalTitle>
            <ResponsiveModalDescription className="text-[10px] text-text-muted mt-1 block">
              Dana ditahan sementara di sistem Dana Aman setelah pembayaran dikonfirmasi server.
            </ResponsiveModalDescription>
          </div>
        </ResponsiveModalHeader>

        {/*
          TANPA BARIS FEE. Rate Card Order adalah seller-side (ADR-008): UMKM
          membayar PERSIS harga yang disepakati, potongan 2% ditanggung kreator
          saat escrow dirilis. Versi sebelumnya menambahkan 2% ke tagihan UMKM —
          bukan cuma salah menurut ADR, tapi juga akan ditolak `create-payment`,
          yang mensyaratkan nominalnya sama persis dengan `order.amount` (409).
        */}
        <div className="bg-neutral-50/70 p-4.5 rounded-2xl border border-border-soft/60 space-y-2.5 text-xs font-semibold text-text-secondary mt-4">
          <div className="flex items-center justify-between text-text-muted">
            <span>Harga Kesepakatan</span>
            <span className="font-extrabold text-text-primary">{formatCurrency(finalPrice)}</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-dashed border-border-soft text-text-primary">
            <span className="font-extrabold">Total Pembayaran Anda</span>
            <span className="text-sm sm:text-base font-extrabold text-primary">{formatCurrency(finalPrice)}</span>
          </div>
          <p className="text-[9px] text-text-muted font-semibold leading-relaxed pt-1">
            Tanpa biaya tambahan. Komisi Platform 2% dipotong dari pendapatan kreator, bukan dari
            pembayaran Anda.
          </p>
        </div>

        {/* Metode pembayaran dipilih di halaman Midtrans, bukan di sini — daftar
            statis yang dulu ada tidak pernah dikirim ke gateway. */}
        <div className="rounded-xl bg-primary-50/15 border border-primary-100/35 p-3 flex gap-2 items-start text-[9px] text-text-muted leading-relaxed font-semibold my-4">
          <span className="h-4.5 w-4.5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
            i
          </span>
          <span>
            Setelah lanjut, Anda diarahkan ke halaman pembayaran Midtrans untuk memilih metode
            (Virtual Account, QRIS, atau e-wallet).
          </span>
        </div>

        {/* Actions */}
        <ResponsiveModalFooter className="flex items-center gap-3 w-full border-t border-border-soft/60 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPaying}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-text-secondary text-xs font-bold transition-all duration-200 cursor-pointer select-none text-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPaying}
            className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white text-xs font-bold transition-all duration-200 cursor-pointer border border-primary hover:border-primary-600 shadow-xs text-center select-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPaying ? "Memproses…" : "Lanjut ke Midtrans"}
          </button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
