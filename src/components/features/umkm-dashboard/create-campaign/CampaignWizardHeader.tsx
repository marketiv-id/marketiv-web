"use client";

import { Save } from "lucide-react";

interface CampaignWizardHeaderProps {
  onSaveDraft: () => void;
  onCancel: () => void;
}

export function CampaignWizardHeader({ onSaveDraft, onCancel }: CampaignWizardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 mb-6 border-b border-neutral-200/80">
      {/* Left: Section label & title */}
      <div>
        {/* Section label */}
        <div className="inline-flex items-center gap-2 text-orange-600 text-[.72rem] font-[900] tracking-[.12em] uppercase mb-1.5">
          <span className="block w-[16px] h-0.5 rounded-full bg-orange-500 shrink-0" />
          Kampanye
        </div>

        {/* Title */}
        <h2 data-onboarding="campaign-create-heading" className="font-display text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold tracking-[-0.065em] text-ink-950 m-0 mb-1.5 leading-none">
          Buat Kampanye Baru
        </h2>
        <p className="text-ink-500 text-[.85rem] m-0 max-w-xl leading-relaxed">
          Buat kampanye berbasis tayangan, atur arahan, aset, anggaran, dan kuota kreator dalam satu alur.
        </p>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-2.5 shrink-0 self-start md:self-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center min-h-[42px] px-5 rounded-full border border-neutral-200/80 bg-white text-ink-950 text-[.84rem] font-bold shadow-2xs hover:bg-neutral-50 active:scale-[.98] transition-all cursor-pointer"
        >
          Kembali
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          className="inline-flex items-center gap-2 min-h-[42px] px-5 rounded-full border border-orange-200 bg-gradient-to-b from-orange-50 to-orange-100/70 text-orange-700 text-[.84rem] font-extrabold tracking-[.01em] shadow-[0_2px_8px_rgba(234,88,12,0.08)] hover:bg-orange-100 hover:border-orange-300 hover:-translate-y-px active:scale-[.98] transition-all cursor-pointer"
        >
          <Save size={14} className="text-orange-600 shrink-0" />
          <span>Simpan Draf</span>
        </button>
      </div>
    </div>
  );
}
