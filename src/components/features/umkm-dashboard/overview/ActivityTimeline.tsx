"use client";

import { UserPlus, FileText, CheckCircle, DollarSign, Rocket, MessageCircle, ChevronRight, Sparkles } from "lucide-react";
import { formatRelativeTime } from "@/lib/formatters";

type ActivityType = "kreator_bergabung" | "submission_baru" | "campaign_selesai" | "dana_cair" | "campaign_dibuat" | "progress";

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
}

const ACTIVITY_CONFIG: Record<ActivityType, {
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  bg: string;
  color: string;
  border: string;
}> = {
  kreator_bergabung: { icon: UserPlus,       bg: "#f0f6ff", color: "#2563eb", border: "rgba(37,99,235,.18)" },
  submission_baru:   { icon: FileText,       bg: "#f7f3ff", color: "#7c3aed", border: "rgba(124,58,237,.18)" },
  campaign_selesai:  { icon: CheckCircle,    bg: "#f1fbf5", color: "#16a34a", border: "rgba(22,163,74,.18)" },
  dana_cair:         { icon: DollarSign,     bg: "#fffbeb", color: "#d97706", border: "rgba(217,119,6,.18)" },
  campaign_dibuat:   { icon: Rocket,         bg: "#fff7ed", color: "#ea580c", border: "rgba(234,88,12,.18)" },
  progress:          { icon: MessageCircle,  bg: "#f0f9ff", color: "#0284c7", border: "rgba(2,132,199,.18)" },
};

function formatActivityTime(val: string): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return formatRelativeTime(val);
  } catch {
    return val;
  }
}

interface ActivityTimelineProps {
  activities?: Activity[];
  isLoading?: boolean;
  onViewAllClick?: () => void;
}

export function ActivityTimeline({ activities = [], isLoading = false, onViewAllClick }: ActivityTimelineProps) {
  // Capped at 4 activities
  const visibleActivities = activities.slice(0, 4);

  return (
    <div
      className="relative rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)] h-full flex flex-col justify-between"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 block mb-0.5">
              AKTIVITAS TERBARU
            </span>
            <h3 className="text-base font-black text-slate-900 tracking-tight font-display">
              Aktivitas Kampanye
            </h3>
          </div>

          <button
            type="button"
            onClick={onViewAllClick}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-orange-600 transition-colors cursor-pointer shrink-0"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3 flex-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2 py-0.5">
                  <div className="w-1/2 h-3 rounded bg-slate-200" />
                  <div className="w-3/4 h-2.5 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleActivities.length === 0 ? (
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-orange-50/30 border border-dashed border-orange-200/70">
              <div className="w-8 h-8 rounded-xl bg-orange-100/70 border border-orange-200/60 flex items-center justify-center text-orange-600 shrink-0">
                <Rocket size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <h5 className="text-xs font-black text-slate-800 leading-snug">Buat Kampanye Pertama</h5>
                <p className="text-[11px] font-medium text-slate-500 leading-tight">Mulai kampanye agar kreator dapat mengklaim pekerjaan Anda.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-200/80">
              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                <Sparkles size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <h5 className="text-xs font-black text-slate-700 leading-snug">Belum Ada Aktivitas</h5>
                <p className="text-[11px] font-medium text-slate-400 leading-tight">Riwayat klaim &amp; bukti posting akan tampil otomatis di sini.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 flex-1 flex flex-col justify-start">
            {visibleActivities.map((act) => {
              let mappedType: ActivityType = "kreator_bergabung";
              if (act.type === "submission")      mappedType = "submission_baru";
              else if (act.type === "payment")    mappedType = "dana_cair";
              else if (act.type === "campaign")   mappedType = "campaign_dibuat";
              else if (act.type === "progress")   mappedType = "progress";

              const cfg  = ACTIVITY_CONFIG[mappedType];
              const Icon = cfg.icon;

              return (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-slate-100/60 transition-colors group"
                >
                  {/* Icon badge */}
                  <div
                    className="w-8 h-8 rounded-xl grid place-items-center shrink-0 border transition-transform group-hover:scale-105 mt-0.5"
                    style={{
                      background: cfg.bg,
                      borderColor: cfg.border,
                    }}
                  >
                    <Icon size={15} color={cfg.color} />
                  </div>

                  {/* Content card */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <strong className="text-xs font-black text-slate-900 leading-snug truncate">
                        {act.title}
                      </strong>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0 whitespace-nowrap">
                        {formatActivityTime(act.time)}
                      </span>
                    </div>
                    <p className="text-[11px] font-normal text-slate-600 leading-tight line-clamp-2">
                      {act.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* When only 1 activity exists, show 1 placeholder below it as requested */}
            {visibleActivities.length === 1 && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-orange-50/30 border border-dashed border-orange-200/70 mt-1">
                <div className="w-8 h-8 rounded-xl bg-orange-100/70 border border-orange-200/60 flex items-center justify-center text-orange-600 shrink-0">
                  <Sparkles size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-black text-slate-800 leading-snug">Menunggu Aktivitas Berikutnya</h5>
                  <p className="text-[11px] font-medium text-slate-500 leading-tight">
                    Aktivitas klaim &amp; pengiriman bukti kreator akan muncul otomatis di sini.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
