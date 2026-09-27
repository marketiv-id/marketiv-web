"use client";

import { useState } from "react";
import { Campaign } from "@/types/umkm-dashboard.types";
import { formatCurrency } from "@/lib/formatters";

interface CampaignActivityTimelineProps {
  campaign: Campaign;
}

export function CampaignActivityTimeline({ campaign }: CampaignActivityTimelineProps) {
  const [showAll, setShowAll] = useState(false);

  // Generate events based on campaign status
  const getEvents = () => {
    const baseEvents = [
      {
        title: "Kampanye Dibuat",
        desc: "Kampanye disimpan sebagai draf.",
        date: campaign.createdAt,
        type: "create",
      },
    ];

    if (campaign.status === "draft") {
      return baseEvents;
    }

    const payDate = new Date(campaign.createdAt);
    payDate.setMinutes(payDate.getMinutes() + 15);

    const activeEvents = [
      ...baseEvents,
      {
        title: "Dana Kampanye Berhasil Disimpan",
        desc: `Anggaran ${formatCurrency(campaign.totalBudgetEscrow)} berhasil diamankan.`,
        date: payDate.toISOString(),
        type: "pay",
      },
      {
        title: "Kampanye Diterbitkan",
        desc: "Kampanye aktif, para kreator dapat mulai mengerjakan.",
        date: campaign.updatedAt,
        type: "active",
      },
    ];

    if (campaign.status === "active") {
      if (campaign.usedQuota > 0) {
        const claimDate = new Date(campaign.updatedAt);
        claimDate.setHours(claimDate.getHours() + 2);
        activeEvents.push({
          title: "Kreator Mulai Mengerjakan",
          desc: "Kreator telah mulai mengerjakan kampanye ini.",
          date: claimDate.toISOString(),
          type: "claim",
        });
      }
      return activeEvents;
    }

    if (campaign.status === "paused") {
      const claimDate = new Date(campaign.updatedAt);
      claimDate.setHours(claimDate.getHours() + 1);
      return [
        ...activeEvents,
        {
          title: "Kampanye Dijeda",
          desc: "Kampanye dihentikan sementara.",
          date: campaign.updatedAt,
          type: "pause",
        },
      ];
    }

    if (campaign.status === "completed") {
      return [
        ...activeEvents,
        {
          title: "Validasi Bukti Selesai",
          desc: "Semua bukti konten telah divalidasi oleh Admin Marketiv.",
          date: campaign.updatedAt,
          type: "validate",
        },
        {
          title: "Kampanye Selesai",
          desc: "Kampanye telah berakhir secara resmi.",
          date: campaign.updatedAt,
          type: "complete",
        },
      ];
    }

    return baseEvents;
  };

  const events = [...getEvents()].reverse(); // Newest first
  const displayedEvents = showAll ? events : events.slice(0, 4);

  const formatCompactDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      });
    } catch {
      return dateStr;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "create":
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        );
      case "pay":
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case "active":
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      case "claim":
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case "full":
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case "validate":
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case "complete":
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        );
      case "cancel":
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
          </svg>
        );
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "create":
        return "bg-neutral-100 text-neutral-500 border border-neutral-200/60";
      case "pay":
        return "bg-primary-50 text-primary border border-primary-100/60";
      case "active":
        return "bg-success-soft text-success border border-success-soft/60";
      case "claim":
        return "bg-info-soft text-info border border-info-soft/60";
      case "full":
        return "bg-warning-soft text-warning border border-warning-soft/60";
      case "validate":
        return "bg-success-soft text-success border border-success-soft/60";
      case "complete":
        return "bg-success-soft text-success border border-success-soft/60";
      case "cancel":
        return "bg-danger-soft text-danger border border-danger-soft/60";
      default:
        return "bg-neutral-100 text-neutral-500 border border-neutral-200/60";
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
      <div className="border-b border-neutral-200/50 pb-3 flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h3 className="text-xs sm:text-sm font-extrabold text-text-primary uppercase tracking-wide">
            Riwayat Aktivitas Kampanye
          </h3>
          <p className="text-xs text-text-muted">
            Rekaman aktivitas terbaru kampanye ini.
          </p>
        </div>
        <span className="text-[11px] font-extrabold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200/80 uppercase tracking-wide shrink-0">
          {events.length} AKTIVITAS
        </span>
      </div>
      
      <div className="timeline">
        {displayedEvents.map((event, i) => (
          <div key={i} className="timeline-item">
            <div className={`timeline-dot ${getBgColor(event.type)}`}>
              {getIcon(event.type)}
            </div>
            <div className="timeline-content">
              <div className="flex items-start justify-between gap-2">
                <strong className="text-xs font-bold text-text-primary leading-tight">{event.title}</strong>
                <span className="text-[9px] font-bold text-text-secondary shrink-0 bg-white border border-border-soft px-2 py-0.5 rounded-md shadow-2xs">
                  {formatCompactDate(event.date)}
                </span>
              </div>
              <span className="text-[10px] text-text-muted mt-1 leading-normal block">{event.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {events.length > 4 && (
        <div className="pt-6">
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-center py-2 text-[10px] font-extrabold text-primary bg-primary-50/60 hover:bg-primary-100/80 hover:text-primary-700 border border-primary-100/60 rounded-xl transition-all cursor-pointer"
          >
            {showAll ? "Sembunyikan Aktivitas" : "Lihat Semua Aktivitas"}
          </button>
        </div>
      )}
    </div>
  );
}
