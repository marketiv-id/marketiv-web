"use client";

/* eslint-disable react-hooks/purity */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Briefcase,
  FileCheck,
  Clock,
  Wallet,
  ArrowDownToLine,
  Eye,
  Tag,
  MessageCircle,
  Search,
  Users,
  Star,
  BadgeCheck,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  CreatorProfile,
  CreatorMetric,
  CreatorActiveWork,
  CreatorActivity,
  CreatorJob,
} from "@/types/creator-dashboard";
import {
  DashboardBadge,
  DashboardStateCard,
} from "@/components/features/dashboard/shared";
import { MetricCard } from "@/components/ui/metric-card";
import { claimCampaign } from "@/services/creator/creator-dashboard.service";
import { formatCurrency, formatCompactCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { ProfileCompletionCard } from "@/components/features/dashboard/shared/ProfileCompletionCard";

// ─── Niche theme maps ────────────────────────────────────────────────────────

const NICHE_GRADIENTS: Record<string, [string, string]> = {
  kuliner:    ["#1e3a8a", "#6d28d9"],
  fashion:     ["#1d4ed8", "#7c3aed"],
  pariwisata: ["#0369a1", "#6366f1"],
  edukasi:    ["#1e40af", "#4f46e5"],
  kecantikan: ["#2563eb", "#7c3aed"],
  lainnya:    ["#1e1b4b", "#6d28d9"],
};

const NICHE_LABELS: Record<string, string> = {
  kuliner:    "Kuliner",
  fashion:     "Fashion",
  pariwisata: "Travel",
  edukasi:    "Edukasi",
  kecantikan: "Beauty",
  lainnya:    "Lainnya",
};

const CREATOR_BRAND_GRADIENT =
  "linear-gradient(135deg, var(--color-kreator-600), var(--color-kreator-gradient-end))";
const CREATOR_PROGRESS_GRADIENT =
  "linear-gradient(90deg, var(--color-kreator-600), var(--color-kreator-gradient-end))";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toString();
};

// ─── EmptyPlaceholderCampaignCard ───────────────────────────────────────────

// ─── EmptyPlaceholderCampaignCard ───────────────────────────────────────────

const EMPTY_CARD_VARIANTS = [
  {
    badge: "Eksplorasi",
    icon: Search,
    iconBg: "bg-violet-50 text-violet-600 border-violet-200/60",
    title: "Cari Job di Pool",
    desc: "Temukan puluhan kampanye pay-per-view baru dari UMKM lokal.",
    href: "/dashboard/kreator/job-pool",
    btnLabel: "Buka Job Pool",
  },
  {
    badge: "Tips Cuan",
    icon: Sparkles,
    iconBg: "bg-amber-50 text-amber-600 border-amber-200/60",
    title: "Lengkapi Profil",
    desc: "Kreator dengan portofolio lengkap lebih cepat dapat rekomendasi.",
    href: "/dashboard/kreator/settings",
    btnLabel: "Kelola Profil",
  },
  {
    badge: "Rate Card",
    icon: Tag,
    iconBg: "bg-emerald-50 text-emerald-600 border-emerald-200/60",
    title: "Aktifkan Rate Card",
    desc: "Terima tawaran negosiasi langsung dan kolaborasi harga tetap.",
    href: "/dashboard/kreator/rate-card",
    btnLabel: "Atur Rate Card",
  },
  {
    badge: "Reputasi",
    icon: TrendingUp,
    iconBg: "bg-blue-50 text-blue-600 border-blue-200/60",
    title: "Tingkatkan Performa",
    desc: "Posting tepat waktu untuk membuka rekomendasi job prioritas.",
    href: "/dashboard/kreator/pekerjaan-aktif",
    btnLabel: "Lihat Pekerjaan",
  },
];

interface EmptyPlaceholderCampaignCardProps {
  variantIndex?: number;
}

