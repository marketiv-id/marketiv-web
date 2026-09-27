"use client";

import { cn } from "@/lib/utils";
import { Check, Clock, RotateCcw, ArrowRight, Sparkles, Tag } from "lucide-react";

export interface RateCardPackage {
  id: string;
  name: string;
  price: string;
  description: string;
  deliveryDays: number;
  revisionLimit: number | null;
  deliverables: string[];
  recommended?: boolean;
}

interface RateCardPackageCardProps {
  pkg: RateCardPackage;
  onSelectPackage: (pkg: RateCardPackage) => void;
}

export function RateCardPackageCard({ pkg, onSelectPackage }: RateCardPackageCardProps) {
  const isRecommended = pkg.recommended;

  const priceParts = pkg.price.split("/");
  const priceAmount = priceParts[0]?.trim() || pkg.price;
  const priceUnit = priceParts[1] ? `/${priceParts[1].trim()}` : "/ Konten";

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between h-full select-none rounded-[26px] p-6 transition-all duration-300 group hover:-translate-y-1.5",
        isRecommended
          ? "bg-gradient-to-b from-orange-50/70 via-white to-amber-50/40 border-2 border-orange-500/40 shadow-[0_8px_30px_rgba(234,88,12,0.12)] hover:shadow-[0_16px_36px_rgba(234,88,12,0.18)] hover:border-orange-500/60"
          : "bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] hover:border-orange-300/60"
      )}
    >
      {/* Recommended Pill Badge */}
      {isRecommended && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white text-[10px] font-black uppercase tracking-wider border border-white shadow-md shadow-orange-500/25 z-10 flex items-center gap-1.5 whitespace-nowrap">
          <Sparkles className="w-3 h-3 animate-pulse" />
          <span>Paling Populer</span>
        </div>
      )}

      <div className="space-y-5">
        {/* Header & Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border",
                isRecommended
                  ? "bg-orange-500/10 text-orange-700 border-orange-200/80"
                  : "bg-slate-100 text-slate-700 border-slate-200/80"
              )}
            >
              <Tag className="w-2.5 h-2.5" />
              {pkg.name}
            </span>
          </div>

          {/* Price */}
          <div className="pt-1 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-display">
              {priceAmount}
            </span>
            <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
              {priceUnit}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 font-normal leading-relaxed bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
            {pkg.description}
          </p>
        </div>

        {/* Technical Specs (Delivery + Revision) Grid */}
        <div className="grid grid-cols-2 gap-2.5 py-1">
          <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-orange-50/80 border border-orange-100/80">
            <div className="w-7 h-7 rounded-xl bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-bold text-orange-400 uppercase tracking-wider leading-none mb-0.5">
                Pengerjaan
              </span>
              <span className="text-xs font-black text-slate-900 truncate block">
                {pkg.deliveryDays} Hari Kerja
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-blue-50/80 border border-blue-100/80">
            <div className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-bold text-blue-400 uppercase tracking-wider leading-none mb-0.5">
                Revisi
              </span>
              <span className="text-xs font-black text-slate-900 truncate block">
                {pkg.revisionLimit != null && pkg.revisionLimit > 0
                  ? `${pkg.revisionLimit}x Revisi`
                  : "Revisi Arahan"}
              </span>
            </div>
          </div>
        </div>

        {/* Deliverables checklist */}
        <div className="space-y-2.5 pt-1">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Yang Akan Anda Dapatkan
          </span>
          <ul className="space-y-2">
            {pkg.deliverables.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <div className="w-4.5 h-4.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200/60">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span className="text-xs font-semibold text-slate-800 leading-snug">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Select CTA Button */}
      <button
        type="button"
        onClick={() => onSelectPackage(pkg)}
        className={cn(
          "w-full py-3 px-4 rounded-2xl text-xs font-extrabold transition-all duration-200 mt-6 cursor-pointer flex items-center justify-center gap-2 group min-h-[44px]",
          isRecommended
            ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/35 hover:scale-[1.01] active:scale-[0.98]"
            : "bg-slate-900 hover:bg-slate-800 text-white shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.98]"
        )}
      >
        <span>Pilih Paket Ini</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}


