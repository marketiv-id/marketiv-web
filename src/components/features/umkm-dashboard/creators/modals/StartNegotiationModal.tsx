"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createConversation } from "@/services/umkm/umkm-dashboard.service";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal";

interface StartNegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  packageId: string;
  packageName: string;
  packagePrice: string;
}

export function StartNegotiationModal({
  isOpen,
  onClose,
  creatorId,
  creatorName,
  packageId,
  packageName,
  packagePrice,
}: StartNegotiationModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStart = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await createConversation(creatorId);
      if (!res.success || !res.data) {
        const message = res.error ?? "Gagal membuka ruang negosiasi.";
        toast.error(
          process.env.NODE_ENV === "production" ? message : `${message} [${res.code ?? "?"}]`
        );
        return;
      }
      onClose();
      router.push(`/dashboard/umkm/negosiasi/${res.data}?packageId=${encodeURIComponent(packageId)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuka ruang negosiasi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent className="max-w-lg w-full p-0 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xl">
        <div>
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-200/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wide">Diskusi & Negosiasi</span>
              <h3 className="text-base font-extrabold text-ink-950 tracking-tight mt-0.5">
                Buka Obrolan dengan {creatorName}
              </h3>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <ResponsiveModalDescription className="hidden" />

            {/* Paket acuan */}
            <div className="rounded-xl bg-orange-50/80 border border-orange-200/80 p-3.5 flex justify-between items-center text-xs font-bold">
              <div className="space-y-0.5">
                <span className="text-[10px] text-orange-950 uppercase block font-extrabold tracking-wide">Paket Acuan</span>
                <span className="text-ink-950 text-xs font-bold">{packageName}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-text-muted uppercase block font-bold tracking-wide">Harga Acuan</span>
                <span className="text-orange-600 text-xs font-black font-display">{packagePrice}</span>
              </div>
            </div>

            {/* Urutan alur */}
            <div className="rounded-xl border border-neutral-200/60 bg-neutral-50 p-4 space-y-2.5">
              <span className="block text-xs font-extrabold text-text-primary uppercase tracking-wide">
                Langkah Diskusi
              </span>
              <ol className="space-y-2">
                {[
                  "Diskusikan kebutuhan produk Anda bersama kreator lewat chat.",
                  "Kirim kesepakatan harga & batas waktu dari dalam ruang obrolan.",
                  "Kreator menyetujui rincian kesepakatan.",
                  "Lakukan pembayaran aman yang disimpan di sistem Marketiv.",
                ].map((step, i) => (
                  <li key={step} className="flex gap-2.5 items-start">
                    <span className="h-4.5 w-4.5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-xs text-text-secondary leading-relaxed font-medium">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] px-4 rounded-full border border-neutral-200/80 bg-white text-ink-950 text-xs font-bold shadow-2xs hover:bg-neutral-50 active:scale-[.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleStart}
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] px-4 rounded-full border border-orange-900/20 bg-gradient-to-b from-[#fb7a18] to-primary-600 text-white text-xs font-extrabold shadow-[0_10px_28px_rgba(234,88,12,.28),inset_0_1px_0_rgba(255,255,255,.22)] hover:shadow-[0_14px_36px_rgba(234,88,12,.36)] hover:-translate-y-px active:scale-[.98] transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? "Membuka…" : "Masuk ke Obrolan Negosiasi"}
              </button>
            </div>
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
