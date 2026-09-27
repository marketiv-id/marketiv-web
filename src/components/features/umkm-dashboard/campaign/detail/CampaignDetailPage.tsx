"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UmkmDashboardChrome } from "@/components/features/dashboard/UmkmDashboardChrome";
import { UmkmPageWrapper } from "../../shared/UmkmPageWrapper";
import { CampaignDetailHeader } from "./CampaignDetailHeader";
import { CampaignOverviewCards } from "./CampaignOverviewCards";
import { CampaignWorkspaceCard } from "./CampaignWorkspaceCard";
import { CampaignQuickActionsCard } from "./CampaignQuickActionsCard";
import { CampaignHealthChecklistCard } from "./CampaignHealthChecklistCard";
import { CampaignBudgetCard } from "./CampaignBudgetCard";
import { CampaignSubmissionSection } from "./CampaignSubmissionSection";
import { CampaignActivityTimeline } from "./CampaignActivityTimeline";
import { CampaignDetailSkeleton } from "./CampaignDetailSkeleton";
import { CampaignNotFoundState } from "./CampaignNotFoundState";
import { routes } from "@/lib/constants/routes";
import {
  getFraudStatusLabel,
  getSubmissionStatusLabel,
} from "@/lib/dashboard-labels";
import {
  getCampaignById,
  getCampaignSubmissions,
  getUmkmProfile,
  updateCampaignStatus,
} from "@/services/umkm/umkm-dashboard.service";
import {
  Campaign,
  UmkmProfile,
  CampaignSubmission,
} from "@/types/umkm-dashboard.types";

// Modals
import { CancelCampaignModal } from "../modals/CancelCampaignModal";
import { ExportReportModal } from "../modals/ExportReportModal";
import { SubmissionDetailModal } from "../modals/SubmissionDetailModal";

import { toast } from "sonner";

interface CampaignDetailPageProps {
  campaignId: string;
}