function EmptyPlaceholderCampaignCard({ variantIndex = 0 }: EmptyPlaceholderCampaignCardProps) {
  const variant = EMPTY_CARD_VARIANTS[variantIndex % EMPTY_CARD_VARIANTS.length];
  const Icon = variant.icon;

  return (
    <div className="group flex flex-col justify-between h-full overflow-hidden rounded-2xl sm:rounded-[20px] border border-dashed border-neutral-300/80 bg-neutral-50/60 p-3 sm:p-5 shadow-xs transition-all duration-300 hover:border-violet-300 hover:bg-violet-50/20 min-h-[270px] sm:min-h-[380px]">
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex items-center justify-between">
          <div className={cn("h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-transform group-hover:scale-105 duration-300", variant.iconBg)}>
            <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-neutral-500 border border-neutral-200 bg-white shadow-3xs">
            {variant.badge}
          </span>
        </div>

        <div className="space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1">
          <h4 className="text-xs sm:text-sm font-extrabold text-neutral-800 leading-snug line-clamp-1 sm:line-clamp-2">
            {variant.title}
          </h4>
          <p className="text-[10px] sm:text-[11px] font-medium text-neutral-500 leading-relaxed line-clamp-2 sm:line-clamp-3">
            {variant.desc}
          </p>
        </div>
      </div>

      <div className="pt-3 sm:pt-4 mt-auto border-t border-dashed border-neutral-200">
        <Link
          href={variant.href}
          className="w-full py-1.5 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-[12px] border border-neutral-200 bg-white hover:bg-neutral-100/80 text-neutral-700 text-[9px] sm:text-[11px] font-extrabold flex items-center justify-center gap-1 sm:gap-1.5 transition-all shadow-3xs hover:border-neutral-300"
        >
          <span>{variant.btnLabel}</span>
          <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-600" />
        </Link>
      </div>
    </div>
  );
}

// ─── CampaignCard ────────────────────────────────────────────────────────────

interface CampaignCardProps {
  job: CreatorJob;
  onClaim: (id: string, title: string) => void;
}

