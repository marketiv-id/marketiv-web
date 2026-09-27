"use client";

import { Campaign } from "@/types/umkm-dashboard.types";
import { Check, AlertTriangle, Info, X } from "lucide-react";

interface CampaignHealthChecklistCardProps {
  campaign: Campaign;
  pendingCount: number;
}

export function CampaignHealthChecklistCard({
  campaign,
  pendingCount,
}: CampaignHealthChecklistCardProps) {
  const isBriefValid = campaign.brief.length > 20;
  const isAssetValid = campaign.externalAssetUrl.startsWith("http");
  const isBudgetSecured = campaign.totalBudgetEscrow > 0;
  const isQuotaAvailable = campaign.usedQuota < campaign.creatorQuota;

  const checklistItems = [
    {
      label: "Arahan & Deskripsi Produk",
      status: isBriefValid ? "success" : "warning",
      desc: isBriefValid ? "Petunjuk untuk kreator terisi dengan baik." : "Petunjuk untuk kreator belum terisi.",
    },
    {
      label: "Tautan Foto & Video Produk",
      status: isAssetValid ? "success" : "error",
      desc: isAssetValid ? "Tautan Google Drive/OneDrive tersambung." : "Tautan folder foto & video belum ada.",
    },
    {
      label: "Pembayaran Kampanye Tersimpan Aman",
      status: isBudgetSecured ? "success" : "error",
      desc: isBudgetSecured ? "Dana tersimpan aman dalam sistem Marketiv." : "Pembayaran belum dilakukan.",
    },
    {
      label: "Kuota Kreator Tersedia",
      status: isQuotaAvailable ? "success" : "info",
      desc: isQuotaAvailable
        ? `Masih tersedia ${campaign.creatorQuota - campaign.usedQuota} kuota untuk kreator baru.`
        : "Seluruh kuota kreator sudah terisi penuh.",
    },
    {
      label: "Status Validasi Bukti Konten",
      status: pendingCount > 0 ? "warning" : "success",
      desc: pendingCount > 0
        ? `Ada ${pendingCount} bukti video sedang menunggu validasi Marketiv.`
        : "Semua bukti video telah selesai divalidasi Marketiv.",
    },
  ];

  const statusIcons = {
    success: (
      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-xs shrink-0">
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
      </div>
    ),
    warning: (
      <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-extrabold text-xs shrink-0">
        <AlertTriangle className="w-3.5 h-3.5" strokeWidth={3} />
      </div>
    ),
    info: (
      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-extrabold text-xs shrink-0">
        <Info className="w-3.5 h-3.5" strokeWidth={3} />
      </div>
    ),
    error: (
      <div className="w-5 h-5 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-extrabold text-xs shrink-0">
        <X className="w-3.5 h-3.5" strokeWidth={3} />
      </div>
    ),
  };

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
      <div className="border-b border-neutral-200/50 pb-3">
        <h3 className="text-xs sm:text-sm font-extrabold text-text-primary uppercase tracking-wide">
          Status Kesiapan Kampanye
        </h3>
      </div>
      <div className="space-y-3.5">
        {checklistItems.map((item, i) => (
          <div key={i} className="flex gap-3 items-start min-w-0">
            {statusIcons[item.status as keyof typeof statusIcons]}
            <div className="min-w-0 pt-0.5">
              <span className="block text-xs font-bold text-text-primary truncate">
                {item.label}
              </span>
              <span className="block text-[11px] text-text-muted mt-0.5 leading-relaxed truncate">
                {item.desc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
