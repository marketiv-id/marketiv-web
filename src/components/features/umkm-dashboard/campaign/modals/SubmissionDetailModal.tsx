"use client";

import Image from "next/image";
import { CampaignSubmission } from "@/types/umkm-dashboard.types";
import { formatCompactNumber, formatCurrency, formatDate } from "@/lib/formatters";
import { getFraudStatusLabel } from "@/lib/dashboard-labels";
import { DashboardBadge } from "../../shared";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal";

interface SubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: CampaignSubmission;
}

export function SubmissionDetailModal({
  isOpen,
  onClose,
  submission,
}: SubmissionDetailModalProps) {
  const isPending = submission.validationStatus === "pending";

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent className="max-w-lg w-full p-6 rounded-2xl border border-neutral-200/80 bg-white shadow-xl">
        <ResponsiveModalHeader className="border-b border-neutral-200/50 pb-3 mb-4">
          <ResponsiveModalTitle className="text-base sm:text-lg font-extrabold text-ink-950">
            Detail Bukti Konten Kreator
          </ResponsiveModalTitle>
          <ResponsiveModalDescription className="text-xs text-text-muted mt-0.5">
            Rincian postingan video dan riwayat validasi resmi Admin Marketiv.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        {/* Creator Info Header */}
        <div className="flex items-center gap-3 mb-5 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-200">
            {submission.creatorAvatarUrl ? (
              <Image
                src={submission.creatorAvatarUrl}
                alt={submission.creatorName}
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center font-bold text-neutral-500 bg-neutral-100">
                {submission.creatorName.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h4 className="font-extrabold text-ink-950 text-xs sm:text-sm leading-none">{submission.creatorName}</h4>
            <span className="text-[11px] text-text-muted mt-1 inline-block">Platform: {submission.platform}</span>
          </div>
          <div className="ml-auto">
            <DashboardBadge type="status" value={submission.validationStatus} />
          </div>
        </div>

        {/* Grid Stats */}
        <div className="grid grid-cols-2 gap-3.5 mb-5">
          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60">
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
              Tayangan
            </span>
            <span className="text-sm font-black text-text-primary font-display">
              {isPending
                ? "Belum diverifikasi"
                : submission.actualViews > 0
                ? formatCompactNumber(submission.actualViews)
                : "—"}
            </span>
          </div>
          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60">
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
              Indikator Risiko
            </span>
            <span className="text-xs font-extrabold text-text-primary">
              {submission.fraudStatus ? getFraudStatusLabel(submission.fraudStatus) : "—"}
            </span>
          </div>
          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60">
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
              Hadiah Terhitung
            </span>
            <span className="text-sm font-black text-emerald-700 font-display">
              {isPending ? "Belum dihitung" : formatCurrency(submission.releasedFund)}
            </span>
          </div>
          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60">
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
              Tanggal Dikirim
            </span>
            <span className="text-xs font-semibold text-text-primary mt-0.5 block">
              {formatDate(submission.submittedAt)}
            </span>
          </div>
        </div>

        {/* Post Link */}
        <div className="mb-5">
          <span className="block text-xs font-extrabold text-text-primary uppercase tracking-wide mb-2">
            Tautan Video Sosial Media
          </span>
          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60 gap-2 min-w-0">
            <span className="text-xs text-text-primary truncate font-medium flex-1 min-w-0 font-mono">
              {submission.contentUrl}
            </span>
            <a
              href={submission.contentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-orange-600 font-extrabold hover:underline shrink-0"
            >
              Buka Video ↗
            </a>
          </div>
        </div>

        {/* Catatan Validasi Admin */}
        {submission.rejectedReason && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl">
            <span className="block text-[10px] font-extrabold text-amber-900 uppercase tracking-wide mb-1">
              Catatan Validasi Admin Marketiv
            </span>
            <p className="text-xs text-amber-950 font-medium leading-relaxed">{submission.rejectedReason}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end w-full pt-2 border-t border-neutral-200/50">
          <button
            type="button"
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
