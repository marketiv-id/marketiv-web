"use client";

import { formatCurrency } from "@/lib/formatters";
import { calculatePlatformFee, calculateTotalPayment } from "@/types/domain";
import { Button } from "@/components/ui/button";
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
  onConfirm: () => void;
  totalBudgetEscrow: number;
}

export function PaymentSimulationModal({
  isOpen,
  onClose,
  onConfirm,
  totalBudgetEscrow,
}: PaymentSimulationModalProps) {
  const platformFee = calculatePlatformFee(totalBudgetEscrow);
  const totalPayment = calculateTotalPayment(totalBudgetEscrow);

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent className="max-w-sm w-full p-6 sm:p-7">
        <ResponsiveModalHeader className="flex flex-col items-center">
          <div className="h-11 w-11 rounded-full bg-primary-50 text-primary border border-primary-100/10 flex items-center justify-center mx-auto shadow-2xs mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <ResponsiveModalTitle className="text-sm sm:text-base font-extrabold text-text-primary uppercase tracking-wider text-center">
            Simpan Dana Kampanye
          </ResponsiveModalTitle>
          <ResponsiveModalDescription className="text-[11px] text-text-muted leading-relaxed text-center mt-2">
            Kampanye disimpan sebagai konsep lalu Anda diarahkan ke pembayaran Midtrans untuk menyimpan dana kampanye.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        {/* Invoice breakdown */}
        <div className="rounded-2xl border border-border-soft/60 bg-neutral-50/20 p-4 space-y-2 text-xs font-semibold text-text-secondary mt-4">
          <div className="flex justify-between items-center text-text-muted text-[11px]">
            <span>Dana Kampanye</span>
            <span className="font-bold text-text-primary">{formatCurrency(totalBudgetEscrow)}</span>
          </div>
          <div className="flex justify-between items-center text-text-muted text-[11px]">
            <span>Biaya Platform (2%)</span>
            <span className="font-bold text-text-primary">{formatCurrency(platformFee)}</span>
          </div>
          <div className="flex justify-between items-center text-text-primary text-[11px] pt-2 border-t border-dashed border-border-soft mt-1">
            <span className="font-extrabold">Total Pembayaran</span>
            <span className="text-xs font-extrabold text-primary">{formatCurrency(totalPayment)}</span>
          </div>
        </div>

        {/* Informational notice: metode pembayaran dipilih di Midtrans Snap */}
        <div className="rounded-xl bg-primary-50/20 border border-primary-100/30 p-3.5 flex gap-2.5 items-start my-4">
          <span className="h-4.5 w-4.5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
            i
          </span>
          <p className="text-[11px] text-text-muted leading-relaxed font-medium">
            Metode pembayaran (QRIS, GoPay, OVO, ShopeePay, Virtual Account) dipilih langsung di dalam Midtrans Snap.
          </p>
        </div>

        {/* Action Buttons */}
        <ResponsiveModalFooter className="flex items-center gap-3 w-full border-t border-border-soft/60 pt-4.5">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-10 text-xs bg-white border border-border-soft hover:bg-neutral-50 text-text-primary"
          >
            Batal
          </Button>
          <Button
            variant="default"
            onClick={onConfirm}
            className="flex-1 h-10 text-xs bg-primary text-white hover:bg-primary/90"
          >
            Lanjut ke Pembayaran Midtrans
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

export { SimulatedSnapModal } from "@/components/features/demo/SimulatedSnapModal";