function CampaignCard({ job, onClaim }: CampaignCardProps) {
  const isNearLimit  = job.quota - job.usedQuota <= 1;
  const isHighReward = job.ratePerThousandViews >= 6000;
  const slotUsedPct  = Math.min(100, Math.round((job.usedQuota / job.quota) * 100));
  const slotsLeft    = Math.max(0, job.quota - job.usedQuota);
  const [g1, g2]    = NICHE_GRADIENTS[job.niche] ?? NICHE_GRADIENTS.lainnya;
  const nicheLabel   = NICHE_LABELS[job.niche]   ?? "Lainnya";

  return (
    <div className="group flex flex-col h-full overflow-hidden rounded-2xl sm:rounded-[20px] border border-neutral-200/60 bg-white shadow-[0_2px_16px_rgba(15,23,42,.05)] transition-all duration-300 hover:-translate-y-1.5 hover:border-kreator-400/30 hover:shadow-kreator">

      {/* Cover image */}
      <div className="relative w-full overflow-hidden aspect-video bg-neutral-100 shrink-0">
        {job.thumbnailUrl ? (
          <Image
            src={job.thumbnailUrl}
            alt={job.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
          >
            <span className="text-white/25 font-black text-4xl sm:text-6xl leading-none select-none">
              {job.brandName?.charAt(0) ?? "C"}
            </span>
          </div>
        )}

        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,0) 55%)" }}
        />

        {/* Brand overlay row */}
        <div className="absolute bottom-0 left-0 right-0 px-2 sm:px-3 pb-2 sm:pb-3 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="h-5 w-5 sm:h-7 sm:w-7 rounded-md sm:rounded-lg border border-white/25 overflow-hidden shrink-0 relative bg-white/10 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white">
              {job.brandAvatar ? (
                <Image src={job.brandAvatar} alt={job.brandName} fill className="object-cover" sizes="28px" />
              ) : (
                <span>{job.brandName?.charAt(0) ?? "U"}</span>
              )}
            </div>
            <span className="text-white text-[10px] sm:text-xs font-bold drop-shadow-xs truncate">{job.brandName}</span>
          </div>
          <span
            className="shrink-0 px-1.5 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[8px] font-extrabold uppercase tracking-wider text-white border border-white/20"
            style={{ background: "rgba(255,255,255,.18)", backdropFilter: "blur(4px)" }}
          >
            PPV
          </span>
        </div>

        {/* Badge chip */}
        {(isNearLimit || isHighReward) && (
          <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10">
            <span
              className={cn(
                "px-1.5 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[8px] font-extrabold uppercase tracking-wider border shadow-xs",
                isNearLimit
                  ? "bg-amber-500/90 text-white border-amber-300/50"
                  : "bg-violet-600/90 text-white border-violet-400/30"
              )}
              style={{ backdropFilter: "blur(4px)" }}
            >
              {isNearLimit ? "Hampir Penuh" : "Reward Tinggi"}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-2.5 sm:p-4 flex flex-col flex-1 justify-between gap-2 sm:gap-3">
        <div className="space-y-1.5 sm:space-y-2.5">
          <h4 className="text-xs sm:text-sm font-extrabold text-kreator-ink leading-snug line-clamp-2 h-8 sm:h-10" title={job.title}>
            {job.title}
          </h4>

          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <span className="font-display text-xs sm:text-base font-black text-kreator-600 tracking-tight leading-none">
              {formatCurrency(job.ratePerThousandViews)}
            </span>
            <span className="text-[9px] sm:text-[10px] text-neutral-400 font-semibold">/ 1K views</span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[8px] sm:text-[9px] font-bold border border-violet-200/50 uppercase tracking-wide">
              {nicheLabel}
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[10px] font-bold text-neutral-400">
              <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-neutral-400" />
              {slotsLeft} slot
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[8px] sm:text-[9px] font-bold text-neutral-400">
              <span>Slot Tersisa</span>
              <span>{Math.max(0, 100 - slotUsedPct)}%</span>
            </div>
            <div className="w-full h-1 sm:h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(4, 100 - slotUsedPct)}%`,
                  background: CREATOR_PROGRESS_GRADIENT,
                  transition: "width .4s ease",
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 sm:gap-2 pt-1.5 sm:pt-2 mt-auto border-t border-neutral-100">
          <Link
            href="/dashboard/kreator/job-pool"
            className="col-span-1 text-center py-1.5 sm:py-2.5 rounded-lg sm:rounded-[12px] text-[9px] sm:text-[10px] font-extrabold text-neutral-600 border border-neutral-200 hover:bg-neutral-50 transition-all duration-200"
          >
            Detail
          </Link>
          <button
            onClick={() => onClaim(job.id, job.title)}
            className="col-span-2 py-1.5 sm:py-2.5 rounded-lg sm:rounded-[12px] text-white text-[9px] sm:text-[10px] font-extrabold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-center"
            style={{
              background: CREATOR_BRAND_GRADIENT,
              boxShadow: "var(--shadow-kreator)",
            }}
          >
            Klaim Job
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CreatorDashboardViewProps {
  profile: CreatorProfile;
  metrics: CreatorMetric;
  activeWorks: CreatorActiveWork[];
  activities: CreatorActivity[];
  recommendedJobs: CreatorJob[];
  /** Baca ulang seluruh dashboard dari server setelah aksi yang mengubah data. */
  onRefresh: () => Promise<void>;
}

export function CreatorDashboardView({
  profile,
  metrics,
  activeWorks: initialActiveWorks,
  activities: initialActivities,
  recommendedJobs: initialRecommendedJobs,
  onRefresh,
}: CreatorDashboardViewProps) {

  const { user } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  //
  // Seluruh isi layar datang dari props dan dibaca ulang lewat `onRefresh`.
  // Tidak ada lagi salinan state yang bisa dimutasi lokal: setiap "penambalan"
  // di sini pernah berujung pada angka yang berbeda dari isi database.
  const activeWorks = initialActiveWorks;
  const activities = initialActivities;
  const recJobs = initialRecommendedJobs;
  const currentMetrics = metrics;

  const [claimingJobId, setClaimingJobId] = useState<string | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const showToast = (msg: string) => toast.success(msg);

  /**
   * Klaim campaign dari kartu rekomendasi.
   *
   * Dulu fungsi ini memfabrikasi baris Pekerjaan Aktif ber-id
   * `claim_new_${Date.now()}` dan menampilkan toast sukses tanpa memanggil
   * service apa pun — klaimnya tidak pernah tercatat.
   *
   * Setelah klaim diterima server, seluruh dashboard dibaca ulang lewat
   * `onRefresh` alih-alih ditambal di state: metrik, aktivitas, dan daftar
   * pekerjaan aktif semuanya diturunkan dari data server, jadi menambalnya
   * sendiri hanya menghasilkan angka yang berbeda dari kenyataan.
   */
  const handleKlaimJob = async (jobId: string, jobTitle: string) => {
    if (claimingJobId) return;
    setClaimingJobId(jobId);
    const res = await claimCampaign(jobId);
    setClaimingJobId(null);

    if (!res.success) {
      toast.error(res.error ?? "Gagal mengambil pekerjaan ini.");
      return;
    }

    showToast(`Pekerjaan "${jobTitle}" berhasil diklaim!`);
    await onRefresh();
  };

  const getDaysRemaining = (deadlineStr: string): string => {
    const diffDays = Math.ceil((new Date(deadlineStr).getTime() - Date.now()) / 86_400_000);
    if (diffDays < 0) return "Melewati batas";
    if (diffDays === 0) return "Hari ini";
    return `${diffDays} hari lagi`;
  };

  const getActivityDot = (type: string): string => {
    switch (type) {
      case "submission_valid":    return "var(--color-green-500)";
      case "payout":              return "var(--color-red-500)";
      case "negotiation_new":     return "var(--color-amber-500)";
      case "pending_escrow":      return "var(--color-kreator-600)";
      case "campaign_published":  return "var(--color-blue-500)";
      case "claim":               return "var(--color-violet-500)";
      case "claim_expired":       return "var(--color-neutral-400)";
      default:                    return "var(--color-control-disabled)";
    }
  };

  const getActivityBadgeClass = (type: string): string => {
    switch (type) {
      case "submission_valid":    return "bg-green-50 text-green-700 border-green-200/50";
      case "payout":              return "bg-red-50 text-red-700 border-red-200/50";
      case "negotiation_new":     return "bg-amber-50 text-amber-700 border-amber-200/50";
      case "pending_escrow":      return "bg-violet-50 text-violet-700 border-violet-200/50";
      case "campaign_published":  return "bg-blue-50 text-blue-700 border-blue-200/50";
      case "claim":               return "bg-violet-50 text-violet-700 border-violet-200/50";
      case "claim_expired":       return "bg-neutral-100 text-neutral-500 border-neutral-200/50";
      default:                    return "bg-neutral-50 text-neutral-600 border-neutral-200/50";
    }
  };

  const getActivityLabel = (type: string): string => {
    switch (type) {
      case "submission_valid":    return "VALID";
      case "payout":              return "PAYOUT";
      case "negotiation_new":     return "CHAT";
      case "pending_escrow":      return "KLAIM";
      case "campaign_published":  return "KAMPANYE";
      case "claim":               return "KLAIM";
      case "claim_expired":       return "KADALUARSA";
      default:                    return "INFO";
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex-1 overflow-y-auto bg-gradient-to-b from-kreator-page via-kreator-50/30 to-white p-4 sm:p-6 lg:p-8">

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="max-w-[1400px] mx-auto space-y-8">

          {/* 1 ── Master Hero Overview Card (Unified Greeting & 4 KPI Tiles) */}
          <div className="relative rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.04)] overflow-hidden select-none">
            {/* Background subtle mesh glow */}
            <div
              aria-hidden="true"
              className="absolute top-0 right-0 w-80 h-80 rounded-full bg-violet-100/40 blur-3xl pointer-events-none -mr-20 -mt-20"
            />

            <div className="relative z-10">
              {/* Top Header Row */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                {/* Left: Avatar + Greeting + Bio */}
                <div className="flex items-start sm:items-center gap-4 sm:gap-5 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="relative h-16 w-16 sm:h-18 sm:w-18 overflow-hidden rounded-2xl border-2 border-slate-100 bg-violet-50 shadow-xs">
                      {profile.avatarUrl ? (
                        <Image
                          src={profile.avatarUrl}
                          alt={profile.name}
                          fill
                          className="object-cover"
                          sizes="72px"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-violet-600">
                          {profile.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    {profile.isVerified && (
                      <div
                        title="Kreator Terverifikasi"
                        className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-blue-600 grid place-items-center shadow-xs"
                      >
                        <CheckCircle2 size={12} className="text-white fill-blue-600" />
                      </div>
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="flex-1 min-w-0">
                    {/* Role Pill + Status */}
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-[10px] font-black uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" />
                        <span>DASHBOARD KREATOR</span>
                        <Sparkles size={11} className="text-violet-600 ml-0.5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200/60">
                        {profile.niche}
                      </span>
                    </div>

                    {/* Greeting Headline */}
                    <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                      Selamat Datang,{" "}
                      <span className="text-violet-600 font-black">
                        {profile.name}
                      </span>
                    </h1>

                    <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1 max-w-2xl line-clamp-1">
                      {profile.bio || "Ringkasan performa kampanye & kolaborasi konten Anda hari ini."}
                    </p>
                  </div>
                </div>

                {/* Right: Quick Action CTAs */}
                <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                  <Link
                    href="/dashboard/kreator/rate-card"
                    className="flex-1 sm:flex-none h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold shadow-3xs transition-all flex items-center justify-center"
                  >
                    Kelola Rate Card
                  </Link>
                  <Link
                    href="/dashboard/kreator/job-pool"
                    className="flex-1 sm:flex-none h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-black shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={13} />
                    <span>Buka Job Pool</span>
                  </Link>
                </div>
              </div>

              {/* 4 KPI Stat Tiles */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
                {/* 1. Saldo Tersedia */}
                <div className="group p-4 sm:p-5 rounded-2xl border transition-all duration-300 select-none hover:-translate-y-1 hover:shadow-sm flex flex-col justify-between bg-gradient-to-br from-emerald-50/70 via-emerald-50/30 to-white border-emerald-200/80 hover:border-emerald-300">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-emerald-200/60 bg-emerald-500/10 text-emerald-600 shrink-0 transition-transform duration-300 group-hover:scale-105">
                      <Wallet size={16} strokeWidth={2.5} />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Utama
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-0.5">
                      SALDO TERSEDIA
                    </span>
                    <div className="font-display text-xl sm:text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight leading-none">
                      {formatCompactCurrency(currentMetrics.balance)}
                    </div>
                    <span className="block text-[11px] text-slate-500 font-medium mt-1">
                      Tarik ke rekening bank
                    </span>
                  </div>
                </div>

                {/* 2. Pekerjaan Aktif */}
                <div className="group p-4 sm:p-5 rounded-2xl border transition-all duration-300 select-none hover:-translate-y-1 hover:shadow-sm flex flex-col justify-between bg-gradient-to-br from-blue-50/70 via-blue-50/30 to-white border-blue-200/80 hover:border-blue-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-blue-200/60 bg-blue-500/10 text-blue-600 shrink-0 transition-transform duration-300 group-hover:scale-105">
                      <FileCheck size={16} strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-0.5">
                      PEKERJAAN AKTIF
                    </span>
                    <div className="font-display text-xl sm:text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight leading-none">
                      {currentMetrics.activeJobsCount}
                    </div>
                    <span className="block text-[11px] text-slate-500 font-medium mt-1">
                      Sedang dikerjakan
                    </span>
                  </div>
                </div>

                {/* 3. Job Tersedia */}
                <div className="group p-4 sm:p-5 rounded-2xl border transition-all duration-300 select-none hover:-translate-y-1 hover:shadow-sm flex flex-col justify-between bg-gradient-to-br from-violet-50/70 via-violet-50/30 to-white border-violet-200/80 hover:border-violet-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-violet-200/60 bg-violet-500/10 text-violet-600 shrink-0 transition-transform duration-300 group-hover:scale-105">
                      <Briefcase size={16} strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-0.5">
                      JOB TERSEDIA
                    </span>
                    <div className="font-display text-xl sm:text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight leading-none">
                      {currentMetrics.availableJobsCount}
                    </div>
                    <span className="block text-[11px] text-slate-500 font-medium mt-1">
                      Kampanye pool
                    </span>
                  </div>
                </div>

                {/* 4. Pesanan Negosiasi */}
                <div className="group p-4 sm:p-5 rounded-2xl border transition-all duration-300 select-none hover:-translate-y-1 hover:shadow-sm flex flex-col justify-between bg-gradient-to-br from-orange-50/70 via-orange-50/30 to-white border-orange-200/80 hover:border-orange-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-orange-200/60 bg-orange-500/10 text-orange-600 shrink-0 transition-transform duration-300 group-hover:scale-105">
                      <MessageCircle size={16} strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-0.5">
                      PESANAN NEGOSIASI
                    </span>
                    <div className="font-display text-xl sm:text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight leading-none">
                      {currentMetrics.negotiationOrdersCount}
                    </div>
                    <span className="block text-[11px] text-slate-500 font-medium mt-1">
                      Pesanan Rate Card
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ProfileCompletionCard
            isProfileCompleted={user?.isProfileCompleted}
            href="/dashboard/kreator/settings"
          />

          {/* 3 ── Campaign Recommendations — full width 3-col grid */}
          <div>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-base font-black leading-none text-kreator-ink">Rekomendasi Kampanye</h3>
                <p className="text-[10px] text-neutral-400 font-semibold mt-1">
                  Dipilih khusus berdasarkan niche &amp; kualifikasi profil kamu.
                </p>
              </div>
              <Link
                href="/dashboard/kreator/job-pool"
                className="flex items-center gap-1 text-[10px] font-extrabold text-violet-600 hover:text-violet-700 transition-colors"
              >
                Semua Kampanye
                <TrendingUp className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
              {recJobs.slice(0, 4).map((job) => (
                <CampaignCard key={job.id} job={job} onClaim={handleKlaimJob} />
              ))}
              {Array.from({ length: Math.max(0, 4 - Math.min(4, recJobs.length)) }).map((_, idx) => (
                <EmptyPlaceholderCampaignCard key={`empty-card-${idx}`} variantIndex={idx} />
              ))}
            </div>
          </div>

          {/* 5 ── Active Works + Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Active Works (8 col) */}
            <div className="lg:col-span-8">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-base font-black leading-none text-kreator-ink">Pekerjaan Aktif Saya</h3>
                  <p className="text-[10px] text-neutral-400 font-semibold mt-1">Job yang sedang dalam pengerjaan.</p>
                </div>
                <Link href="/dashboard/kreator/pekerjaan-aktif" className="text-[10px] font-extrabold text-violet-600 hover:text-violet-700 transition-colors">
                  Selengkapnya
                </Link>
              </div>

              {activeWorks.length === 0 ? (
                <DashboardStateCard
                  kind="empty"
                  title="Belum Ada Pekerjaan Aktif"
                  description="Kamu belum mengklaim campaign apa pun. Mulai hasilkan uang dengan memilih campaign yang cocok dari Job Pool!"
                  actionLabel="Jelajahi Job Pool"
                  onAction={() => { window.location.href = "/dashboard/kreator/job-pool"; }}
                  icon={<Briefcase className="h-6 w-6" />}
                />
              ) : (
                <div className="space-y-3">
                  {activeWorks.slice(0, 3).map((work) => {
                    const showSubmitBtn = !work.contentUrl && work.status === "claimed";
                    return (
                      <div
                        key={work.id}
                        className="group flex flex-col items-start justify-between gap-4 rounded-[18px] border border-neutral-200/50 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-kreator-400/20 hover:shadow-kreator sm:flex-row sm:items-center sm:p-5"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="h-11 w-11 rounded-[12px] border border-neutral-200/50 overflow-hidden shrink-0 relative bg-neutral-100">
                            {work.brandAvatar && (
                              <Image src={work.brandAvatar} alt={work.brandName} fill className="object-cover" sizes="44px" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-extrabold text-kreator-ink">{work.title}</h4>
                            <p className="text-[10px] font-bold text-neutral-400 mt-0.5 uppercase tracking-wide">
                              {work.brandName} &bull; {new Date(work.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} &bull; {getDaysRemaining(work.deadline)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                          <DashboardBadge type="status" value={String(work.submissionStatus || work.status)} size="sm" />
                          {showSubmitBtn && (
                            <Link
                              href={`/dashboard/kreator/pekerjaan-aktif/${work.id}`}
                              className="px-4 py-2 rounded-[10px] text-white text-[10px] font-extrabold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                              style={{ background: CREATOR_BRAND_GRADIENT, boxShadow: "var(--shadow-kreator-sm)" }}
                            >
                              Submit Bukti
                            </Link>
                          )}
                          {work.contentUrl && (
                            <a href={work.contentUrl} target="_blank" rel="noreferrer"
                              className="px-3.5 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 font-bold text-[10px] rounded-[10px] transition-colors">
                              Lihat Post
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {activeWorks.length < 3 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[18px] border border-dashed border-violet-200/90 bg-gradient-to-r from-violet-50/70 via-purple-50/40 to-fuchsia-50/50 p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-violet-300">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600 border border-violet-200/50">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-extrabold text-neutral-800">Masih Ada Kuota Pekerjaan!</h5>
                          <p className="text-[11px] font-semibold text-neutral-500 mt-0.5">
                            Jelajahi Job Pool untuk mengambil campaign lain dan tingkatkan penghasilanmu.
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/kreator/job-pool"
                        className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-[11px] font-extrabold shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-violet-200 bg-violet-600 hover:bg-violet-700"
                      >
                        <span>Cari Job Baru</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Activity Feed (4 col) */}
            <div className="lg:col-span-4">
              <div className="mb-5">
                <h3 className="text-base font-black leading-none text-kreator-ink">Aktivitas &amp; Penghasilan</h3>
                <p className="text-[10px] text-neutral-400 font-semibold mt-1">Riwayat terbaru akun Anda.</p>
              </div>

              <div className="bg-white rounded-[22px] p-5 border border-neutral-200/50 shadow-[0_2px_12px_rgba(15,23,42,.04)]">
                <div className="relative pl-5 border-l-2 border-violet-100 space-y-5">
                  {activities.slice(0, 4).map((act) => (
                    <div key={act.id} className="relative">
                      <div
                        className="absolute -left-[23px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white shrink-0"
                        style={{ background: getActivityDot(act.type) }}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "inline-flex px-2 py-0.5 rounded-md border text-[8px] font-extrabold uppercase tracking-wider",
                            getActivityBadgeClass(act.type)
                          )}>
                            {getActivityLabel(act.type)}
                          </span>
                          {act.amount !== undefined && (
                            <span className={cn("text-[10px] font-extrabold ml-auto", act.type === "payout" ? "text-red-600" : "text-emerald-600")}>
                              {act.type === "payout" ? "−" : "+"}{formatCurrency(act.amount)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-extrabold leading-tight text-kreator-ink">{act.title}</p>
                        <p className="text-[10px] text-neutral-400 font-semibold leading-normal">{act.description}</p>
                        <span className="block text-[9px] text-neutral-300 font-bold mt-0.5">
                          {new Date(act.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <p className="text-xs text-neutral-400 font-semibold py-4 text-center">Belum ada aktivitas.</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

      {/*
        Modal "Tarik Dana" dan "Submit Bukti" DIHAPUS di sini, bukan disambungkan.

        Keduanya adalah jalur uang yang implementasi lengkapnya sudah ada:
        KeuanganView memegang requestKey idempoten + validasi Zod terhadap saldo,
        ActiveWorkDetailView memegang alur pra-cek fraud. Menyalin keduanya ke
        dashboard berarti dua implementasi yang harus dijaga sinkron selamanya —
        dan versi di sini justru yang tidak pernah memanggil service.
      */}
    </div>
  );
}
