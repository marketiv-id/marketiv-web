"use client";

import { useEffect, useRef, useState } from "react";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal";

interface SendCustomOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (offer: { finalPrice: number; scope: string; deadline: string; revisionCount: number; packageId?: string }) => Promise<void>;
  creatorName: string;
  packageContext?: {
    id: string;
    name: string;
    price: number;
    description: string;
    revisionLimit?: number;
    deliveryDays?: number;
  };
}

export function SendCustomOfferModal({ isOpen, onClose, onConfirm, creatorName, packageContext }: SendCustomOfferModalProps) {
  const [scope, setScope] = useState("");
  const [price, setPrice] = useState(0);
  const [deadline, setDeadline] = useState("");
  const [revisions, setRevisions] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initializedPackageRef = useRef<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!isOpen || !packageContext || initializedPackageRef.current === packageContext.id) return;
    const suggestedDeadline = new Date();
    suggestedDeadline.setDate(suggestedDeadline.getDate() + (packageContext.deliveryDays ?? 0));
    setPrice(packageContext.price);
    setScope(packageContext.description);
    setRevisions(packageContext.revisionLimit ?? 1);
    if (packageContext.deliveryDays) setDeadline(suggestedDeadline.toISOString().split("T")[0]);
    initializedPackageRef.current = packageContext.id;
  }, [isOpen, packageContext]);

  useEffect(() => {
    if (!isOpen) initializedPackageRef.current = null;
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onConfirm({
        finalPrice: price,
        scope,
        deadline: new Date(deadline).toISOString(),
        revisionCount: revisions,
        packageId: packageContext?.id,
      });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal mengirim penawaran. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent className="max-w-lg w-full p-0 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wide">Kesepakatan Kerja</span>
            <h3 className="text-base font-extrabold text-ink-950 tracking-tight mt-0.5">
              Kirim Penawaran ke {creatorName}
            </h3>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <ResponsiveModalDescription className="hidden" />

          {packageContext && (
            <div className="rounded-xl bg-orange-50/80 border border-orange-200/80 p-3 text-xs">
              <p className="font-extrabold text-orange-950">Paket Acuan: {packageContext.name}</p>
              <p className="text-orange-700 mt-1">Harga paket menjadi acuan. Harga, lingkup, batas waktu, dan revisi di bawah tetap dapat diubah.</p>
            </div>
          )}

          {/* Scope input */}
          <div className="space-y-1.5">
            <label htmlFor="modal-scope" className="block text-xs font-extrabold text-text-primary uppercase tracking-wide">
              Rincian Pekerjaan & Konten <span className="text-orange-600">*</span>
            </label>
            <textarea
              id="modal-scope"
              required
              rows={3}
              placeholder="Jelaskan detail video yang diminta, durasi, dan hal yang harus ditampilkan..."
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs text-text-primary focus:outline-none focus:border-orange-500 resize-none leading-relaxed"
            />
          </div>

          {/* Pricing & Revisions grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="modal-price" className="block text-xs font-extrabold text-text-primary uppercase tracking-wide">
                Harga Kesepakatan <span className="text-orange-600">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs font-extrabold text-text-muted">Rp</span>
                <input
                  id="modal-price"
                  type="number"
                  required
                  min={10000}
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs font-extrabold text-ink-950 focus:outline-none focus:border-orange-500 font-display"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="modal-revisions" className="block text-xs font-extrabold text-text-primary uppercase tracking-wide">
                Batas Revisi
              </label>
              <input
                id="modal-revisions"
                type="number"
                min={0}
                value={revisions}
                onChange={(e) => setRevisions(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs font-extrabold text-ink-950 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <label htmlFor="modal-deadline" className="block text-xs font-extrabold text-text-primary uppercase tracking-wide">
              Batas Waktu Selesai <span className="text-orange-600">*</span>
            </label>
            <input
              id="modal-deadline"
              type="date"
              required
              min={todayStr}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs font-extrabold text-ink-950 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Agreement Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              required
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500 accent-orange-600 cursor-pointer shrink-0"
            />
            <span className="text-xs text-text-secondary leading-relaxed font-medium">
              Saya telah menyepakati rincian harga dan pekerjaan di atas bersama kreator.
            </span>
          </label>

          {submitError && (
            <p className="text-xs font-bold text-red-600 text-center px-1">{submitError}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2.5 pt-3 border-t border-neutral-200/50">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 min-h-[44px] px-4 rounded-full border border-neutral-200/80 bg-white text-ink-950 text-xs font-bold shadow-2xs hover:bg-neutral-50 active:scale-[.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!agreed || submitting}
              className="flex-1 min-h-[44px] px-4 rounded-full border border-orange-900/20 bg-gradient-to-b from-[#fb7a18] to-primary-600 text-white text-xs font-extrabold shadow-[0_10px_28px_rgba(234,88,12,.28),inset_0_1px_0_rgba(255,255,255,.22)] hover:shadow-[0_14px_36px_rgba(234,88,12,.36)] hover:-translate-y-px active:scale-[.98] transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
            >
              {submitting ? "Mengirim…" : "Kirim Penawaran"}
            </button>
          </div>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
