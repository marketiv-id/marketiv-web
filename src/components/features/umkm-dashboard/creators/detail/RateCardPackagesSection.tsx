"use client";

import { RateCardPackageCard, RateCardPackage } from "./RateCardPackageCard";
import { Sparkles } from "lucide-react";

interface RateCardPackagesSectionProps {
  /** Paket dari getCreatorRateCards() — bukan lagi fabrikasi per kategori. */
  packages: RateCardPackage[];
  onSelectPackage: (pkg: RateCardPackage) => void;
  error?: string | null;
  onRetry?: () => void;
}

export function RateCardPackagesSection({
  packages,
  onSelectPackage,
  error,
  onRetry,
}: RateCardPackagesSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100/70 text-orange-700 border border-orange-200/80 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-orange-600" />
            Paket Harga Kolaborasi
          </span>
        </div>
        <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide font-display pt-0.5">
          Pilihan Paket Harga Kreator
        </h3>
        <p className="text-xs text-slate-500 font-semibold">
          Pilih salah satu paket di bawah untuk langsung mengajak kreator ini berkolaborasi.
        </p>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
          <p className="text-sm font-semibold text-red-600 mb-3">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs font-bold bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              Coba Lagi
            </button>
          )}
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-xs">
          <p className="text-xs font-semibold text-slate-500">
            Kreator ini belum mempublikasikan paket harga.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
          {packages.map((pkg) => (
            <RateCardPackageCard
              key={pkg.id}
              pkg={pkg}
              onSelectPackage={onSelectPackage}
            />
          ))}
        </div>
      )}
    </div>
  );
}


