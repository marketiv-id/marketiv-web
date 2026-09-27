import { DashboardCard } from "@/components/features/umkm-dashboard/shared/DashboardCard";
import { DashboardProgress } from "@/components/features/umkm-dashboard/shared/DashboardProgress";
import { DashboardBadge } from "@/components/features/umkm-dashboard/shared/DashboardBadge";

interface BriefQualityCardProps {
  campaignTitle: string;
  productCategory: string;
  productDescription: string;
  mainBrief: string;
  callToAction: string;
  externalAssetUrl: string;
}

export function BriefQualityCard({
  campaignTitle,
  productCategory,
  productDescription,
  mainBrief,
  callToAction,
  externalAssetUrl,
}: BriefQualityCardProps) {
  // Score calculations — brief is optional enrichment
  const checklist = [
    { label: "Informasi Produk Jelas", met: campaignTitle.trim().length > 3 && productDescription.trim().length >= 30, isOptional: false },
    { label: "Kategori Terpilih", met: productCategory.trim().length > 0, isOptional: false },
    { label: "CTA Kampanye Ditentukan", met: callToAction.trim().length > 0, isOptional: false },
    { label: "Arahan Konten Ditambahkan", met: mainBrief.trim().length > 0, isOptional: true },
    { label: "Tautan Aset Terhubung", met: externalAssetUrl.trim().startsWith("https://"), isOptional: true },
  ];

  const score = checklist.filter((c) => c.met).length;
  
  const getQualityText = (s: number) => {
    if (s <= 2) return { text: "Standar", tone: "neutral" as const, progressTone: "orange" as const };
    if (s <= 4) return { text: "Cukup Baik", tone: "amber" as const, progressTone: "orange" as const };
    return { text: "Sangat Premium", tone: "green" as const, progressTone: "green" as const };
  };

  const status = getQualityText(score);

  return (
    <div
      className="rounded-2xl overflow-hidden p-4 space-y-3.5"
      style={{
        border: "1px solid rgba(17,24,39,.08)",
        background: "rgba(255,255,255,.95)",
        boxShadow: "0 2px 8px rgba(15,23,42,.04)",
      }}
    >
      <div
        className="flex items-center justify-between gap-4 pb-3"
        style={{ borderBottom: "1px solid rgba(17,24,39,.07)" }}
      >
        <span className="text-[.74rem] font-[800] text-ink-700 uppercase tracking-[.08em]">
          Kesempurnaan Arahan
        </span>
        <DashboardBadge type="tone" tone={status.tone} className="text-[9px] h-4.5 px-2">
          {status.text}
        </DashboardBadge>
      </div>

      {/* Progress Bar Score */}
      <DashboardProgress
        label={`Skor Kesempurnaan (${score}/5)`}
        value={score}
        max={5}
        tone={status.progressTone}
        className="text-[9px]"
      />

      {/* Checklist Grid */}
      <div className="grid grid-cols-1 gap-2 pt-1">
        {checklist.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-2">
              {item.met ? (
                <svg className="w-3.5 h-3.5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-neutral-300 shrink-0" />
              )}
              <span className={item.met ? "text-text-secondary font-bold" : "text-text-muted font-semibold"}>
                {item.label}
              </span>
            </div>
            {item.isOptional && (
              <span className="text-[8px] text-text-muted bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200/60 shrink-0 font-medium">
                Opsional
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
