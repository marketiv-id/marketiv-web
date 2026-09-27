import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { resolveStatusLabel, resolveTransactionStatusLabel } from "@/lib/dashboard-labels";

export function CreatorEmptyState({ title, description, icon, actionButton }: { title: string; description: string; icon?: ReactNode; actionButton?: ReactNode }) {
  return <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white/70 backdrop-blur-md rounded-2xl border border-neutral-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.01)] max-w-lg mx-auto mt-6"><div className="w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary mb-6 shadow-sm">{icon || <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4" /></svg>}</div><h3 className="text-lg font-extrabold text-neutral-900 mb-2">{title}</h3><p className="text-sm text-neutral-500 font-medium leading-relaxed max-w-sm mb-6">{description}</p>{actionButton && <div className="flex justify-center w-full">{actionButton}</div>}</div>;
}

export function CreatorErrorState({ errorMsg = "Gagal memuat data dari server.", onRetry }: { errorMsg?: string; onRetry: () => void }) {
  return <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-red-50/15 backdrop-blur-md rounded-2xl border border-red-200/40 shadow-[0_8px_30px_rgb(239,68,68,0.01)] max-w-lg mx-auto mt-6"><div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 mb-6 shadow-sm"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div><h3 className="text-lg font-extrabold text-neutral-900 mb-2">Koneksi Gagal</h3><p className="text-sm text-neutral-500 font-medium leading-relaxed max-w-sm mb-6">{errorMsg}</p><button onClick={onRetry} className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all border border-red-600/20 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2" /></svg><span>Coba Lagi</span></button></div>;
}

type CreatorStatusType = "campaign" | "claim" | "submission" | "negotiation" | "transaction";
export function CreatorStatusBadge({ status, type, className }: { status: string; type: CreatorStatusType; className?: string }) {
  const value = status.toLowerCase();
  const success = ["aktif", "valid", "success", "succeeded", "selesai", "complete", "completed", "matured", "verified", "settlement", "paid", "approved", "released"].includes(value);
  const pending = ["pending", "requested", "menunggupembayaran", "waiting_payment", "menungguverifikasi", "waiting_verification", "processing", "revisi", "negosiasi", "negotiation"].includes(value);
  const escrow = value === "escrow" || value === "underreview" || value === "under_review";
  const dispute = value === "dispute" || value === "open";

  const tone = success
    ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
    : pending
    ? "bg-amber-50 text-amber-700 border-amber-200/60"
    : escrow
    ? "bg-violet-50 text-violet-700 border-violet-200/60"
    : dispute
    ? "bg-purple-50 text-purple-700 border-purple-200/60"
    : "bg-rose-50 text-rose-700 border-rose-200/60";

  const label =
    type === "transaction" ? resolveTransactionStatusLabel(value, "payee") : resolveStatusLabel(value, type);

  const dot = success
    ? "bg-emerald-500"
    : pending
    ? "bg-amber-500"
    : escrow
    ? "bg-violet-500"
    : dispute
    ? "bg-purple-500"
    : "bg-rose-500";

  return (
    <span
      data-status-type={type}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider shadow-3xs shrink-0",
        tone,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {label}
    </span>
  );
}
