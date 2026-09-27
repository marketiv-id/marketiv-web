"use client";

import { Lightbulb, AlertTriangle, TrendingUp, X, ArrowRight, BarChart2, ShieldCheck } from "lucide-react";
import { useState } from "react";

type InsightType = "insight" | "warning" | "recommendation" | "security";

interface Insight {
  id: string;
  type: string;
  text: string;
}

const INSIGHT_CONFIG: Record<InsightType, {
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  label: string;
  bg: string;
  color: string;
  border: string;
  iconBg: string;
  btnBg: string;
}> = {
  insight: {
    icon: TrendingUp,
    label: "Analisis Usaha",
    bg: "linear-gradient(180deg, #ffffff, #f0f6ff)",
    color: "#2563eb",
    border: "rgba(37,99,235,.16)",
    iconBg: "rgba(37,99,235,.1)",
    btnBg: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
  },
  warning: {
    icon: AlertTriangle,
    label: "Perlu Perhatian",
    bg: "linear-gradient(180deg, #ffffff, #fffbeb)",
    color: "#d97706",
    border: "rgba(217,119,6,.18)",
    iconBg: "rgba(217,119,6,.1)",
    btnBg: "bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200",
  },
  recommendation: {
    icon: Lightbulb,
    label: "Saran Usaha",
    bg: "linear-gradient(180deg, #ffffff, #fff8ef)",
    color: "#ea580c",
    border: "rgba(249,115,22,.18)",
    iconBg: "rgba(249,115,22,.1)",
    btnBg: "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200",
  },
  security: {
    icon: ShieldCheck,
    label: "Keamanan Dana",
    bg: "linear-gradient(180deg, #ffffff, #f0fdf4)",
    color: "#16a34a",
    border: "rgba(22,163,74,.18)",
    iconBg: "rgba(22,163,74,.1)",
    btnBg: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
  },
};

interface InsightSectionProps {
  insights?: Insight[];
  isLoading?: boolean;
  onSearchCreatorClick?: () => void;
  onViewAnalyticsClick?: () => void;
}

export function InsightSection({
  insights = [],
  isLoading = false,
  onSearchCreatorClick,
  onViewAnalyticsClick,
}: InsightSectionProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  
  // Maksimal 2 saran per permintaan user
  const displayInsights = insights
    .filter((i) => !dismissed.includes(i.id))
    .slice(0, 2);

  return (
    <div className="relative rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)] h-full flex flex-col justify-between">
      <div className="flex flex-col h-full justify-between gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-orange-600 block mb-0.5">
              WAWASAN & SARAN
            </span>
            <h3 className="text-base font-black text-slate-900 tracking-tight font-display">
              Saran & Petunjuk Usaha
            </h3>
          </div>

          {displayInsights.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200/80 text-[11px] font-extrabold shrink-0">
              {displayInsights.length} saran
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3 flex-1">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-50 space-y-2 border border-slate-100">
                <div className="w-1/3 h-4 rounded bg-slate-200 animate-pulse" />
                <div className="w-full h-10 rounded bg-slate-200 animate-pulse" />
              </div>
            ))}
          </div>
        ) : displayInsights.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 grid place-items-center">
              <BarChart2 size={22} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 mb-1">
                Belum ada saran baru
              </p>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">
                Saran bisnis akan tampil di sini setelah kampanye Anda berjalan dan memiliki cukup data.
              </p>
            </div>
          </div>
        ) : (
          /* Full-width stacked cards (max 2) — clear text, zero truncation, high readability for UMKM 30-60 y/o */
          <div className="flex flex-col gap-3 flex-1 justify-start">
            {displayInsights.map((insight) => {
              let mappedType: InsightType = "insight";
              if (insight.type === "warning") mappedType = "warning";
              else if (insight.type === "recommendation") mappedType = "recommendation";
              else if (
                insight.type === "success" ||
                insight.text.toLowerCase().includes("escrow") ||
                insight.text.toLowerCase().includes("dana") ||
                insight.text.toLowerCase().includes("aman")
              ) {
                mappedType = "security";
              } else {
                mappedType = "insight";
              }

              const cfg = INSIGHT_CONFIG[mappedType];

              let ctaLabel = "";
              let ctaAction: (() => void) | undefined;
              if (insight.text.toLowerCase().includes("kreator")) {
                ctaLabel = "Cari Kreator";
                ctaAction = onSearchCreatorClick;
              } else if (
                insight.text.toLowerCase().includes("performa") ||
                insight.text.toLowerCase().includes("views") ||
                insight.text.toLowerCase().includes("analisis") ||
                insight.text.toLowerCase().includes("penonton")
              ) {
                ctaLabel = "Lihat Analitik";
                ctaAction = onViewAnalyticsClick;
              } else {
                ctaLabel = "Pelajari Selengkapnya";
                ctaAction = onViewAnalyticsClick;
              }

              const Icon = cfg.icon;

              return (
                <div
                  key={insight.id}
                  className="relative p-4 rounded-2xl border flex flex-col justify-between transition-all duration-200 hover:shadow-sm"
                  style={{
                    background: cfg.bg,
                    borderColor: cfg.border,
                  }}
                >
                  {/* Dismiss button */}
                  <button
                    type="button"
                    aria-label="Tutup saran ini"
                    onClick={() => setDismissed((d) => [...d, insight.id])}
                    className="absolute top-3.5 right-3.5 w-6 h-6 rounded-lg border border-slate-200/60 bg-white/80 hover:bg-white text-slate-400 hover:text-slate-700 grid place-items-center cursor-pointer transition-colors"
                  >
                    <X size={12} />
                  </button>

                  <div className="pr-6">
                    {/* Badge: Icon + Label (Full text, no truncate) */}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded-lg grid place-items-center shrink-0"
                        style={{ background: cfg.iconBg }}
                      >
                        <Icon size={14} className="shrink-0" color={cfg.color} />
                      </div>
                      <span
                        className="text-xs font-extrabold tracking-tight"
                        style={{ color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    {/* Body Text: Full text, NO line-clamp, clear font size for UMKM (30-60 y/o) */}
                    <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed mb-3">
                      {insight.text}
                    </p>
                  </div>

                  {/* Action CTA button */}
                  {ctaLabel && (
                    <button
                      type="button"
                      onClick={ctaAction}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border self-start ${cfg.btnBg}`}
                    >
                      <span>{ctaLabel}</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
