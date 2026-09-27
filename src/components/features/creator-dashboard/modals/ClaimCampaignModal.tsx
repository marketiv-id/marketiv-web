"use client";

import { useState } from "react";
import { CreatorJob } from "@/types/creator-dashboard";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Check,
  X,
  FileText,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  ResponsiveModal,
  ResponsiveModalContent,
} from "@/components/ui/responsive-modal";

interface ClaimCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: CreatorJob | null;
  onConfirm: (job: CreatorJob) => void | Promise<void>;
  isClaiming?: boolean;
}

const CLAIM_RULES = [
  {
    key: "brief",
    title: "Kesesuaian Brief & Larangan",
    desc: "Saya menyetujui pengerjaan video sesuai panduan dan larangan (do's & don'ts) pada brief produk.",
  },
  {
    key: "privacy",
    title: "Publikasi Video & Bukti Tayang",
    desc: "Saya akan memposting video di akun sosial media pribadi dan melampirkan tautan URL tayang sebagai bukti resmi.",
  },
  {
    key: "retention",
    title: "Masa Retensi Konten (30 Hari)",
    desc: "Saya tidak akan menghapus atau menyembunyikan postingan video sekurang-kurangnya 30 hari setelah masa tayang.",
  },
  {
    key: "views",
    title: "Perhitungan Reward Berdasar Views",
    desc: "Saya menyetujui bahwa pembayaran dihitung dari views tervalidasi yang dikunci oleh sistem Admin Marketiv.",
  },
] as const;

export function ClaimCampaignModal({
  isOpen,
  onClose,
  job,
  onConfirm,
  isClaiming = false,
}: ClaimCampaignModalProps) {
  const [checkedRules, setCheckedRules] = useState<Record<string, boolean>>({
    brief: false,
    privacy: false,
    retention: false,
    views: false,
  });

  if (!job) return null;

  const allRulesChecked = CLAIM_RULES.every((r) => checkedRules[r.key]);

  const toggleRule = (key: string) => {
    setCheckedRules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = async () => {
    if (!allRulesChecked || isClaiming) return;
    await onConfirm(job);
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && !isClaiming && onClose()}>
      <ResponsiveModalContent
        showCloseButton={false}
        className="max-w-lg w-full p-0 overflow-hidden rounded-3xl border border-violet-200/50 bg-white shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
      >
        {/* Modal Header: Premium Dark Gradient Banner */}
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-[#110e2e] via-[#1a144b] to-[#281970] p-5 sm:p-6 text-white">
          {/* Ambient Lighting Background */}
          <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-violet-500/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

          {/* Top Bar: Badge & Custom Single Close Button */}
          <div className="relative z-10 flex items-center justify-between gap-3 mb-3 sm:mb-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500/30 to-indigo-500/20 px-3 py-1 text-[11px] font-extrabold text-violet-300 border border-violet-400/30 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="uppercase tracking-wider">Kontrak Kampanye</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isClaiming}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all cursor-pointer disabled:opacity-50 shrink-0"
              title="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Brand Meta */}
          <div className="relative z-10 space-y-1.5">
            <h3 className="text-lg sm:text-2xl font-black tracking-tight text-white leading-tight">
              Klaim Campaign
            </h3>
            <p className="text-xs font-semibold text-violet-200 truncate max-w-full">
              {job.title}
            </p>

            <div className="flex items-center gap-2 pt-1.5 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 font-bold text-white text-[11px] sm:text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{job.brandName || "Marketiv Client"}</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-md px-2.5 py-1 rounded-lg border border-amber-500/30 font-extrabold text-amber-300 text-[11px] sm:text-xs">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{formatCurrency(job.ratePerThousandViews)} / 1k views</span>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0">
          <div className="space-y-1">
            <p className="text-xs text-neutral-600 font-semibold leading-relaxed">
              Sebelum menyetujui klaim pekerjaan ini, harap baca dan setujui 4 poin ketentuan di bawah:
            </p>
          </div>

          {/* Interactive Checklist Cards */}
          <div className="space-y-2.5">
            {CLAIM_RULES.map((rule) => {
              const isChecked = checkedRules[rule.key];
              return (
                <label
                  key={rule.key}
                  className={cn(
                    "group flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer select-none",
                    isChecked
                      ? "bg-violet-50/70 border-violet-300 shadow-2xs"
                      : "bg-neutral-50/60 border-neutral-200/80 hover:bg-neutral-100/70 hover:border-neutral-300"
                  )}
                >
                  {/* Checkbox asli: satu-satunya cara supaya alur ini bisa
                      diselesaikan dengan keyboard (Tab + Space). */}
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={isChecked}
                    onChange={() => toggleRule(rule.key)}
                    aria-label={rule.title}
                  />

                  {/* Custom Checkbox Box */}
                  <div
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
                      "peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500/70 peer-focus-visible:ring-offset-2",
                      isChecked
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 border-violet-600 text-white shadow-xs scale-105"
                        : "border-neutral-300 bg-white group-hover:border-violet-400"
                    )}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <span
                      className={cn(
                        "block text-xs font-extrabold leading-tight",
                        isChecked ? "text-violet-950" : "text-neutral-800"
                      )}
                    >
                      {rule.title}
                    </span>
                    <span className="block text-[11px] text-neutral-500 font-medium leading-relaxed">
                      {rule.desc}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Modal Sticky Footer Action Buttons */}
        <div className="shrink-0 p-4 sm:p-6 border-t border-neutral-200/60 bg-white flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isClaiming}
            className="flex-1 min-h-[44px] px-4 sm:px-5 rounded-full border border-neutral-200/80 bg-neutral-100/80 text-neutral-700 font-extrabold text-xs hover:bg-neutral-200 hover:text-neutral-900 transition-all cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!allRulesChecked || isClaiming}
            className={cn(
              "flex-1 min-h-[44px] px-4 sm:px-5 rounded-full font-black text-xs tracking-wide transition-all cursor-pointer",
              !allRulesChecked || isClaiming
                ? "bg-neutral-100 text-neutral-400 border border-neutral-200/80 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white shadow-[0_10px_28px_rgba(91,54,245,0.35)] hover:shadow-[0_14px_36px_rgba(91,54,245,0.5)] hover:-translate-y-0.5 active:scale-[.98]"
            )}
          >
            {isClaiming ? "Memproses Klaim…" : "Klaim Sekarang"}
          </button>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
