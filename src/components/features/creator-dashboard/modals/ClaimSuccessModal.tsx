"use client";

import Link from "next/link";
import { CheckCircle2, Sparkles, X, ArrowRight } from "lucide-react";
import {
  ResponsiveModal,
  ResponsiveModalContent,
} from "@/components/ui/responsive-modal";

interface ClaimSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignTitle?: string;
  onViewActiveWork?: () => void;
}

export function ClaimSuccessModal({
  isOpen,
  onClose,
  campaignTitle,
  onViewActiveWork,
}: ClaimSuccessModalProps) {
  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent
        showCloseButton={false}
        className="max-w-md w-full p-0 overflow-hidden rounded-3xl border border-emerald-200/50 bg-white shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
      >
        {/* Header: Dark Navy & Ambient Emerald Glow Banner */}
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-[#0c1626] via-[#121f38] to-[#1d1b4e] p-6 text-center text-white">
          {/* Ambient Lighting Glow */}
          <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-violet-500/20 blur-2xl pointer-events-none" />

          {/* Top Bar: Close Button */}
          <div className="relative z-10 flex justify-end mb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Success Animated Icon Badge */}
          <div className="relative z-10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 text-white shadow-[0_10px_28px_rgba(16,185,129,0.4)] ring-4 ring-white/10">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>

          {/* Header Title & Subtitle */}
          <div className="relative z-10 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-[10px] font-black text-emerald-300 border border-emerald-500/30 uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Berhasil Diklaim</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
              Lowongan Berhasil Diklaim!
            </h3>
            {campaignTitle && (
              <p className="text-xs font-semibold text-slate-300 truncate max-w-xs mx-auto">
                {campaignTitle}
              </p>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 min-h-0 text-center">
          <p className="text-xs text-neutral-600 font-medium leading-relaxed max-w-xs mx-auto">
            Pekerjaan kampanye ini telah resmi ditambahkan ke daftar <strong className="text-neutral-900 font-extrabold">Pekerjaan Aktif</strong> Anda.
          </p>

          {/* Step Guide Card */}
          <div className="rounded-2xl bg-violet-50/80 border border-violet-200/60 p-4 text-left space-y-1.5">
            <span className="block text-[10px] font-black uppercase tracking-wider text-violet-700">
              Langkah Selanjutnya
            </span>
            <p className="text-xs font-semibold text-violet-950 leading-relaxed">
              Silakan baca arahan produk, siapkan materi konten video TikTok Anda, dan ajukan tautan bukti tayang sebelum batas waktu.
            </p>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="shrink-0 p-5 sm:p-6 border-t border-neutral-200/60 bg-white flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] px-4 rounded-full border border-neutral-200/80 bg-neutral-100/80 text-neutral-700 font-extrabold text-xs hover:bg-neutral-200 hover:text-neutral-900 transition-all cursor-pointer"
          >
            Cari Lowongan Lain
          </button>

          <Link
            href="/dashboard/kreator/pekerjaan-aktif"
            onClick={() => {
              onClose();
              if (onViewActiveWork) onViewActiveWork();
            }}
            className="flex-1 min-h-[44px] px-4 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white font-black text-xs tracking-wide shadow-[0_10px_28px_rgba(91,54,245,0.35)] hover:shadow-[0_14px_36px_rgba(91,54,245,0.5)] hover:-translate-y-0.5 active:scale-[.98] transition-all flex items-center justify-center gap-1.5"
          >
            <span>Pekerjaan Aktif</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
