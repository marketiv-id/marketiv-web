"use client";

import { useState, useEffect } from "react";
import { FormSectionCard } from "../cards/FormSectionCard";
import { BudgetCalculatorCard } from "../cards/BudgetCalculatorCard";
import { formatCurrency } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface BudgetQuotaStepProps {
  pricePerThousandViews: number;
  onChangePricePerThousandViews: (val: number) => void;
  totalBudgetEscrow: number;
  onChangeTotalBudgetEscrow: (val: number) => void;
  creatorQuota: number;
  onChangeCreatorQuota: (val: number) => void;
  validationErrors?: Record<string, string>;
}

export function BudgetQuotaStep({
  pricePerThousandViews,
  onChangePricePerThousandViews,
  totalBudgetEscrow,
  onChangeTotalBudgetEscrow,
  creatorQuota,
  onChangeCreatorQuota,
  validationErrors = {},
}: BudgetQuotaStepProps) {
  const isCustomPrice =
    pricePerThousandViews > 0 && ![3000, 5000, 8000].includes(pricePerThousandViews);
  const [customPriceActive, setCustomPriceActive] = useState(isCustomPrice);

  useEffect(() => {
    if (pricePerThousandViews > 0 && ![3000, 5000, 8000].includes(pricePerThousandViews)) {
      setCustomPriceActive(true);
    } else if ([3000, 5000, 8000].includes(pricePerThousandViews)) {
      setCustomPriceActive(false);
    }
  }, [pricePerThousandViews]);

  const priceTiers = [
    { id: 3000, label: "Rp 3.000" },
    { id: 5000, label: "Rp 5.000" },
    { id: 8000, label: "Rp 8.000" },
  ];

  const quickBudgets = [
    { label: "Rp 500rb", value: 500000 },
    { label: "Rp 1 Jt", value: 1000000 },
    { label: "Rp 2 Jt", value: 2000000 },
    { label: "Rp 3 Jt", value: 3000000 },
  ];

  const handlePriceSelect = (price: number) => {
    setCustomPriceActive(false);
    onChangePricePerThousandViews(price);
  };

  const handleCustomPriceSelect = () => {
    setCustomPriceActive(true);
    if (!pricePerThousandViews || [3000, 5000, 8000].includes(pricePerThousandViews)) {
      onChangePricePerThousandViews(10000);
    }
  };

  const incrementQuota = () => {
    onChangeCreatorQuota((creatorQuota || 0) + 1);
  };

  const decrementQuota = () => {
    if (creatorQuota > 1) {
      onChangeCreatorQuota(creatorQuota - 1);
    }
  };

  return (
    <FormSectionCard
      title="Anggaran & Jumlah Kreator"
      description="Tentukan dana kampanye, bayaran untuk kreator, dan jumlah kreator yang dapat mengikuti kampanye."
    >
      {/* ── 1. Berapa dana yang ingin disiapkan? ──────────────── */}
      <div id="field-total-budget" className="space-y-3.5 rounded-2xl bg-neutral-50/50 border border-neutral-200/60 p-4.5 sm:p-5">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200/50 pb-3">
          <label htmlFor="total-budget" className="text-sm font-bold text-text-primary">
            1. Berapa dana yang ingin disiapkan? <span className="text-primary">*</span>
          </label>
        </div>

        <p className="text-[11.5px] text-text-muted leading-relaxed">
          Masukkan total dana yang ingin digunakan untuk kampanye ini.
        </p>

        {/* Quick Amount Presets */}
        <div className="flex flex-wrap gap-2 pt-1">
          {quickBudgets.map((b) => {
            const isSelected = totalBudgetEscrow === b.value;
            return (
              <button
                key={b.value}
                type="button"
                onClick={() => onChangeTotalBudgetEscrow(b.value)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none",
                  isSelected
                    ? "bg-orange-50 text-orange-800 border-orange-300 shadow-2xs"
                    : "bg-white text-text-secondary border-neutral-200 hover:bg-orange-50/30 hover:border-orange-200"
                )}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        {/* Rupiah Input */}
        <div className="relative flex items-center max-w-sm pt-1">
          <span className="absolute left-3.5 text-xs font-extrabold text-text-muted z-10">Rp</span>
          <Input
            id="total-budget"
            type="number"
            min={100000}
            step={50000}
            placeholder="3000000"
            value={totalBudgetEscrow || ""}
            onChange={(e) => onChangeTotalBudgetEscrow(Math.max(0, parseInt(e.target.value) || 0))}
            error={validationErrors.totalBudgetEscrow}
            className="pl-10 font-mono text-sm font-bold"
          />
        </div>
        {totalBudgetEscrow > 0 && (
          <span className="text-[11px] font-bold text-orange-700 block pt-0.5">
            Total Dana: {formatCurrency(totalBudgetEscrow)}
          </span>
        )}
      </div>

      {/* ── 2. Bayaran Kreator per 1.000 Tayangan ───────────── */}
      <div id="field-price-per-views" className="space-y-3.5 rounded-2xl bg-neutral-50/50 border border-neutral-200/60 p-4.5 sm:p-5">
        <label className="block text-sm font-bold text-text-primary border-b border-neutral-200/50 pb-3">
          2. Bayaran Kreator per 1.000 Tayangan <span className="text-primary">*</span>
        </label>

        <p className="text-[11.5px] text-text-muted leading-relaxed">
          Kreator mendapat bayaran berdasarkan jumlah tayangan yang telah dinyatakan valid.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {priceTiers.map((tier) => {
            const isSelected = !customPriceActive && pricePerThousandViews === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => handlePriceSelect(tier.id)}
                className={cn(
                  "p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[56px] select-none",
                  isSelected
                    ? "bg-orange-50 border-orange-300 text-orange-800 shadow-2xs font-extrabold"
                    : "bg-white border-neutral-200/80 hover:bg-neutral-50 hover:border-neutral-300 text-text-primary font-bold"
                )}
              >
                <span className="text-xs">{tier.label}</span>
              </button>
            );
          })}

          {/* Nominal lain */}
          <button
            type="button"
            onClick={handleCustomPriceSelect}
            className={cn(
              "p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[56px] select-none",
              customPriceActive
                ? "bg-orange-50 border-orange-300 text-orange-800 shadow-2xs font-extrabold"
                : "bg-white border-neutral-200/80 hover:bg-neutral-50 hover:border-neutral-300 text-text-primary font-bold"
            )}
          >
            <span className="text-xs">Nominal lain</span>
          </button>
        </div>

        {/* Custom Price Input */}
        {customPriceActive && (
          <div className="pt-2 max-w-xs space-y-1.5 animate-in fade-in duration-150">
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wide">Nominal Lain (Rupiah / 1.000 views)</span>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-bold text-text-muted z-10">Rp</span>
              <Input
                type="number"
                min={1000}
                placeholder="10000"
                value={pricePerThousandViews || ""}
                onChange={(e) => onChangePricePerThousandViews(Math.max(0, parseInt(e.target.value) || 0))}
                className="pl-9 font-mono text-xs font-bold"
              />
            </div>
            <p className="text-[10px] text-text-muted">Minimal bayaran Rp 1.000 per 1.000 tayangan.</p>
          </div>
        )}

        {validationErrors.pricePerThousandViews && (
          <p className="text-xs text-destructive">{validationErrors.pricePerThousandViews}</p>
        )}
      </div>

      {/* ── 3. Jumlah Kreator ───────────────────────────────── */}
      <div id="field-creator-quota" className="space-y-3.5 rounded-2xl bg-neutral-50/50 border border-neutral-200/60 p-4.5 sm:p-5">
        <label className="block text-sm font-bold text-text-primary border-b border-neutral-200/50 pb-3">
          3. Jumlah Kreator <span className="text-primary">*</span>
        </label>

        <p className="text-[11.5px] text-text-muted leading-relaxed">
          Tentukan jumlah maksimal kreator yang dapat mengikuti kampanye.
        </p>

        <div className="flex items-center gap-3 pt-1">
          <div className="flex items-center border border-neutral-300/90 rounded-xl overflow-hidden bg-neutral-100/60 shadow-3xs">
            <button
              type="button"
              onClick={decrementQuota}
              className="h-11 w-11 flex items-center justify-center font-bold text-base hover:bg-neutral-200/60 cursor-pointer select-none text-text-secondary"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              placeholder="1"
              value={creatorQuota || ""}
              onChange={(e) => onChangeCreatorQuota(Math.max(0, parseInt(e.target.value) || 0))}
              className="h-11 w-16 text-center bg-white text-sm font-extrabold text-ink-950 focus:outline-none border-x border-neutral-300/90 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={incrementQuota}
              className="h-11 w-11 flex items-center justify-center font-bold text-base hover:bg-neutral-100 cursor-pointer select-none text-text-secondary"
            >
              +
            </button>
          </div>
          <span className="text-xs text-text-secondary font-semibold">
            Maksimal {creatorQuota || 1} kreator dapat mengikuti kampanye ini.
          </span>
        </div>
        {validationErrors.creatorQuota && (
          <p className="text-xs text-destructive">{validationErrors.creatorQuota}</p>
        )}
      </div>

      {/* ── Perkiraan Kampanye & Rincian Pembayaran Panel ── */}
      <BudgetCalculatorCard
        pricePerThousandViews={pricePerThousandViews}
        totalBudgetEscrow={totalBudgetEscrow}
        creatorQuota={creatorQuota}
      />

      {/* ── Bagaimana Dana Kampanye Digunakan? ───────────── */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 space-y-4 shadow-2xs">
        <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-wider">
          Bagaimana dana kampanye digunakan?
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-extrabold">
              1
            </div>
            <span className="block font-bold text-xs text-text-primary">Anda Melakukan Pembayaran</span>
            <p className="text-[11px] text-text-muted leading-relaxed font-medium">
              Dana kampanye dibayarkan melalui Marketiv.
            </p>
          </div>

          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-extrabold">
              2
            </div>
            <span className="block font-bold text-xs text-text-primary">Dana Diamankan Sementara</span>
            <p className="text-[11px] text-text-muted leading-relaxed font-medium">
              Dana ditahan dan tidak langsung diberikan ke kreator.
            </p>
          </div>

          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-extrabold">
              3
            </div>
            <span className="block font-bold text-xs text-text-primary">Kreator Dibayar</span>
            <p className="text-[11px] text-text-muted leading-relaxed font-medium">
              Pembayaran dilakukan setelah hasil tayangan dinyatakan valid.
            </p>
          </div>
        </div>
      </div>
    </FormSectionCard>
  );
}
