"use client";

import { TrendingUp, Users, Eye, Wallet, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroOverviewProps {
  businessName?: string;
  campaignAktif?: number;
  totalViews?: string;
  totalKreator?: number;
  danaBerjalan?: string;
  isLoading?: boolean;
}

function SkeletonBlock({ width = "100%", height = 16 }: { width?: string | number; height?: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg bg-slate-200/70"
      style={{ width, height }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
        style={{ animation: "shimmer 1.45s infinite" }}
      />
    </div>
  );
}

export function HeroOverview({
  businessName = "",
  campaignAktif,
  totalViews = "—",
  totalKreator,
  danaBerjalan = "—",
  isLoading = false,
}: HeroOverviewProps) {
  const stats = [
    {
      icon: TrendingUp,
      label: "KAMPANYE AKTIF",
      value: campaignAktif === undefined ? "—" : String(campaignAktif),
      cardBg: "bg-gradient-to-br from-orange-50/70 via-orange-50/30 to-white",
      borderColor: "border-orange-200/80 hover:border-orange-300",
      iconBg: "bg-orange-500/10 text-orange-600 border-orange-200/60",
    },
    {
      icon: Eye,
      label: "TOTAL TAYANGAN",
      value: totalViews,
      cardBg: "bg-gradient-to-br from-blue-50/70 via-blue-50/30 to-white",
      borderColor: "border-blue-200/80 hover:border-blue-300",
      iconBg: "bg-blue-500/10 text-blue-600 border-blue-200/60",
    },
    {
      icon: Users,
      label: "PARTISIPASI KREATOR",
      value: totalKreator === undefined ? "—" : String(totalKreator),
      cardBg: "bg-gradient-to-br from-emerald-50/70 via-emerald-50/30 to-white",
      borderColor: "border-emerald-200/80 hover:border-emerald-300",
      iconBg: "bg-emerald-500/10 text-emerald-600 border-emerald-200/60",
    },
    {
      icon: Wallet,
      label: "DANA BERJALAN",
      value: danaBerjalan,
      cardBg: "bg-gradient-to-br from-amber-50/70 via-amber-50/30 to-white",
      borderColor: "border-amber-200/80 hover:border-amber-300",
      iconBg: "bg-amber-500/10 text-amber-600 border-amber-200/60",
    },
  ];

  return (
    <div
      data-onboarding="dashboard-overview"
      className="relative rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.04)] overflow-hidden"
    >
      {/* Background subtle mesh glow */}
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 w-80 h-80 rounded-full bg-orange-100/40 blur-3xl pointer-events-none -mr-20 -mt-20"
      />

      <div className="relative z-10">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="grid gap-2.5">
                <SkeletonBlock width={130} height={12} />
                <SkeletonBlock width={300} height={32} />
                <SkeletonBlock width={220} height={12} />
              </div>
            ) : (
              <>
                {/* Active Pill */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-orange-200 bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-wider mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
                  <span>DASHBOARD UMKM</span>
                  <Sparkles size={11} className="text-orange-600 ml-0.5" />
                </div>

                {/* Greeting Header */}
                <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  Selamat Datang,{" "}
                  <span className="text-orange-600 font-black">
                    {businessName || "Mitra UMKM"}
                  </span>
                </h1>

                <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
                  Ringkasan performa kampanye & kolaborasi bisnis Anda hari ini.
                </p>
              </>
            )}
          </div>
        </div>

        {/* 4 KPI Stat Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "group p-4 sm:p-5 rounded-2xl border transition-all duration-300 select-none hover:-translate-y-1 hover:shadow-sm flex flex-col justify-between",
                stat.cardBg,
                stat.borderColor
              )}
            >
              {isLoading ? (
                <div className="grid gap-2">
                  <SkeletonBlock width={30} height={30} />
                  <SkeletonBlock width="70%" height={24} />
                  <SkeletonBlock width="50%" height={10} />
                </div>
              ) : (
                <>
                  {/* Top row: Icon */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-300 group-hover:scale-105",
                        stat.iconBg
                      )}
                    >
                      <stat.icon size={16} strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Bottom row: Label + Large Value */}
                  <div>
                    <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-0.5">
                      {stat.label}
                    </span>
                    <div className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                      {stat.value}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}





