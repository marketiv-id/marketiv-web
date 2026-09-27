"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ChevronRight, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { UmkmDashboardChrome } from "@/components/features/dashboard/UmkmDashboardChrome";
import { UmkmPageWrapper } from "../shared/UmkmPageWrapper";
import { CampaignsHeader } from "./CampaignsHeader";
import { CampaignSummaryCards } from "./CampaignSummaryCards";
import { CampaignToolbar } from "./CampaignToolbar";
import { CampaignCard } from "./CampaignCard";
import { CampaignTable } from "./CampaignTable";
import { CampaignEmptyState } from "./CampaignEmptyState";
import { CampaignErrorState } from "./CampaignErrorState";
import { CampaignListSkeleton, CampaignSummaryCardsSkeleton } from "./CampaignListSkeleton";
import { filterCampaigns } from "@/lib/umkm-filters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getCampaigns,
  getDashboardSummary,
  getSubmissionCounts,
  getUmkmProfile,
  updateCampaignStatus,
  duplicateCampaign,
  deleteCampaignDraft,
  publishCampaign,
} from "@/services/umkm/umkm-dashboard.service";
import {
  Campaign,
  UmkmDashboardSummary,
  UmkmProfile,
} from "@/types/umkm-dashboard.types";

// Modals
import { CancelCampaignModal } from "./modals/CancelCampaignModal";
import { DuplicateCampaignModal } from "./modals/DuplicateCampaignModal";
import { ExportReportModal } from "./modals/ExportReportModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UMKM_CAMPAIGN_EMPTY_VARIANTS } from "./campaignsEmptyVariants";

import { toast } from "sonner";

