"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { SearchToolbar, type SearchToolbarFilter } from "@/components/features/dashboard/shared";
import {
  ResponsiveModal,
  ResponsiveModalContent,
} from "@/components/ui/responsive-modal";
import {
  Briefcase,
  BadgeDollarSign,
  AlertTriangle,
  Clock,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { CreatorJob } from "@/types/creator-dashboard";
import { CreatorPageHeader } from "./CreatorPageHeader";
import { CreatorEmptyState } from "./CreatorEmptyState";
import { ClaimCampaignModal } from "./modals/ClaimCampaignModal";
import { ClaimSuccessModal } from "./modals/ClaimSuccessModal";
import { claimCampaign, getCreatorActiveWorks } from "@/services/creator/creator-dashboard.service";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const NICHE_GRADIENTS: Record<string, [string, string]> = {
  kuliner:    ["#1e3a8a", "#6d28d9"],
  fashion:     ["#1d4ed8", "#7c3aed"],
  pariwisata: ["#0369a1", "#6366f1"],
  edukasi:    ["#1e40af", "#4f46e5"],
  kecantikan: ["#2563eb", "#7c3aed"],
  lainnya:    ["#1e1b4b", "#6d28d9"],
};

const CREATOR_ACTION_GRADIENT =
  "linear-gradient(135deg, var(--color-kreator-600), var(--color-kreator-action-end))";
const CREATOR_PROGRESS_GRADIENT =
  "linear-gradient(90deg, var(--color-kreator-600), var(--color-kreator-action-end))";

const NICHE_LABELS: Record<string, string> = {
  kuliner:    "Kuliner",
  fashion:     "Fashion",
  pariwisata: "Travel",
  edukasi:    "Edukasi",
  kecantikan: "Beauty",
  lainnya:    "Lainnya",
};

// ─── MetricTile ──────────────────────────────────────────────────────────────

interface MetricTileProps {
  label: string;
  value: string | number;
  helper?: string;
  icon: React.ReactNode;
  iconClass: string;
  highlight?: boolean;
}

function MetricTile({ label, value, helper, icon, iconClass, highlight }: MetricTileProps) {
  return (
    <div
      className={cn(
        "group relative p-4 sm:p-5 rounded-[22px] border bg-white/70 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-kreator-brand-sm hover:border-blue-400/30 select-none cursor-default",
        highlight
          ? "border-blue-200/50 shadow-kreator-brand-sm bg-gradient-to-br from-blue-50/20 to-white/95"
          : "border-neutral-200/60 shadow-[0_2px_12px_rgba(15,23,42,.03)]"
      )}
    >
      {highlight && (
        <div className="absolute top-3.5 right-3.5">
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/30 text-[8px] font-extrabold text-blue-600 uppercase tracking-wider">
            Utama
          </span>
        </div>
      )}
      <div className={cn("h-9 w-9 rounded-[12px] flex items-center justify-center mb-3.5 border transition-transform duration-300 group-hover:scale-105", iconClass)}>
        {icon}
      </div>
      <div className="text-[.67rem] font-extrabold text-neutral-400 uppercase tracking-widest leading-none">{label}</div>
      <div className="font-display text-[1.3rem] sm:text-[1.4rem] font-black text-kreator-ink tracking-tight leading-none mt-1.5 break-all">{value}</div>
      {helper && (
        <div className="text-[.7rem] text-neutral-400 font-semibold mt-1 leading-none">{helper}</div>
      )}
    </div>
  );
}

// ─── CampaignCard ────────────────────────────────────────────────────────────

interface CampaignCardProps {
  job: CreatorJob;
  onClaim: (job: CreatorJob) => void;
  hasClaimed?: boolean;
}

function CampaignCard({ job, onClaim, hasClaimed = false }: CampaignCardProps) {
  const isFull       = job.usedQuota >= job.quota;
  const isNearLimit  = job.quota - job.usedQuota <= 1 && !isFull;
  const isHighReward = job.ratePerThousandViews >= 6000;
  const slotUsedPct  = Math.min(100, Math.round((job.usedQuota / job.quota) * 100));
  const slotsLeft    = Math.max(0, job.quota - job.usedQuota);
  const [g1, g2]    = NICHE_GRADIENTS[job.niche] ?? NICHE_GRADIENTS.lainnya;
  const nicheLabel   = NICHE_LABELS[job.niche]   ?? "Lainnya";

  return (
    <div className="group bg-white rounded-[20px] border border-neutral-200/50 overflow-hidden shadow-1 hover:shadow-kreator-avatar hover:-translate-y-1.5 hover:border-kreator-400/20 transition-all duration-300 flex flex-col">

      {/* Cover image — 4:3 aspect ratio */}
      <div className="relative w-full overflow-hidden bg-neutral-100" style={{ aspectRatio: "4/3" }}>
        {job.thumbnailUrl ? (
          <Image
            src={job.thumbnailUrl}
            alt={job.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
          >
            <span className="text-white/20 font-black text-7xl leading-none select-none">
              {job.brandName?.charAt(0) ?? "C"}
            </span>
          </div>
        )}

        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,.72) 0%, rgba(0,0,0,0) 52%)" }}
        />

        {/* Brand + PPV row (bottom overlay) */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg border border-white/20 overflow-hidden shrink-0 relative bg-white/10">
              {job.brandAvatar && (
                <Image src={job.brandAvatar} alt={job.brandName} fill className="object-cover" sizes="28px" />
              )}
            </div>
            <span className="text-white text-xs font-bold drop-shadow-sm truncate">{job.brandName}</span>
          </div>
          <span
            className="shrink-0 ml-2 px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider text-white border border-white/20"
            style={{ background: "rgba(255,255,255,.15)", backdropFilter: "blur(4px)" }}
          >
            PPV
          </span>
        </div>

        {/* Status chip (top-left) */}
        {(isNearLimit || isHighReward || isFull) && (
          <div className="absolute top-2.5 left-2.5">
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border",
                isFull
                  ? "bg-neutral-800/90 text-neutral-300 border-neutral-600/30"
                  : isNearLimit
                    ? "bg-amber-50/90 text-amber-700 border-amber-300/40"
                    : "bg-violet-600/90 text-white border-violet-400/30"
              )}
              style={{ backdropFilter: "blur(4px)" }}
            >
              {isFull ? "Kuota Penuh" : isNearLimit ? "Hampir Penuh" : "Reward Tinggi"}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 flex-1">
        <h4 className="text-[0.8rem] sm:text-sm font-extrabold text-kreator-ink leading-snug line-clamp-2">{job.title}</h4>

        {/* Rate display */}
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[1.1rem] font-black text-kreator-600 tracking-tight leading-none">
            {formatCurrency(job.ratePerThousandViews)}
          </span>
          <span className="text-[10px] text-neutral-400 font-semibold">/ 1K views</span>
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[9px] font-bold border border-violet-200/50 uppercase tracking-wide">
            {nicheLabel}
          </span>
          {job.externalAssetUrl && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200/50 uppercase tracking-wide">
              Aset Tersedia
            </span>
          )}
          <span className="flex items-center gap-1 text-[9px] font-bold text-neutral-400 ml-auto shrink-0">
            <Users className="w-3 h-3" />
            {slotsLeft} slot
          </span>
        </div>

        {/* Quota progress bar */}
        <div className="space-y-1.5">
          <div className="hidden sm:flex justify-between text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
            <span>Kuota Kreator</span>
            <span>{job.usedQuota} / {job.quota} Klaim</span>
          </div>
          <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${slotUsedPct}%`,
                background: isFull
                  ? "var(--color-control-disabled)"
                  : CREATOR_PROGRESS_GRADIENT,
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-auto pt-1">
          <Link
            href={`/dashboard/kreator/job-pool/${job.id}`}
            className="flex-1 text-center py-2.5 rounded-[12px] text-[10px] font-extrabold text-neutral-600 border border-neutral-200 hover:bg-neutral-50 transition-all duration-200"
          >
            Detail
          </Link>
          <button
            onClick={() => !isFull && !hasClaimed && onClaim(job)}
            disabled={isFull || hasClaimed}
            className={cn(
              "flex-[2] py-2.5 rounded-[12px] text-[10px] font-extrabold transition-all duration-200",
              isFull || hasClaimed
                ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                : "text-white hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            )}
            style={isFull || hasClaimed ? undefined : {
              background: CREATOR_ACTION_GRADIENT,
              boxShadow: "var(--shadow-kreator)",
            }}
          >
            {hasClaimed ? "Sudah Diklaim ✓" : isFull ? "Kuota Penuh" : "Klaim Job"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface JobPoolViewProps {
  initialJobs: CreatorJob[];
}

export function JobPoolView({ initialJobs }: JobPoolViewProps) {
  const [jobs, setJobs] = useState<CreatorJob[]>(initialJobs);

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [filterAvailableOnly, setFilterAvailableOnly] = useState(false);

  // Modal states
  const [claimingJob, setClaimingJob] = useState<CreatorJob | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedJobIds, setClaimedJobIds] = useState<Set<string>>(new Set());
  const [isRulesChecked, setIsRulesChecked] = useState({
    brief: false,
    privacy: false,
    retention: false,
    views: false,
  });

  useEffect(() => {
    async function loadActiveClaims() {
      const res = await getCreatorActiveWorks();
      if (res.success && res.data) {
        const ids = new Set(res.data.map((w) => w.campaignId));
        setClaimedJobIds(ids);
      }
    }
    loadActiveClaims();
  }, []);


  const handleClearFilters = () => {
    setSearch("");
    setSelectedNiche("all");
    setSortBy("latest");
    setFilterAvailableOnly(false);
  };

  const openClaimModal = (job: CreatorJob) => {
    setClaimingJob(job);
    setIsRulesChecked({ brief: false, privacy: false, retention: false, views: false });
  };

  /**
   * Klaim campaign dari kartu Job Pool.
   *
   * Sebelumnya fungsi ini HANYA menaikkan `usedQuota` di state lalu membuka modal
   * sukses — tidak ada satu pun panggilan service, sehingga klaimnya tidak pernah
   * tercatat dan pekerjaannya tidak pernah muncul di Pekerjaan Aktif. Karena ini
   * tombol utama kartu (tombol "Detail" hanya sekunder), jalur palsu itulah yang
   * paling sering dipakai.
   *
   * Pola disamakan dengan JobDetailView.handleClaimSubmit: kuota lokal baru naik
   * SETELAH server menerima, supaya kuota tidak terlihat berkurang saat klaim
   * ditolak (kuota penuh / sudah pernah klaim / profil belum lengkap).
   */
  const executeClaim = async () => {
    if (!claimingJob || isClaiming) return;
    setIsClaiming(true);
    const res = await claimCampaign(claimingJob.id);
    setIsClaiming(false);

    if (!res.success) {
      setClaimingJob(null);
      toast.error(res.error ?? "Gagal mengambil pekerjaan ini.");
      return;
    }

    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === claimingJob.id ? { ...job, usedQuota: job.usedQuota + 1 } : job
      )
    );
    setClaimedJobIds(prev => new Set(prev).add(claimingJob.id));
    setClaimingJob(null);
    setIsSuccessOpen(true);
  };

  // Summary metric calculations
  const totalJobsAvailable = jobs.filter(j => j.usedQuota < j.quota).length;
  const highestReward      = jobs.reduce((max, j) => j.ratePerThousandViews > max ? j.ratePerThousandViews : max, 0);
  const almostFullCount    = jobs.filter(j => j.usedQuota >= j.quota - 1 && j.usedQuota < j.quota).length;
  const newTodayCount      = jobs.filter(j => {
    const d = new Date(j.createdAt), t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  }).length;

  // Filter + sort
  const filteredJobs = jobs
    .filter(job => {
      const matchSearch  = job.title.toLowerCase().includes(search.toLowerCase()) || job.brandName.toLowerCase().includes(search.toLowerCase()) || job.brief.toLowerCase().includes(search.toLowerCase());
      const matchNiche   = selectedNiche === "all" || job.niche === selectedNiche;
      const matchAvail   = !filterAvailableOnly || job.usedQuota < job.quota;
      return matchSearch && matchNiche && matchAvail;
    })
    .sort((a, b) => {
      if (sortBy === "highest-rate") return b.ratePerThousandViews - a.ratePerThousandViews;
      if (sortBy === "lowest-rate")  return a.ratePerThousandViews - b.ratePerThousandViews;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const sortOptions = [
    { label: "Terbaru",         value: "latest" },
    { label: "Reward Tertinggi", value: "highest-rate" },
    { label: "Reward Terendah",  value: "lowest-rate" },
  ];

  const hasActiveFilters = search !== "" || selectedNiche !== "all" || filterAvailableOnly;
  const toolbarFilters: SearchToolbarFilter[] = [
    {
      label: "Kategori",
      value: selectedNiche,
      onChange: setSelectedNiche,
      options: [
        { value: "all", label: "Semua Kategori" },
        { value: "kecantikan", label: "Kecantikan" },
        { value: "kuliner", label: "Kuliner" },
        { value: "fashion", label: "Fashion" },
        { value: "pariwisata", label: "Pariwisata" },
        { value: "edukasi", label: "Edukasi" },
      ],
    },
    {
      label: "Urutan",
      value: sortBy,
      onChange: setSortBy,
      options: sortOptions,
      prefix: "Urut",
    },
  ];
  const allRulesChecked  = isRulesChecked.brief && isRulesChecked.privacy && isRulesChecked.retention && isRulesChecked.views;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 relative">

        <div>
          {/* Header */}
          <CreatorPageHeader
            title="Job Pool Kampanye"
            description="Pilih campaign UMKM yang cocok dengan niche kamu."
          />

          {/* Summary Metric Tiles — 2/3/4 grid per Dashboard Rule */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-7">
            <MetricTile
              label="Job Tersedia"
              value={totalJobsAvailable}
              helper="Klaim instan"
              iconClass="text-violet-600 bg-violet-50 border-violet-200/50"
              icon={<Briefcase className="w-4 h-4" />}
            />
            <MetricTile
              label="Reward Tertinggi"
              value={formatCurrency(highestReward)}
              helper="Per 1k tayangan"
              iconClass="text-amber-600 bg-amber-50 border-amber-200/50"
              icon={<BadgeDollarSign className="w-4 h-4" />}
              highlight
            />
            <MetricTile
              label="Hampir Penuh"
              value={almostFullCount}
              helper="Tinggal 1 kuota lagi"
              iconClass="text-amber-500 bg-amber-50 border-amber-200/50"
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <MetricTile
              label="Job Baru Hari Ini"
              value={newTodayCount}
              helper="Kampanye terbaru"
              iconClass="text-indigo-600 bg-indigo-50 border-indigo-200/50"
              icon={<Clock className="w-4 h-4" />}
            />
          </div>

          {/* Filter Toolbar — sticky when scrolling */}
          <div className="mb-6">
            <SearchToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Cari kampanye / brand..."
              filters={toolbarFilters}
              onClearFilters={handleClearFilters}
              hasActiveFilters={hasActiveFilters}
              theme="kreator"
              extraActions={
                <button
                  type="button"
                  onClick={() => setFilterAvailableOnly((value) => !value)}
                  className={cn(
                    "h-10 cursor-pointer whitespace-nowrap rounded-xl border px-3 text-xs font-bold transition-all",
                    filterAvailableOnly
                      ? "border-primary-600 bg-primary text-white shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                  )}
                >
                  Kuota Tersedia
                </button>
              }
            />
          </div>
          {/* Grid Content */}
          {filteredJobs.length === 0 ? (
            <CreatorEmptyState
              title={hasActiveFilters ? "Job tidak ditemukan" : "Job pool kosong"}
              description={
                hasActiveFilters
                  ? "Coba ganti kata kunci pencarian atau bersihkan filter di atas."
                  : "UMKM belum menerbitkan kampanye baru di pool. Silakan tunggu beberapa saat lagi."
              }
              actionButton={
                hasActiveFilters ? (
                  <button
                    onClick={handleClearFilters}
                    className="bg-primary hover:bg-primary-600 text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all shadow border border-primary-600/10 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredJobs.map((job) => (
                <CampaignCard key={job.id} job={job} onClaim={openClaimModal} hasClaimed={claimedJobIds.has(job.id)} />
              ))}
            </div>
          )}
        </div>

      {/* ── Claim Checklist Modal ──────────────────────────────────────────── */}
      <ClaimCampaignModal
        isOpen={!!claimingJob}
        onClose={() => setClaimingJob(null)}
        job={claimingJob}
        onConfirm={executeClaim}
        isClaiming={isClaiming}
      />

      {/* ── Success Modal ─────────────────────────────────────────────────── */}
      <ClaimSuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
      />
    </div>
  );
}
