"use client";

import { Users, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import { formatCompactCurrency } from "@/lib/formatters";

export interface CreatorSummaryCardsProps {
  totalCreators: number;
  verifiedCount?: number;
  avgEngagement?: number;
  lowestStartingPrice?: number;
  isLoading?: boolean;
}

export function CreatorSummaryCards({
  totalCreators,
  verifiedCount = 0,
  avgEngagement = 0,
  lowestStartingPrice = 0,
  isLoading = false,
}: CreatorSummaryCardsProps) {
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0"
        data-testid="creator-summary-skeleton"
      >
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl sm:rounded-[22px] border border-neutral-200/80 bg-white/80 animate-pulse flex flex-col gap-3 min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[13px] sm:rounded-[14px] bg-neutral-100" />
            <div className="space-y-1.5 pt-1">
              <div className="h-2.5 w-24 bg-neutral-100 rounded" />
              <div className="h-6 w-16 bg-neutral-200 rounded-md" />
              <div className="h-2 w-20 bg-neutral-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      id: "total",
      label: "Kreator Terdaftar",
      value: String(totalCreators),
      unit: "Kreator",
      subtext: "Siap berkolaborasi",
      icon: Users,
      iconColor: "#ea580c",
      iconBg: "#fff7ed",
      iconBorder: "rgba(234,88,12,.18)",
      glowColor: "rgba(249,115,22,.05)",
    },
    {
      id: "verified",
      label: "Kreator Terverifikasi",
      value: String(verifiedCount),
      unit: totalCreators > 0 ? `${Math.round((verifiedCount / totalCreators) * 100)}%` : "0%",
      subtext: "Profil & performa tervalidasi",
      icon: CheckCircle2,
      iconColor: "#2563eb",
      iconBg: "#eff6ff",
      iconBorder: "rgba(37,99,235,.18)",
      glowColor: "rgba(37,99,235,.05)",
    },
    {
      id: "engagement",
      label: "Rata-rata Engagement",
      value: `${avgEngagement}%`,
      unit: "Tinggi",
      subtext: "Interaksi audiens aktif",
      icon: TrendingUp,
      iconColor: "#16a34a",
      iconBg: "#f0fdf4",
      iconBorder: "rgba(22,163,74,.18)",
      glowColor: "rgba(22,163,74,.05)",
    },
    {
      id: "price",
      label: "Tarif Mulai Dari",
      value: lowestStartingPrice > 0 ? formatCompactCurrency(lowestStartingPrice) : "Rp 0",
      unit: "/ proyek",
      subtext: "Fleksibel untuk UMKM",
      icon: Sparkles,
      iconColor: "#d97706",
      iconBg: "#fffbeb",
      iconBorder: "rgba(217,119,6,.18)",
      glowColor: "rgba(217,119,6,.05)",
    },
  ];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0"
      data-testid="creator-summary-cards"
    >
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className="relative p-4 rounded-2xl sm:rounded-[22px] border border-neutral-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm hover:border-neutral-300 group select-none flex flex-col justify-between gap-3 min-w-0"
            style={{
              background: `radial-gradient(circle at 100% 0%, ${c.glowColor}, transparent 8rem), linear-gradient(180deg, #ffffff, #fffdf9)`,
              boxShadow: "0 2px 10px rgba(15,23,42,.03)",
            }}
          >
            {/* Icon */}
            <div className="flex items-center justify-between">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-[13px] sm:rounded-[14px] grid place-items-center border transition-transform duration-300 group-hover:scale-105 shrink-0"
                style={{
                  background: c.iconBg,
                  borderColor: c.iconBorder,
                  boxShadow: "0 2px 6px rgba(0,0,0,.03)",
                }}
              >
                <Icon size={16} color={c.iconColor} />
              </div>
            </div>

            <div className="min-w-0 space-y-1">
              <span className="block text-[0.66rem] sm:text-[0.72rem] font-[800] text-neutral-500 tracking-wider uppercase leading-none truncate">
                {c.label}
              </span>
              <div className="flex items-baseline gap-1.5 leading-none flex-wrap">
                <span className="font-display text-[1.2rem] sm:text-[1.35rem] font-black text-neutral-900 tracking-tight leading-none truncate">
                  {c.value}
                </span>
                <span className="text-[0.68rem] sm:text-[0.74rem] font-bold text-neutral-400 shrink-0">
                  {c.unit}
                </span>
              </div>
              <p className="text-[0.68rem] text-neutral-400 font-medium truncate pt-0.5">
                {c.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
