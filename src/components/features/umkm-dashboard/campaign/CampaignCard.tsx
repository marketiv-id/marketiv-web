"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Users, Eye, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompactViews, formatCompactCurrency, formatCurrency } from "@/lib/formatters";
import type { Campaign, CampaignStatus } from "@/types/umkm-dashboard.types";
import { DashboardBadge } from "../shared/DashboardBadge";
import { DashboardActionMenu } from "../shared/DashboardActionMenu";

interface CampaignCardProps {
  campaign: Campaign;
  pendingCount?: number;
  validCount?: number;
  disputeCount?: number;
  onDuplicate: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onExport: () => void;
  onEdit: () => void;
}

// Cover gradients per niche — dipertahankan karena nilai dinamis runtime
const COVER_GRADIENTS: Record<string, string> = {
  kuliner:    "linear-gradient(135deg, #fb923c, #c2410c)",
  fashion:     "linear-gradient(135deg, #16a34a, #84cc16)",
  pariwisata: "linear-gradient(135deg, #1e3a5f, #93c5fd)",
  edukasi:    "linear-gradient(135deg, #a78bfa, #6d28d9)",
  kecantikan: "linear-gradient(135deg, #f472b6, #be185d)",
  lainnya:    "linear-gradient(135deg, #6b7280, #374151)",
};

// Status dot color untuk badge overlay di atas cover — tetap inline karena dinamis
const STATUS_DOT_COLOR: Record<CampaignStatus, string> = {
  active:    "text-emerald-700 border-emerald-200/60",
  draft:     "text-ink-500 border-ink-200/60",
  paused:    "text-orange-700 border-orange-200/60",
  completed: "text-blue-700 border-blue-200/60",
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  active:    "Aktif",
  draft:     "Draft",
  paused:    "Dijeda",
  completed: "Selesai",
};

// Niche (kategori) color configuration untuk label bervariasi sesuai best practices
const NICHE_COLOR_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  kuliner:    { bg: "bg-orange-50",     text: "text-orange-700",    border: "border-orange-200/40" },
  fashion:     { bg: "bg-emerald-50",    text: "text-emerald-700",   border: "border-emerald-200/40" },
  pariwisata: { bg: "bg-blue-50",       text: "text-blue-700",      border: "border-blue-200/40" },
  edukasi:    { bg: "bg-purple-50",     text: "text-purple-700",    border: "border-purple-200/40" },
  kecantikan: { bg: "bg-rose-50",       text: "text-rose-600",      border: "border-rose-200/40" },
  lainnya:    { bg: "bg-neutral-50",    text: "text-neutral-600",   border: "border-neutral-200/40" },
};