function EmptyPlaceholderCampaignCard({
  variantIndex = 0,
  onCreateClick,
}: {
  variantIndex?: number;
  onCreateClick?: () => void;
}) {
  const variant = UMKM_CAMPAIGN_EMPTY_VARIANTS[variantIndex % UMKM_CAMPAIGN_EMPTY_VARIANTS.length];
  const Icon = variant.icon;

  return (
    <div className="flex flex-col justify-between bg-slate-50/70 hover:bg-orange-50/20 border border-dashed border-slate-300/90 hover:border-orange-300 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-3xs hover:shadow-md transition-all duration-300 animate-in fade-in">
      <div className="space-y-3">
        {/* Top badge + icon */}
        <div className="flex items-center justify-between">
          <div className={cn("h-10 w-10 rounded-xl border flex items-center justify-center transition-transform hover:scale-105 duration-300 shadow-3xs", variant.iconBg)}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-slate-500 border border-slate-200 bg-white shadow-3xs">
            {variant.badge}
          </span>
        </div>

        {/* Title & Desc */}
        <div className="space-y-1">
          <h4 className="font-display font-black text-slate-900 text-sm sm:text-base leading-snug tracking-tight">
            {variant.title}
          </h4>
          <p className="text-xs font-medium text-slate-500 leading-relaxed line-clamp-3">
            {variant.desc}
          </p>
        </div>

        {/* Feature bullet box */}
        <div className="p-3 rounded-xl bg-white/90 border border-slate-200/70 space-y-1.5 shadow-3xs">
          {variant.features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              <span className="line-clamp-1">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Button CTA */}
      <div className="pt-3 mt-auto">
        {variant.isPrimary && onCreateClick ? (
          <button
            type="button"
            onClick={onCreateClick}
            className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-b from-[#fb7a18] to-[#ea580c] text-white text-xs font-extrabold shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Plus size={14} />
            <span>{variant.btnLabel}</span>
          </button>
        ) : (
          <Link
            href={variant.href}
            className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-extrabold transition-all duration-200 shadow-3xs hover:border-slate-300 hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>{variant.btnLabel}</span>
            <ChevronRight size={14} className="text-orange-500" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function CampaignsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core Data
  const [profile, setProfile] = useState<UmkmProfile | null>(null);
  const [summary, setSummary] = useState<UmkmDashboardSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<
    Record<string, { pending: number; valid: number; dispute: number }>
  >({});

  // Toolbar & filter states
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedNiche, setSelectedNiche] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Modal states
  const [activeCancelCampaign, setActiveCancelCampaign] = useState<Campaign | null>(null);
  const [activeDeleteCampaign, setActiveDeleteCampaign] = useState<Campaign | null>(null);
  const [activeDuplicateCampaign, setActiveDuplicateCampaign] = useState<Campaign | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Toast / notification feedback via Sonner
  const showToast = (msg: string) => {
    toast.success(msg);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch profile & summary
      const [profileRes, summaryRes, campaignsRes] = await Promise.all([
        getUmkmProfile(),
        getDashboardSummary(),
        getCampaigns(),
      ]);

      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data);
      }
      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }

      if (campaignsRes.success && campaignsRes.data) {
        const campaignList = campaignsRes.data;
        setCampaigns(campaignList);

        // UMKM-PERF-01: single batch query, zero N+1
        const campaignIds = campaignList.map((c) => c.id);
        const subCountsRes = await getSubmissionCounts(campaignIds);
        if (subCountsRes.success && subCountsRes.data) {
          setSubmissionCounts(subCountsRes.data);
        }
      } else {
        setError(campaignsRes.error || "Gagal memuat campaign.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan koneksi.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearFilters = () => {
    setSearch("");
    setSelectedStatus("all");
    setSelectedNiche("all");
    setSortBy("latest");
  };

  const hasActiveFilters = search !== "" || selectedStatus !== "all" || selectedNiche !== "all";

  // Filter and sort campaign list in memory
  const processedCampaigns = filterCampaigns(campaigns, {
    search,
    status: selectedStatus,
    niche: selectedNiche,
    sortBy,
  });

  // Count per status tab
  const statusCounts: Record<string, number> = {
    all: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    paused: campaigns.filter((c) => c.status === "paused").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
  };

  // Modal actions
  const handleCancelConfirm = async () => {
    if (!activeCancelCampaign) return;
    const target = activeCancelCampaign;
    const res = await updateCampaignStatus(target.id, "paused");
    if (res.success && res.data) {
      setCampaigns((prev) => prev.map((c) => (c.id === target.id ? res.data! : c)));
      showToast(`Campaign "${target.title}" berhasil dijeda.`);
    } else {
      toast.error(res.error ?? "Gagal menjeda campaign.");
    }
  };

  /**
   * Hapus draft. Baris dibuang dari state lokal, bukan loadData() penuh —
   * memuat ulang seluruh halaman berikut hitungan submission tiap campaign
   * (satu request per campaign) hanya untuk menghilangkan satu kartu itu boros.
   * Lempar ulang saat gagal supaya ConfirmDialog tetap terbuka.
   */
  const handleDeleteConfirm = async () => {
    if (!activeDeleteCampaign) return;
    const target = activeDeleteCampaign;
    const res = await deleteCampaignDraft(target.id);
    if (!res.success) {
      toast.error(res.error ?? "Gagal menghapus draft.");
      throw new Error(res.error ?? "Gagal menghapus draft.");
    }
    setCampaigns((prev) => prev.filter((c) => c.id !== target.id));
    setSubmissionCounts((prev) => {
      const next = { ...prev };
      delete next[target.id];
      return next;
    });
    showToast(`Draft "${target.title}" berhasil dihapus.`);
  };

  /**
   * Terbitkan draft yang dananya sudah masuk. Tidak pakai modal konfirmasi:
   * aksinya tidak merusak, dan service menolak sendiri bila `remainingBudget`
   * masih 0 — pesan penolakannya yang menjelaskan kenapa.
   */
  const handlePublish = async (target: Campaign) => {
    const res = await publishCampaign(target.id);
    if (!res.success || !res.data) {
      toast.error(res.error ?? "Gagal menerbitkan campaign.");
      return;
    }
    setCampaigns((prev) => prev.map((c) => (c.id === target.id ? res.data! : c)));
    showToast(`Campaign "${target.title}" kini tayang di Job Pool.`);
  };

  const handleDuplicateConfirm = async (
    newTitle: string,
    options: { copyBrief: boolean; copyBudget: boolean; copyAssets: boolean }
  ) => {
    if (!activeDuplicateCampaign) return;
    const res = await duplicateCampaign(activeDuplicateCampaign.id, newTitle, options);
    if (res.success && res.data) {
      const newCamp = res.data.campaign;
      setCampaigns((prev) => [newCamp, ...prev]);
      setSubmissionCounts((prev) => ({
        ...prev,
        [newCamp.id]: { pending: 0, valid: 0, dispute: 0 },
      }));
      if (res.data.warnings.length > 0) {
        res.data.warnings.forEach((w) => toast.warning(w));
      } else {
        showToast(`Campaign baru "${newTitle}" berhasil dibuat sebagai Draft.`);
      }
    } else {
      toast.error(res.error ?? "Gagal menduplikasi campaign.");
    }
  };

  return (
    <UmkmDashboardChrome businessName={profile?.businessName}>
      {/* UmkmPageWrapper: responsive padding, 26px gap, 1440px max-width for campaign list */}
      <UmkmPageWrapper maxWidth={1440}>
        {/* Header — P1-6: onCreateCampaignClick removed; Link inside CampaignsHeader already navigates */}
        <CampaignsHeader
          onExportReportClick={() => setIsExportModalOpen(true)}
        />

        {/* Summary Cards */}
        {loading ? (
          <CampaignSummaryCardsSkeleton />
        ) : summary ? (
          <CampaignSummaryCards summary={summary} />
        ) : null}

        {/* Toolbar — sticky direct grid child */}
        <CampaignToolbar
            search={search}
            onSearchChange={setSearch}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedNiche={selectedNiche}
            onNicheChange={setSelectedNiche}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
            statusCounts={statusCounts}
          />

        {/* List Content */}
        {loading ? (
          <CampaignListSkeleton viewMode={viewMode} />
        ) : error ? (
          <CampaignErrorState onRetry={loadData} errorMsg={error} />
        ) : campaigns.length === 0 ? (
          <CampaignEmptyState onCreateClick={() => router.push("/dashboard/umkm/campaign/buat")} />
        ) : processedCampaigns.length === 0 ? (
          <Card className="border border-border shadow-[var(--shadow-1)] bg-[var(--paper-2)] rounded-[var(--radius-3)]">
            <CardContent className="p-8 text-center">
              <h4 className="text-base font-bold text-ink-900 mb-1">Campaign tidak ditemukan</h4>
              <p className="text-xs text-ink-500 mb-4">Coba ubah kata kunci pencarian atau bersihkan filter.</p>
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Reset Filter
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "table" ? (
          <CampaignTable
            campaigns={processedCampaigns}
            submissionCounts={submissionCounts}
            onDuplicate={setActiveDuplicateCampaign}
            onCancel={setActiveCancelCampaign}
            onDelete={setActiveDeleteCampaign}
            onPublish={handlePublish}
            onExport={() => setIsExportModalOpen(true)}
            onEdit={(camp) => router.push(`/dashboard/umkm/campaign/${camp.id}/edit`)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 min-w-0">
            {processedCampaigns.map((camp) => {
              const counts = submissionCounts[camp.id] || { pending: 0, valid: 0, dispute: 0 };
              return (
                <CampaignCard
                  key={camp.id}
                  campaign={camp}
                  pendingCount={counts.pending}
                  validCount={counts.valid}
                  disputeCount={counts.dispute}
                  onDuplicate={() => setActiveDuplicateCampaign(camp)}
                  onCancel={() => setActiveCancelCampaign(camp)}
                  onDelete={() => setActiveDeleteCampaign(camp)}
                  onPublish={() => handlePublish(camp)}
                  onExport={() => setIsExportModalOpen(true)}
                  onEdit={() => router.push(`/dashboard/umkm/campaign/${camp.id}/edit`)}
                />
              );
            })}

            {/* Empty Placeholder Cards bila jumlah card < 3 (hanya saat tidak ada filter aktif) */}
            {!hasActiveFilters &&
              Array.from({ length: Math.max(0, 3 - processedCampaigns.length) }).map((_, idx) => (
                <EmptyPlaceholderCampaignCard
                  key={`empty-campaign-slot-${idx}`}
                  variantIndex={processedCampaigns.length + idx}
                  onCreateClick={() => router.push("/dashboard/umkm/campaign/buat")}
                />
              ))}
          </div>
        )}

        {/* Modals Mounting */}
        {activeCancelCampaign && (
          <CancelCampaignModal
            isOpen={!!activeCancelCampaign}
            onClose={() => setActiveCancelCampaign(null)}
            campaignTitle={activeCancelCampaign.title}
            onConfirm={handleCancelConfirm}
          />
        )}

        {activeDeleteCampaign && (
          <ConfirmDialog
            open={!!activeDeleteCampaign}
            onClose={() => setActiveDeleteCampaign(null)}
            title="Hapus Draft Campaign?"
            description={
              <>
                Draft{" "}
                <span className="font-semibold text-text-primary">
                  &quot;{activeDeleteCampaign.title}&quot;
                </span>{" "}
                akan dihapus permanen beserta brief dan aset yang menempel padanya.
              </>
            }
            note="Draft belum pernah tayang, jadi tidak ada klaim kreator atau dana escrow yang terpengaruh. Campaign yang sudah tayang tidak bisa dihapus — gunakan Jeda Campaign."
            acknowledgement="Saya mengerti draft ini tidak bisa dikembalikan."
            confirmLabel="Hapus Draft"
            onConfirm={handleDeleteConfirm}
          />
        )}

        {activeDuplicateCampaign && (
          <DuplicateCampaignModal
            isOpen={!!activeDuplicateCampaign}
            onClose={() => setActiveDuplicateCampaign(null)}
            originalTitle={activeDuplicateCampaign.title}
            onConfirm={handleDuplicateConfirm}
          />
        )}

        {isExportModalOpen && (
          <ExportReportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            filename="Laporan_Campaign_Marketiv"
            rows={campaigns.map((c) => ({
              "ID": c.id,
              "Judul": c.title,
              "Niche": c.niche,
              "Status": c.status,
              "Kuota": c.creatorQuota,
              "Klaim Terpakai": c.usedQuota,
              "Budget (Rp)": c.totalBudgetEscrow,
              "Budget Tersisa (Rp)": c.remainingBudget,
              "Total Views": c.totalViews ?? "Belum tersedia",
              "Dibuat": c.createdAt,
            }))}
          />
        )}

      </UmkmPageWrapper>
    </UmkmDashboardChrome>
  );
}
