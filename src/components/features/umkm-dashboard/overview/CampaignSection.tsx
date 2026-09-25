"use client";

import Link from "next/link";
import Image from "next/image";
import { Users, Eye, Calendar, ChevronRight, Plus } from "lucide-react";
import type { Campaign, CampaignStatus } from "@/types/umkm-dashboard.types";
import { formatCurrency } from "@/lib/formatters";

interface CampaignSectionProps {
  campaigns?: Campaign[];
  isLoading?: boolean;
  onCreateClick?: () => void;
  onViewAllClick?: () => void;
}

const STATUS_CONFIG: Record<CampaignStatus, { label: string; bg: string; color: string; border: string }> = {
  active: { label: "Aktif", bg: "#f1fbf5", color: "#177b42", border: "rgba(22,163,74,.22)" },
  draft: { label: "Konsep", bg: "#f8fafc", color: "#687386", border: "rgba(148,163,184,.28)" },
  paused: { label: "Dijeda", bg: "#fff7ed", color: "#bd4b0b", border: "rgba(251,146,60,.24)" },
  completed: { label: "Selesai", bg: "#f0f6ff", color: "#2d5bd1", border: "rgba(96,165,250,.25)" },
};

function CampaignSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden bg-white border border-neutral-200/80 rounded-[28px] shadow-[0_12px_36px_-12px_rgba(0,0,0,0.05)]">
      {/* Cover placeholder */}
      <div className="h-[160px] bg-[#edf1f5] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent" style={{ animation: "shimmer 1.45s infinite" }} />
      </div>
      {/* Body placeholder */}
      <div className="p-5 flex flex-col gap-3">
        {[80, 60, 100, 70].map((w, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-lg bg-[#edf1f5]"
            style={{ width: `${w}%`, height: i === 2 ? 8 : 14 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent" style={{ animation: "shimmer 1.45s infinite" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function formatViews(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}jt`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}rb`;
  return String(num);
}

function formatBudget(num: number): string {
  if (num >= 1000000) return `Rp ${(num / 1000000).toFixed(1)}jt`;
  if (num >= 1000) return `Rp ${(num / 1000).toFixed(0)}rb`;
  return `Rp ${num}`;
}



function CampaignCard({ campaign }: { campaign: Campaign }) {
  const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.active;
  const progressPercent = campaign.totalBudgetEscrow > 0 ? Math.min(100, Math.round((campaign.usedBudget / campaign.totalBudgetEscrow) * 100)) : 0;
  
  // Custom cover gradients based on niche
  const coverGradients: Record<string, string> = {
    kuliner: "linear-gradient(135deg, #ea580c, #c2410c)",
    fashion: "linear-gradient(135deg, #16a34a, #15803d)",
    pariwisata: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    edukasi: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    kecantikan: "linear-gradient(135deg, #db2777, #be185d)",
    lainnya: "linear-gradient(135deg, #475569, #334155)",
  };

  const coverGradient = coverGradients[campaign.niche] || coverGradients.kuliner;

  return (
    <Link
      href={`/dashboard/umkm/campaign/${campaign.id}`}
      className="flex flex-col overflow-hidden bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)] cursor-pointer hover-card-animate h-full justify-between transition-all"
    >
      {/* Cover Header */}
      <div
        className="h-28 sm:h-36 relative overflow-hidden shrink-0 flex flex-col justify-between p-2.5 sm:p-3.5"
        style={{
          background: coverGradient,
        }}
      >
        {campaign.thumbnailUrl && (
          <Image
            src={campaign.thumbnailUrl}
            alt={campaign.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        )}
        {/* Subtle overlay gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,.70) 0%, rgba(0,0,0,.15) 50%, rgba(0,0,0,.35) 100%)" }}
        />

        {/* Top Header Row: Status badge */}
        <div className="relative z-10 flex items-center justify-between gap-1">
          <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-white/95 backdrop-blur-md shadow-xs border border-white/40">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ background: statusCfg.color }} />
            <span className="text-[9px] sm:text-[11px] font-black tracking-tight" style={{ color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          </div>

          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-black/25 backdrop-blur-md text-white text-[8px] sm:text-[10px] font-black uppercase tracking-wider border border-white/20">
            {campaign.niche}
          </span>
        </div>

        {/* Bottom Banner Row: Budget chip */}
        <div className="relative z-10 flex justify-end">
          <div className="px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-md shadow-xs border border-white/60 text-slate-900 font-black text-[10px] sm:text-xs tracking-tight">
            {formatBudget(campaign.totalBudgetEscrow)}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-5 flex flex-col justify-between flex-1 gap-2 sm:gap-3">
        <div className="space-y-1.5 sm:space-y-2">
          {/* Title */}
          <h3 className="font-display font-black text-slate-900 text-xs sm:text-base leading-snug tracking-tight line-clamp-2 h-8 sm:h-10">
            {campaign.title}
          </h3>

          {/* CPM / Reward Rate Info */}
          <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-orange-50 border border-orange-200/80 text-orange-700 text-[10px] sm:text-xs font-black flex-wrap">
            <span className="hidden sm:inline">Komisi:</span>
            <span>{formatCurrency(campaign.pricePerThousandViews)}</span>
            <span className="text-orange-500 font-semibold text-[9px] sm:text-xs">/ 1rb Tayangan</span>
          </div>
        </div>

        {/* Stats row with high contrast icons & text */}
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-extrabold text-slate-700 flex-wrap pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Users size={12} className="text-slate-500 shrink-0 sm:w-3.5 sm:h-3.5" />
            <span>{campaign.usedQuota}/{campaign.creatorQuota} <span className="hidden sm:inline">Kreator</span></span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Eye size={12} className="text-slate-500 shrink-0 sm:w-3.5 sm:h-3.5" />
            <span>{campaign.totalViews === undefined ? "—" : formatViews(campaign.totalViews)} <span className="hidden sm:inline">tayangan</span></span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 hidden sm:flex">
            <Calendar size={12} className="text-slate-500 shrink-0 sm:w-3.5 sm:h-3.5" />
            <span>{new Date(campaign.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
          </div>
        </div>

        {/* Progress & Budget */}
        <div className="pt-1 sm:pt-2">
          <div className="flex items-center justify-between gap-1 mb-1 text-[10px] sm:text-xs font-black">
            <span className="text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              ANGGARAN
            </span>
            <div className="flex items-center gap-1 text-slate-900 font-extrabold text-[9px] sm:text-xs whitespace-nowrap shrink-0">
              <span>{formatBudget(campaign.usedBudget)}</span>
              <span className="text-slate-300 font-normal">/</span>
              <span className="text-slate-500">{formatBudget(campaign.totalBudgetEscrow)}</span>
              <span
                className={`px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded text-[8px] sm:text-[10px] font-black border ${
                  progressPercent >= 100
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-orange-50 text-orange-600 border-orange-200"
                }`}
              >
                {progressPercent}%
              </span>
            </div>
          </div>

          <div className="h-1.5 sm:h-2 w-full rounded-full bg-slate-100 overflow-hidden relative shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-700 relative ${
                progressPercent >= 100
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : "bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400"
              }`}
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 rounded-full h-1/2" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Empty Placeholder Card for UMKM ──────────────────────────────────────────

const UMKM_EMPTY_CAMPAIGN_VARIANTS = [
  {
    badge: "Buat Baru",
    icon: Plus,
    iconBg: "bg-orange-50 text-orange-600 border-orange-200/80",
    title: "Buat Kampanye Baru",
    desc: "Siapkan brief produk dan reward per views untuk kreator.",
    href: "/dashboard/umkm/campaign/buat",
    btnLabel: "Buat Kampanye",
    isPrimary: true,
  },
  {
    badge: "Kolaborasi",
    icon: Users,
    iconBg: "bg-blue-50 text-blue-600 border-blue-200/80",
    title: "Jelajahi Kreator",
    desc: "Temukan kreator terbaik untuk kolaborasi paket Rate Card.",
    href: "/dashboard/umkm/kreator",
    btnLabel: "Cari Kreator",
    isPrimary: false,
  },
];

interface EmptyPlaceholderCampaignCardProps {
  variantIndex?: number;
  onCreateClick?: () => void;
}

function EmptyPlaceholderCampaignCard({ variantIndex = 0, onCreateClick }: EmptyPlaceholderCampaignCardProps) {
  const variant = UMKM_EMPTY_CAMPAIGN_VARIANTS[variantIndex % UMKM_EMPTY_CAMPAIGN_VARIANTS.length];
  const Icon = variant.icon;

  return (
    <div className="flex flex-col justify-between overflow-hidden bg-slate-50/60 border border-dashed border-slate-300/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-xs hover:border-orange-300 hover:bg-orange-50/20 transition-all duration-300 min-h-[280px] sm:min-h-[380px]">
      <div className="space-y-2.5 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div className={`h-8 w-8 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-transform hover:scale-105 ${variant.iconBg}`}>
            <Icon size={16} className="sm:w-5 sm:h-5" />
          </div>
          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500 border border-slate-200 bg-white shadow-3xs">
            {variant.badge}
          </span>
        </div>

        <div className="space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1">
          <h3 className="font-display font-black text-slate-900 text-xs sm:text-base leading-snug tracking-tight">
            {variant.title}
          </h3>
          <p className="text-[10px] sm:text-xs font-medium text-slate-500 leading-relaxed line-clamp-2 sm:line-clamp-3">
            {variant.desc}
          </p>
        </div>
      </div>

      <div className="pt-3 sm:pt-4 border-t border-dashed border-slate-200 mt-auto">
        {variant.isPrimary && onCreateClick ? (
          <button
            type="button"
            onClick={onCreateClick}
            className="w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl bg-gradient-to-b from-[#fb7a18] to-[#ea580c] text-white text-[10px] sm:text-xs font-extrabold shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Plus size={13} className="sm:w-3.5 sm:h-3.5" />
            <span>{variant.btnLabel}</span>
          </button>
        ) : (
          <Link
            href={variant.href}
            className="w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100/80 text-slate-700 text-[10px] sm:text-xs font-extrabold transition-all duration-200 shadow-3xs hover:border-slate-300"
          >
            <span>{variant.btnLabel}</span>
            <ChevronRight size={13} className="text-orange-500 sm:w-3.5 sm:h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function CampaignSection({ campaigns = [], isLoading = false, onCreateClick, onViewAllClick }: CampaignSectionProps) {
  const visibleCampaigns = campaigns.slice(0, 2);
  const emptySlotsCount = Math.max(0, 2 - visibleCampaigns.length);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="inline-flex items-center gap-2 text-orange-600 text-[10px] sm:text-xs font-black tracking-widest uppercase mb-1">
            <span className="w-3.5 h-0.5 rounded-full bg-orange-500" />
            Kampanye
          </div>
          <h2 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
            Kampanye Terbaru Anda
          </h2>
        </div>

        {!isLoading && (
          <div className="flex gap-2">
            <button
              onClick={onViewAllClick}
              className="inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] px-2.5 sm:px-3 rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 text-[10px] sm:text-xs font-extrabold shadow-xs hover:bg-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Lihat Semua</span>
              <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              onClick={onCreateClick}
              className="inline-flex items-center gap-1 min-h-[32px] sm:min-h-[34px] px-2.5 sm:px-3 rounded-xl bg-gradient-to-b from-[#fb7a18] to-[#ea580c] text-white text-[10px] sm:text-xs font-extrabold shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
            >
              <Plus size={13} className="sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Buat Kampanye Baru</span>
              <span className="sm:hidden">Buat Baru</span>
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          {[1, 2].map((i) => (
            <CampaignSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          {visibleCampaigns.map((camp) => (
            <CampaignCard key={camp.id} campaign={camp} />
          ))}
          {Array.from({ length: emptySlotsCount }).map((_, idx) => (
            <EmptyPlaceholderCampaignCard
              key={`empty-campaign-${idx}`}
              variantIndex={idx}
              onCreateClick={onCreateClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
