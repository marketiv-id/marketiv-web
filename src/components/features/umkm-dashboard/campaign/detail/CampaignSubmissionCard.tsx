import Image from "next/image";
import { CampaignSubmission } from "@/types/umkm-dashboard.types";
import { formatCurrency, formatCompactNumber } from "@/lib/formatters";
import {
  ResponsiveDataRow,
  ResponsiveDataCell,
  DashboardBadge,
  DashboardButton,
} from "../../shared";

interface CampaignSubmissionCardProps {
  submission: CampaignSubmission;
  onViewDetails: () => void;
}

export function CampaignSubmissionCard({
  submission,
  onViewDetails,
}: CampaignSubmissionCardProps) {
  const isPending = submission.validationStatus === "pending";

  return (
    <ResponsiveDataRow
      className="md:grid md:items-center gap-4 py-3.5 px-5"
      style={{ gridTemplateColumns: "minmax(220px, 1.4fr) 90px 130px 150px 170px" }}
    >
      {/* Creator Info */}
      <div className="flex items-center gap-3.5 min-w-0 w-full md:w-auto">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border-soft bg-neutral-200">
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
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-bold text-text-primary text-xs sm:text-sm leading-none truncate block">
              {submission.creatorName}
            </span>
            <DashboardBadge type="tone" tone="slate" className="h-4 px-1.5 text-[8px] py-0 font-extrabold uppercase">
              {submission.platform}
            </DashboardBadge>
          </div>
          <a
            href={submission.contentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-primary hover:underline font-extrabold inline-flex items-center gap-0.5 truncate max-w-full"
          >
            <span>Buka Tautan Tayangan</span>
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Views */}
      <ResponsiveDataCell label="Tayangan" className="w-full md:w-auto">
        <span className="font-extrabold text-text-primary text-xs sm:text-sm">
          {submission.actualViews > 0 ? formatCompactNumber(submission.actualViews) : "—"}
        </span>
        {isPending && (
          <span className="block text-[10px] text-text-muted font-semibold leading-tight mt-0.5">Belum diverifikasi</span>
        )}
      </ResponsiveDataCell>

      {/* Reward Terhitung */}
      <ResponsiveDataCell label="Hadiah" className="w-full md:w-auto">
        <span className="font-extrabold text-success text-xs sm:text-sm">
          {isPending ? "—" : formatCurrency(submission.releasedFund)}
        </span>
      </ResponsiveDataCell>

      {/* Status */}
      <ResponsiveDataCell label="Status" className="w-full md:w-auto">
        <DashboardBadge type="status" value={submission.validationStatus} />
      </ResponsiveDataCell>

      {/* Actions */}
      <div className="flex items-center gap-2 w-full md:w-[170px] shrink-0 justify-end mt-2.5 md:mt-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-border-soft/60">
        <DashboardButton
          variant="secondary"
          size="sm"
          onClick={onViewDetails}
          className="h-8 text-[10px] bg-white border border-border-soft hover:bg-neutral-50 text-text-secondary cursor-pointer"
        >
          Lihat Detail
        </DashboardButton>
      </div>
    </ResponsiveDataRow>
  );
}
