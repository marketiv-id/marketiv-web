"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DashboardActionMenu,
  DashboardBadge,
  DashboardButton,
  ResponsiveDataRow,
  type ActionMenuItem,
  type ResponsiveDataCell,
} from "@/components/features/dashboard/shared";
import { formatCurrency, formatCompactNumber, formatDate } from "@/lib/formatters";
import type { Campaign } from "@/types/umkm-dashboard.types";

interface CampaignTableProps {
  campaigns: Campaign[];
  submissionCounts: Record<string, { pending: number; valid: number; dispute: number }>;
  onDuplicate: (campaign: Campaign) => void;
  onCancel: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
  onPublish: (campaign: Campaign) => void;
  onExport: (campaign: Campaign) => void;
  onEdit: (campaign: Campaign) => void;
}

export function CampaignTable({
  campaigns,
  submissionCounts,
  onDuplicate,
  onCancel,
  onDelete,
  onPublish,
  onExport,
  onEdit,
}: CampaignTableProps) {
  const router = useRouter();

  function getActionItems(campaign: Campaign, detailUrl: string): ActionMenuItem[] {
    const isCancelDisabled = campaign.status === "completed";
    const isEditVisible = campaign.status === "draft";
    // Hapus permanen hanya untuk draft — sekali tayang campaign cuma bisa dijeda.
    const isDeleteVisible = campaign.status === "draft";

    return [
      {
        label: "Lihat Detail",
        onClick: () => router.push(detailUrl),
      },
      // Jalan keluar bila webhook Midtrans telat — service tetap menolak bila
      // dananya belum masuk.
      ...(isDeleteVisible
        ? [
            {
              label: "Terbitkan Kampanye",
              onClick: () => onPublish(campaign),
            },
          ]
        : []),
      ...(isEditVisible
        ? [
            {
              label: "Ubah Konsep",
              onClick: () => onEdit(campaign),
            },
          ]
        : []),
      {
        label: "Salin Kampanye",
        onClick: () => onDuplicate(campaign),
      },
      {
        label: "Unduh Laporan",
        onClick: () => onExport(campaign),
      },
      ...(!isCancelDisabled
        ? [
            {
              label: "Batalkan Kampanye",
              onClick: () => onCancel(campaign),
              tone: "danger" as const,
            },
          ]
        : []),
      ...(isDeleteVisible
        ? [
            {
              label: "Hapus Konsep",
              onClick: () => onDelete(campaign),
              tone: "danger" as const,
            },
          ]
        : []),
    ];
  }

  function renderThumbnail(campaign: Campaign) {
    return (
      <div className="relative aspect-video w-14 shrink-0 overflow-hidden rounded-lg border border-border-soft bg-neutral-100">
        {campaign.thumbnailUrl ? (
          <Image
            src={campaign.thumbnailUrl}
            alt={campaign.title}
            fill
            sizes="56px"
            className="object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-neutral-400">—</div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {campaigns.map((campaign) => {
          const counts = submissionCounts[campaign.id] || { pending: 0, valid: 0, dispute: 0 };
          const detailUrl = `/dashboard/umkm/campaign/${campaign.id}`;
          const cells: ResponsiveDataCell[] = [
            { label: "Tayangan", value: campaign.totalViews === undefined ? "—" : formatCompactNumber(campaign.totalViews), align: "right" },
            {
              label: "Anggaran",
              value: (
                <span>
                  {formatCurrency(campaign.usedBudget)}
                  <span className="block text-[11px] font-medium text-text-muted">
                    dari {formatCurrency(campaign.totalBudgetEscrow)}
                  </span>
                </span>
              ),
              align: "right",
            },
            { label: "Kuota Kreator", value: `${campaign.usedQuota} / ${campaign.creatorQuota}` },
            {
              label: "Bukti Konten",
              value: (
                <span className="flex flex-wrap gap-1.5">
                  <DashboardBadge tone="amber" size="sm">
                    {counts.pending} Menunggu
                  </DashboardBadge>
                  <DashboardBadge tone="green" size="sm">
                    {counts.valid} Disetujui
                  </DashboardBadge>
                  {counts.dispute > 0 ? (
                    <DashboardBadge tone="red" size="sm">
                      {counts.dispute} Sengketa
                    </DashboardBadge>
                  ) : null}
                </span>
              ),
            },
            { label: "Dibuat", value: formatDate(campaign.createdAt) },
          ];

          return (
            <ResponsiveDataRow
              key={campaign.id}
              title={
                <div className="flex min-w-0 items-center gap-3">
                  {renderThumbnail(campaign)}
                  <div className="min-w-0">
                    <Link href={detailUrl} className="block truncate font-bold text-text-primary transition-colors hover:text-primary">
                      {campaign.title}
                    </Link>
                    <span className="mt-0.5 block truncate text-[10px] text-text-muted">ID: {campaign.id}</span>
                  </div>
                </div>
              }
              meta={
                <>
                  <DashboardBadge type="status" value={campaign.status} size="sm" />
                  <DashboardBadge type="category" value={campaign.niche} size="sm" />
                </>
              }
              cells={cells}
              actions={<DashboardActionMenu items={getActionItems(campaign, detailUrl)} />}
            />
          );
        })}
      </div>

      <div className="panel hidden w-full overflow-hidden rounded-2xl md:block p-0 bg-white!">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-border-soft bg-neutral-50/50 text-[10px] font-bold uppercase tracking-wider text-text-secondary sm:text-xs">
              <th className="w-[28%] px-6 py-4">Kampanye</th>
              <th className="w-[10%] px-4 py-4">Status</th>
              <th className="w-[10%] px-4 py-4">Kategori</th>
              <th className="w-[9%] px-4 py-4 text-right">Tayangan</th>
              <th className="w-[16%] px-4 py-4 text-right">Anggaran (Terpakai/Total)</th>
              <th className="w-[9%] px-4 py-4 text-center">Kuota Kreator</th>
              <th className="w-[10%] px-4 py-4 text-center">Bukti Konten</th>
              <th className="w-[8%] px-4 py-4">Dibuat</th>
              <th className="w-[10%] px-6 py-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {campaigns.map((campaign) => {
              const counts = submissionCounts[campaign.id] || { pending: 0, valid: 0, dispute: 0 };
              const detailUrl = `/dashboard/umkm/campaign/${campaign.id}`;
              const actionItems = getActionItems(campaign, detailUrl);

              return (
                <tr key={campaign.id} className="text-xs text-text-primary transition-colors hover:bg-neutral-50/50">
                  <td className="px-6 py-4">
                    <div className="flex max-w-[280px] items-center gap-3">
                      {renderThumbnail(campaign)}
                      <div className="min-w-0">
                        <Link href={detailUrl} className="block truncate font-bold text-text-primary transition-colors hover:text-primary">
                          {campaign.title}
                        </Link>
                        <span className="mt-0.5 block truncate text-[10px] text-text-muted">ID: {campaign.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <DashboardBadge type="status" value={campaign.status} size="sm" />
                  </td>
                  <td className="px-4 py-4">
                    <DashboardBadge type="category" value={campaign.niche} size="sm" />
                  </td>
                  <td className="px-4 py-4 text-right font-extrabold text-text-secondary">
                    {campaign.totalViews === undefined ? "—" : formatCompactNumber(campaign.totalViews)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="block break-words font-bold text-text-primary">{formatCurrency(campaign.usedBudget)}</span>
                    <span className="mt-0.5 block break-words text-[10px] text-text-muted">
                      dari {formatCurrency(campaign.totalBudgetEscrow)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="font-bold text-text-primary">{campaign.usedQuota}</span>
                    <span className="text-text-muted"> / {campaign.creatorQuota}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <DashboardBadge tone="amber" className="px-1.5 text-[9px] font-bold">
                        {counts.pending} Menunggu
                      </DashboardBadge>
                      <DashboardBadge tone="green" className="px-1.5 text-[9px] font-bold">
                        {counts.valid} Disetujui
                      </DashboardBadge>
                      {counts.dispute > 0 ? (
                        <DashboardBadge tone="red" className="px-1.5 text-[9px] font-bold">
                          {counts.dispute} Sengketa
                        </DashboardBadge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-text-muted">{formatDate(campaign.createdAt)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <DashboardButton variant="secondary" size="sm" href={detailUrl} className="h-7 px-3 text-[10px]">
                        Lihat Detail
                      </DashboardButton>
                      <DashboardActionMenu items={actionItems} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