export function CampaignDetailPage({ campaignId }: CampaignDetailPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core Data
  const [profile, setProfile] = useState<UmkmProfile | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submissions, setSubmissions] = useState<CampaignSubmission[]>([]);

  const [isResuming, setIsResuming] = useState(false);

  // Modals visibility states
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeDetailSubmission, setActiveDetailSubmission] = useState<CampaignSubmission | null>(null);

  const showToast = (msg: string) => {
    toast.success(msg);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, campaignRes, submissionsRes] = await Promise.all([
        getUmkmProfile(),
        getCampaignById(campaignId),
        getCampaignSubmissions(campaignId),
      ]);

      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data);
      }

      if (campaignRes.success && campaignRes.data) {
        setCampaign(campaignRes.data);
      } else {
        setError(campaignRes.error || "Kampanye tidak ditemukan.");
      }

      if (submissionsRes.success && submissionsRes.data) {
        setSubmissions(submissionsRes.data);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan koneksi.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelConfirm = async () => {
    if (!campaign) return;
    const target = campaign;
    const res = await updateCampaignStatus(target.id, "paused");
    if (res.success && res.data) {
      setCampaign(res.data);
      showToast(`Kampanye "${target.title}" berhasil dijeda.`);
    } else {
      toast.error(res.error ?? "Gagal menjeda kampanye.");
    }
  };

  const handleResumeFromPause = async () => {
    if (!campaign || isResuming) return;
    setIsResuming(true);
    const res = await updateCampaignStatus(campaign.id, "active");
    setIsResuming(false);
    if (res.success && res.data) {
      setCampaign(res.data);
      showToast(`Kampanye "${campaign.title}" berhasil diaktifkan kembali.`);
    } else {
      toast.error(res.error ?? "Gagal mengaktifkan kampanye.");
    }
  };

  if (loading) {
    return (
      <UmkmDashboardChrome businessName={profile?.businessName ?? ""}>
        <CampaignDetailSkeleton />
      </UmkmDashboardChrome>
    );
  }

  if (error || !campaign) {
    return (
      <UmkmDashboardChrome businessName={profile?.businessName ?? ""}>
        <CampaignNotFoundState />
      </UmkmDashboardChrome>
    );
  }

  const businessName = profile?.businessName ?? "";
  const pendingSubmissionsCount = submissions.filter((s) => s.validationStatus === "pending").length;

  return (
    <UmkmDashboardChrome businessName={businessName}>
      <UmkmPageWrapper maxWidth={1440}>
        
        {/* Detail Header */}
        <CampaignDetailHeader
          campaign={campaign}
          onCancelClick={() => setIsCancelModalOpen(true)}
          onExportClick={() => setIsExportModalOpen(true)}
          onEditClick={
            campaign.status === "paused"
              ? handleResumeFromPause
              : () => router.push(`/dashboard/umkm/campaign/${campaign.id}/edit`)
          }
          isResuming={isResuming}
        />

        {/* Overview cards */}
        <CampaignOverviewCards
          campaign={campaign}
          pendingSubmissionsCount={pendingSubmissionsCount}
        />

        {/* Core details layout stacked and grouped */}
        <div className="space-y-6" id="campaign-detail-workspace">
          
          {/* Workspace Card (Full Width) */}
          <CampaignWorkspaceCard campaign={campaign} submissions={submissions} />
          
          {/* Submissions Section (Full Width) - Read-Only Observer */}
          <div id="review-submissions-section">
            <CampaignSubmissionSection
              submissions={submissions}
              onViewDetailsClick={setActiveDetailSubmission}
            />
          </div>

          {/* Secondary Grid (Balanced Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Budget & Quick Actions */}
            <div className="space-y-6">
              <CampaignBudgetCard campaign={campaign} />
              <CampaignQuickActionsCard
                onCopyAsset={() => {
                  navigator.clipboard.writeText(campaign.externalAssetUrl);
                  showToast("Tautan folder aset berhasil disalin.");
                }}
                onExportReport={() => setIsExportModalOpen(true)}
                onViewEscrow={() => router.push(routes.umkmFinance)}
                onViewSubmissions={() => {
                  const element = document.getElementById("review-submissions-section");
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                hasPendingSubmissions={pendingSubmissionsCount > 0}
              />
            </div>

            {/* Right Column: Health Checklist & Activity Timeline */}
            <div className="space-y-6">
              <CampaignHealthChecklistCard
                campaign={campaign}
                pendingCount={pendingSubmissionsCount}
              />
              <CampaignActivityTimeline campaign={campaign} />
            </div>
          </div>

        </div>

        {/* Modals Mounting */}
        {isCancelModalOpen && (
          <CancelCampaignModal
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            campaignTitle={campaign.title}
            onConfirm={handleCancelConfirm}
          />
        )}

        {isExportModalOpen && (
          <ExportReportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            filename={`Laporan_${campaign?.title?.replace(/\s+/g, "_") ?? "Kampanye"}_Marketiv`}
            rows={submissions.map((s) => ({
              "ID Bukti Konten": s.id,
              "Kreator": s.creatorName,
              "Platform": s.platform,
              "URL Konten": s.contentUrl,
              "Tayangan": s.actualViews,
              "Status": getSubmissionStatusLabel(s.validationStatus),
              "Status Kecurangan": getFraudStatusLabel(s.fraudStatus),
              "Dana Dicairkan (Rp)": s.releasedFund,
              "Dikirim": s.submittedAt,
              "Divalidasi": s.validatedAt ?? "-",
            }))}
          />
        )}

        {activeDetailSubmission && (
          <SubmissionDetailModal
            isOpen={!!activeDetailSubmission}
            onClose={() => setActiveDetailSubmission(null)}
            submission={activeDetailSubmission}
          />
        )}

      </UmkmPageWrapper>
    </UmkmDashboardChrome>
  );
}
