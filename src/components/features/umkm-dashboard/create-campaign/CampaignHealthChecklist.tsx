"use client";

import { STEP_TIPS } from "./create-campaign.constants";
import { cn } from "@/lib/utils";
import { ClipboardList, Check, AlertTriangle, Lightbulb } from "lucide-react";

interface CampaignHealthChecklistProps {
  currentStep: number;
  productInfoValid: boolean;
  briefValid: boolean;
  assetValid: boolean;
  budgetValid: boolean;
  reviewValid: boolean;
  stepValidationTried?: Record<number, boolean>;
}

export function CampaignHealthChecklist({
  currentStep,
  productInfoValid,
  briefValid,
  assetValid,
  budgetValid,
  reviewValid,
  stepValidationTried = {},
}: CampaignHealthChecklistProps) {
  const getStepStatus = (stepNum: number, isValid: boolean) => {
    const tried = stepValidationTried[stepNum];
    if (currentStep === stepNum) return tried && !isValid ? "invalid" : "active";
    if (isValid) return "completed";
    if (tried) return "invalid";
    return "pending";
  };

  const checkItems = [
    { step: 1, label: "Informasi Produk",     desc: "Nama & deskripsi produk",       status: getStepStatus(1, productInfoValid) },
    { step: 2, label: "Arahan Konten",        desc: "Gaya video & pesan utama",      status: getStepStatus(2, briefValid) },
    { step: 3, label: "Bahan Video",          desc: "Tautan foto & video produk",    status: getStepStatus(3, assetValid) },
    { step: 4, label: "Biaya & Kuota",        desc: "Biaya tayang & kuota kreator",   status: getStepStatus(4, budgetValid) },
    { step: 5, label: "Ringkasan & Bayar",    desc: "Konfirmasi biaya & simpanan dana", status: getStepStatus(5, reviewValid) },
  ];

  const activeTip = STEP_TIPS[currentStep] || "Lengkapi formulir secara perlahan.";

  const completedCount = checkItems.filter((i) => i.status === "completed").length;

  return (
    <div className="space-y-3">

      {/* ── Tip card ──────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-3.5"
        style={{
          background: "linear-gradient(135deg, rgba(255,247,237,.95), rgba(255,237,213,.5))",
          border: "1px solid rgba(249,115,22,.18)",
          boxShadow: "0 2px 8px rgba(234,88,12,.07)",
        }}
      >
        {/* Left accent */}
        <div className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r-full bg-gradient-to-b from-orange-400 to-orange-600" />

        <div className="pl-2 flex items-start gap-2.5">
          <Lightbulb size={14} className="text-orange-500 shrink-0 mt-0.5" />
          <div>
            <span className="block text-[.68rem] font-[800] text-orange-600 uppercase tracking-[.10em] mb-0.5">
              Tips Langkah Ini
            </span>
            <p className="text-[.78rem] font-[640] text-ink-700 leading-relaxed">
              &ldquo;{activeTip}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* ── Checklist card ────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border: "1px solid rgba(17,24,39,.08)",
          background: "rgba(255,255,255,.95)",
          boxShadow: "0 2px 8px rgba(15,23,42,.04)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(17,24,39,.07)" }}
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-orange-500 shrink-0" />
            <span className="text-[.74rem] font-[800] text-ink-700 uppercase tracking-[.08em]">
              Kelengkapan
            </span>
          </div>
          <span
            className="text-[.7rem] font-[800] tabular-nums"
            style={{ color: completedCount === 5 ? "#16a34a" : "#ea580c" }}
          >
            {completedCount}/5
          </span>
        </div>

        {/* Items */}
        <div className="px-4 py-3 space-y-3">
          {checkItems.map((item) => {
            const isActive    = item.status === "active";
            const isCompleted = item.status === "completed";
            const isInvalid   = item.status === "invalid";

            return (
              <div key={item.step} className="flex items-start gap-2.5">
                {/* Status indicator */}
                <div className="shrink-0 mt-0.5">
                  {isCompleted ? (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 2px 6px rgba(16,185,129,.22)" }}
                    >
                      <Check size={10} strokeWidth={3} className="text-white" />
                    </span>
                  ) : isInvalid ? (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "0 2px 6px rgba(239,68,68,.22)" }}
                    >
                      <AlertTriangle size={9} strokeWidth={3} className="text-white" />
                    </span>
                  ) : isActive ? (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[.65rem] font-[800] text-white animate-pulse"
                      style={{ background: "linear-gradient(135deg,#fb7a18,#ea580c)", boxShadow: "0 2px 6px rgba(234,88,12,.25)" }}
                    >
                      {item.step}
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[.65rem] font-[700] text-ink-400 border-2 border-neutral-200 bg-white">
                      {item.step}
                    </span>
                  )}
                </div>

                {/* Label */}
                <div className="min-w-0 flex-1">
                  <span className={cn(
                    "block text-[.78rem] font-[720] leading-tight",
                    isActive    && "text-orange-600",
                    isCompleted && "text-ink-800",
                    isInvalid   && "text-red-500",
                    !isActive && !isCompleted && !isInvalid && "text-ink-400",
                  )}>
                    {item.label}
                  </span>
                  <span className="block text-[.68rem] text-ink-400 font-[550] mt-0.5 leading-tight">
                    {item.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
