"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface SimulatedSnapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  grossAmount: number;
  orderId?: string;
  itemName?: string;
}

export function SimulatedSnapModal({
  isOpen,
  onClose,
  onSuccess,
  grossAmount,
  orderId = `MKT-DEMO-${Date.now().toString().slice(-6)}`,
  itemName = "Deposit Escrow Kampanye Marketiv",
}: SimulatedSnapModalProps) {
  const [activeTab, setActiveTab] = useState<"qris" | "va">("qris");
  const [selectedBank, setSelectedBank] = useState<"bca" | "mandiri" | "bni">("bca");
  const [isCopied, setIsCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const vaNumbers = {
    bca: "8801 2345 6789 0123",
    mandiri: "8902 3456 7890 1234",
    bni: "8803 4567 8901 2345",
  };

  const handleCopyVa = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(vaNumbers[selectedBank].replace(/\s/g, ""));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSimulateSuccess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden bg-white border shadow-2xl rounded-2xl border-border-soft">
        {/* Midtrans Snap Header */}
        <div className="p-5 text-white bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 text-xs font-black text-white rounded-md bg-sky-500">
                M
              </div>
              <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                Midtrans Snap Simulator
              </span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
              Demo Booth
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-3">
            <div>
              <p className="text-[11px] text-slate-400">Total Tagihan</p>
              <p className="text-xl font-extrabold text-white">
                {formatCurrency(grossAmount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Order ID</p>
              <p className="text-xs font-mono font-medium text-slate-300">{orderId}</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 truncate mt-1">
            {itemName}
          </p>
        </div>

        {/* Payment Method Tabs */}
        <div className="flex border-b border-border-soft bg-neutral-50/60">
          <button
            type="button"
            onClick={() => setActiveTab("qris")}
            className={cn(
              "flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors",
              activeTab === "qris"
                ? "border-sky-600 text-sky-700 bg-white"
                : "border-transparent text-text-muted hover:text-text-primary"
            )}
          >
            QRIS / E-Wallet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("va")}
            className={cn(
              "flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors",
              activeTab === "va"
                ? "border-sky-600 text-sky-700 bg-white"
                : "border-transparent text-text-muted hover:text-text-primary"
            )}
          >
            Virtual Account
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-4">
          {activeTab === "qris" ? (
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center justify-between w-full px-2 text-xs text-text-muted">
                <span className="font-semibold text-text-primary">QRIS Nasional</span>
                <span className="font-mono text-emerald-600 font-bold">14:58</span>
              </div>

              {/* Mock QR Code Container */}
              <div className="p-3 bg-white border-2 border-dashed border-neutral-300 rounded-2xl shadow-inner flex flex-col items-center justify-center">
                <div className="w-44 h-44 bg-neutral-900 rounded-lg p-2.5 flex flex-col justify-between items-center text-white relative">
                  {/* Stylized QR grid representation */}
                  <div className="w-full flex justify-between">
                    <div className="w-10 h-10 border-4 border-white rounded-md flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-xs" />
                    </div>
                    <div className="w-10 h-10 border-4 border-white rounded-md flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-xs" />
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-white text-neutral-950 font-black text-xs flex items-center justify-center rounded-md shadow-xs">
                    QRIS
                  </div>
                  <div className="w-full flex justify-between items-end">
                    <div className="w-10 h-10 border-4 border-white rounded-md flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-xs" />
                    </div>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-white rounded-xs" />
                      <div className="w-3 h-3 bg-white rounded-xs" />
                    </div>
                  </div>
                </div>
                <span className="mt-2 text-[10px] text-text-muted font-medium">
                  Scan dengan GoPay, OVO, ShopeePay, BCA, Mandiri
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["bca", "mandiri", "bni"] as const).map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className={cn(
                      "flex-1 py-2 text-xs font-extrabold uppercase rounded-lg border transition-all",
                      selectedBank === bank
                        ? "border-sky-600 bg-sky-50 text-sky-700 shadow-2xs"
                        : "border-border-soft bg-white text-text-secondary hover:bg-neutral-50"
                    )}
                  >
                    {bank}
                  </button>
                ))}
              </div>

              <div className="p-3.5 bg-neutral-50 border border-border-soft rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-text-muted">
                    Nomor Virtual Account
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyVa}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 transition"
                  >
                    {isCopied ? "Tersalin!" : "Salin No. VA"}
                  </button>
                </div>
                <p className="font-mono text-base font-bold tracking-wider text-text-primary">
                  {vaNumbers[selectedBank]}
                </p>
              </div>

              <p className="text-[11px] text-text-muted leading-relaxed">
                Pembayaran akan diverifikasi otomatis tanpa perlu upload bukti transfer.
              </p>
            </div>
          )}

          {/* Exhibition Notice */}
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
            <span className="font-bold text-amber-600">💡</span>
            <span>
              <strong>Mode Booth Pameran:</strong> Anda dapat mengklik tombol hijau di bawah untuk mensimulasikan pembayaran sukses tanpa memotong dana nyata.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-neutral-50/80 border-t border-border-soft flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 h-10 px-3 text-xs font-semibold text-text-secondary bg-white border border-border-soft rounded-xl hover:bg-neutral-100 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSimulateSuccess}
            disabled={isProcessing}
            className="flex-2 h-10 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isProcessing ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Simulasikan Bayar Berhasil</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