export function CampaignCard({
  campaign,
  pendingCount = 0,
  validCount = 0,
  disputeCount = 0,
  onDuplicate,
  onCancel,
  onDelete,
  onPublish,
  onExport,
  onEdit,
}: CampaignCardProps) {
  const router = useRouter();

  const coverGradient = COVER_GRADIENTS[campaign.niche] ?? COVER_GRADIENTS.kuliner;
  
  // Progress Budget (uang) sesuai 00_BACKEND (spentAmount/totalBudget)
  const progressPercent = campaign.totalBudgetEscrow > 0
    ? Math.min(100, Math.round((campaign.usedBudget / campaign.totalBudgetEscrow) * 100))
    : 0;

  const isCancelDisabled = campaign.status === "completed";
  const isEditVisible    = campaign.status === "draft";
  const isDeleteVisible  = campaign.status === "draft";

  const actionItems = [
    { label: "Lihat Detail",       onClick: () => router.push(`/dashboard/umkm/campaign/${campaign.id}`) },
    ...(isDeleteVisible ? [{ label: "Terbitkan Campaign", onClick: onPublish }] : []),
    ...(isEditVisible ? [{ label: "Edit Draft", onClick: onEdit }] : []),
    { label: "Duplikasi Campaign", onClick: onDuplicate },
    { label: "Unduh Laporan",      onClick: onExport    },
    ...(!isCancelDisabled ? [{ label: "Batalkan Campaign", onClick: onCancel, danger: true }] : []),
    ...(isDeleteVisible ? [{ label: "Hapus Draft", onClick: onDelete, danger: true }] : []),
  ];

  const statusDotClass = STATUS_DOT_COLOR[campaign.status] ?? STATUS_DOT_COLOR.active;
  const statusLabel    = STATUS_LABEL[campaign.status] ?? "Aktif";
  
  const nicheCfg = NICHE_COLOR_CONFIG[campaign.niche] ?? NICHE_COLOR_CONFIG.lainnya;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-3xs hover:shadow-md hover:-translate-y-1 hover:border-orange-300/60 transition-all duration-300">
      {/* Cover Header */}
      <div className="relative h-32 sm:h-36 w-full overflow-hidden shrink-0" style={{ background: coverGradient }}>
        {campaign.thumbnailUrl ? (
          <Image
            src={campaign.thumbnailUrl}
            alt={campaign.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={(e) => {
              // URL rusak/file hilang → sembunyikan, gradient cover tetap tampil.
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 18% 24%, rgba(255,255,255,.75) 0 12%, transparent 13%)," +
                "radial-gradient(circle at 82% 22%, rgba(255,255,255,.35) 0 10%, transparent 11%)," +
                "linear-gradient(180deg, transparent 40%, rgba(15,23,42,.35))",
            }}
          />
        )}

        {/* Dark overlay for contrast and text/badge readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,.70) 0%, rgba(0,0,0,.15) 50%, rgba(0,0,0,.35) 100%)" }}
        />

        {/* Status Badge Overlay */}
        <span
          className={cn(
            "absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 border text-[11px] font-extrabold shadow-3xs backdrop-blur-md",
            statusDotClass
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current" />
          {statusLabel}
        </span>

        {/* Action menu */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <DashboardActionMenu items={actionItems} />
        </div>

        {/* Budget Chip Overlay */}
        <span className="absolute bottom-2.5 right-3 px-2.5 py-1 rounded-xl bg-white/95 border border-white/40 shadow-xs text-xs font-black text-slate-900 tracking-tight backdrop-blur-md">
          {formatCompactCurrency(campaign.totalBudgetEscrow)}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
        {/* Niche & Title & Brief */}
        <div className="space-y-1 min-w-0">
          <span className={cn(
            "inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
            nicheCfg.bg,
            nicheCfg.text,
            nicheCfg.border
          )}>
            {campaign.niche}
          </span>
          <h3 className="font-display text-sm sm:text-base font-black text-slate-900 leading-snug tracking-tight truncate group-hover:text-orange-600 transition-colors">
            {campaign.title}
          </h3>
          <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed min-w-0">
            {campaign.brief}
          </p>
        </div>

        {/* CPM / Komisi Rate Box */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50/90 border border-orange-200/70 text-xs font-bold text-orange-800 w-fit select-none">
          <span className="text-orange-600 font-extrabold">💰</span>
          <span>Komisi: <strong className="font-black text-orange-950">{formatCurrency(campaign.pricePerThousandViews)}</strong> / 1K tayangan</span>
        </div>

        {/* Metadata stats row */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 border-y border-slate-100 py-2">
          <span className="flex items-center gap-1">
            <Users size={13} className="text-slate-400 shrink-0" />
            <span>{campaign.usedQuota}/{campaign.creatorQuota} Kreator</span>
          </span>
          <span className="flex items-center gap-1">
            <Eye size={13} className="text-slate-400 shrink-0" />
            <span>{campaign.totalViews === undefined ? "—" : formatCompactViews(campaign.totalViews)} Views</span>
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span>{new Date(campaign.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
          </span>
        </div>

        {/* Budget Progress */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center justify-between gap-1.5 text-xs min-w-0">
            <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-400 shrink-0">
              Anggaran Terpakai
            </span>
            <div className="flex items-center gap-1 text-xs font-extrabold text-slate-900 whitespace-nowrap shrink-0">
              <span>{formatCompactCurrency(campaign.usedBudget)}</span>
              <span className="text-slate-400 font-normal">/</span>
              <span className="text-slate-400 font-normal">{formatCompactCurrency(campaign.totalBudgetEscrow)}</span>
              <span
                className={cn(
                  "ml-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-black border",
                  progressPercent >= 100
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-orange-50 text-orange-700 border-orange-200"
                )}
              >
                {progressPercent}%
              </span>
            </div>
          </div>
          <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 relative bg-gradient-to-r",
                progressPercent >= 100
                  ? "from-emerald-500 to-teal-400"
                  : "from-[#fb7a18] to-[#ea580c]"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Content Validation Badges */}
        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 text-xs min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">
            Validasi
          </span>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <DashboardBadge tone="amber" className="h-5 px-2 text-[10px] font-bold">
              {pendingCount} Pending
            </DashboardBadge>
            <DashboardBadge tone="green" className="h-5 px-2 text-[10px] font-bold">
              {validCount} Valid
            </DashboardBadge>
            {disputeCount > 0 && (
              <DashboardBadge tone="red" className="h-5 px-2 text-[10px] font-bold">
                {disputeCount} Sengketa
              </DashboardBadge>
            )}
          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="mt-auto pt-2">
          <Link
            href={`/dashboard/umkm/campaign/${campaign.id}`}
            className={cn(
              "flex items-center justify-center h-10 w-full rounded-xl text-xs font-extrabold transition-all duration-200 no-underline cursor-pointer select-none text-center shadow-xs",
              campaign.status === "draft"
                ? "bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0"
                : "bg-gradient-to-b from-[#fb7a18] to-[#ea580c] text-white hover:shadow-md hover:from-[#ea580c] hover:to-[#c2410c] hover:-translate-y-0.5 active:translate-y-0"
            )}
          >
            {campaign.status === "draft" ? "Lanjutkan Draft" : "Lihat Detail"}
          </Link>
        </div>
      </div>
    </div>
  );
}
