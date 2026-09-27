"use client";

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal";
import { Save } from "lucide-react";

interface SaveDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SaveDraftModal({ isOpen, onClose, onConfirm }: SaveDraftModalProps) {
  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent className="max-w-sm w-full p-6 sm:p-7 text-center rounded-2xl border border-neutral-200/80 bg-white shadow-xl">
        <ResponsiveModalHeader className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-orange-50 text-orange-600 border border-orange-200/80 flex items-center justify-center mx-auto shadow-2xs mb-3">
            <Save className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <ResponsiveModalTitle className="text-base font-extrabold text-ink-950 text-center">
            Simpan sebagai Draf?
          </ResponsiveModalTitle>
          <ResponsiveModalDescription className="text-xs text-text-muted leading-relaxed text-center mt-1.5">
            Kampanye ini akan disimpan sebagai draf. Anda dapat melanjutkannya kembali kapan saja melalui dashboard.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="flex items-center gap-2.5 w-full pt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] px-4 rounded-full border border-neutral-200/80 bg-white text-ink-950 text-xs font-bold shadow-2xs hover:bg-neutral-50 active:scale-[.98] transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 min-h-[44px] px-4 rounded-full border border-orange-900/20 bg-gradient-to-b from-[#fb7a18] to-primary-600 text-white text-xs font-extrabold shadow-[0_10px_28px_rgba(234,88,12,.28),inset_0_1px_0_rgba(255,255,255,.22)] hover:shadow-[0_14px_36px_rgba(234,88,12,.36)] hover:-translate-y-px active:scale-[.98] transition-all cursor-pointer whitespace-nowrap"
          >
            Simpan Draf
          </button>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
