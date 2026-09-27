import Link from "next/link";
import { Campaign } from "@/types/umkm-dashboard.types";
import { formatDate } from "@/lib/formatters";
import { DashboardBadge, DashboardButton } from "../../shared";

interface CampaignDetailHeaderProps {
  campaign: Campaign;
  onCancelClick: () => void;
  onExportClick: () => void;
  onEditClick: () => void;
  isResuming?: boolean;
}

export function CampaignDetailHeader({
  campaign,
  onCancelClick,
  onExportClick,
  onEditClick,
  isResuming = false,
}: CampaignDetailHeaderProps) {
  // Primary CTA based on status
  const getPrimaryAction = () => {
    switch (campaign.status) {
      case "draft":
        return { label: "Lanjutkan Draf", onClick: onEditClick };
      case "active":
        return { label: "Unduh Laporan Kampanye", onClick: onExportClick };
      case "paused":
        return { label: "Aktifkan Kembali Kampanye", onClick: onEditClick };
      case "completed":
        return { label: "Unduh Laporan Selesai", onClick: onExportClick };
      default:
        return { label: "Unduh Laporan Kampanye", onClick: onExportClick };
    }
  };

  const primaryAction = getPrimaryAction();
  const isCancelable = campaign.status === "active";

  return (
    <div className="flex flex-col gap-4 shrink-0">
      {/* Back button link */}
      <div>
        <Link
          href="/dashboard/umkm/campaign"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-primary transition-colors mb-4 group cursor-pointer"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Daftar Kampanye
        </Link>

        {/* Cover Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-text-primary tracking-tight leading-none">
                {campaign.title}
              </h2>
              <DashboardBadge type="status" value={campaign.status} />
              <DashboardBadge type="category" value={campaign.niche} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
              <span>Dibuat: <span className="font-semibold text-text-secondary">{formatDate(campaign.createdAt)}</span></span>
              <span className="hidden sm:inline text-neutral-300">|</span>
              <span>Terakhir Diubah: <span className="font-semibold text-text-secondary">{formatDate(campaign.updatedAt)}</span></span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {isCancelable && (
              <DashboardButton
                variant="danger-outline"
                size="md"
                onClick={onCancelClick}
                className="text-xs"
              >
                Hentikan Sementara Kampanye
              </DashboardButton>
            )}
            <DashboardButton
              variant="primary"
              size="md"
              onClick={primaryAction.onClick}
              disabled={isResuming}
              className="text-xs"
            >
              {isResuming ? "Mengaktifkan…" : primaryAction.label}
            </DashboardButton>
          </div>
        </div>
      </div>
    </div>
  );
}
