"use client";

import { useState } from "react";
import { FormSectionCard } from "../cards/FormSectionCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AssetLinkStepProps {
  externalAssetUrl: string;
  onChangeExternalAssetUrl: (val: string) => void;
  assetNotes: string;
  onChangeAssetNotes: (val: string) => void;
  validationErrors?: Record<string, string>;
}

export function AssetLinkStep({
  externalAssetUrl,
  onChangeExternalAssetUrl,
  assetNotes,
  onChangeAssetNotes,
  validationErrors = {},
}: AssetLinkStepProps) {
  const [linkStatus, setLinkStatus] = useState<{ message: string; className: string } | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const handleCheckLink = () => {
    const trimmed = externalAssetUrl.trim();
    if (!trimmed) {
      setLinkStatus({
        message: "⚠️ Masukkan tautan terlebih dahulu",
        className: "bg-amber-50 text-amber-900 border-amber-200",
      });
      return;
    }

    if (!trimmed.startsWith("https://")) {
      setLinkStatus({
        message: "⚠️ Tautan harus diawali dengan https://",
        className: "bg-amber-50 text-amber-900 border-amber-200",
      });
      return;
    }

    if (trimmed.includes("drive.google.com")) {
      setLinkStatus({
        message: "✓ Tautan Google Drive dikenali",
        className: "bg-emerald-50 text-emerald-800 border-emerald-200",
      });
    } else if (trimmed.includes("dropbox.com")) {
      setLinkStatus({
        message: "✓ Tautan Dropbox dikenali",
        className: "bg-emerald-50 text-emerald-800 border-emerald-200",
      });
    } else if (trimmed.includes("onedrive") || trimmed.includes("1drv.ms") || trimmed.includes("sharepoint.com")) {
      setLinkStatus({
        message: "✓ Tautan OneDrive dikenali",
        className: "bg-emerald-50 text-emerald-800 border-emerald-200",
      });
    } else {
      setLinkStatus({
        message: "⚠️ Hanya tautan Google Drive, Dropbox, atau OneDrive yang diperbolehkan",
        className: "bg-red-50 text-red-800 border-red-200",
      });
    }
  };

  const folderRecommendations = [
    { icon: "📷", label: "Foto Produk", desc: "Foto produk dari beberapa sisi.", badge: "Disarankan" },
    { icon: "🎬", label: "Video Produk", desc: "Video produk yang dapat digunakan untuk membuat konten.", badge: "Disarankan" },
    { icon: "🏷️", label: "Logo Usaha", desc: "Logo yang dapat ditampilkan dalam video.", badge: "Jika ada" },
    { icon: "💡", label: "Contoh Video", desc: "Contoh gaya video yang Anda sukai.", badge: "Jika ada" },
  ];

  return (
    <FormSectionCard
      title="Foto & Video Produk"
      description="Siapkan foto dan video produk yang dapat digunakan kreator untuk membuat konten."
    >
      {/* ── Section 1: Tautan Folder Input ──────────────── */}
      <div className="space-y-3.5 rounded-2xl bg-neutral-50/50 border border-neutral-200/60 p-4.5 sm:p-5">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200/50 pb-3">
          <label htmlFor="external-asset-url" className="text-sm font-bold text-text-primary">
            Tautan Folder Foto & Video <span className="text-primary">*</span>
          </label>
        </div>

        <p className="text-[11.5px] text-text-muted leading-relaxed">
          Simpan bahan di Google Drive, Dropbox, atau OneDrive, lalu tempel tautannya di bawah ini.
        </p>

        <Input
          id="external-asset-url"
          placeholder="Contoh: https://drive.google.com/drive/folders/..."
          value={externalAssetUrl}
          onChange={(e) => {
            onChangeExternalAssetUrl(e.target.value);
            if (linkStatus) setLinkStatus(null);
          }}
          error={validationErrors.externalAssetUrl}
          helperText={!validationErrors.externalAssetUrl ? "Pastikan folder dapat dibuka oleh siapa pun yang memiliki tautan." : undefined}
          className="font-mono text-xs"
        />

        {/* Link check button & tutorial link */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCheckLink}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200 text-xs font-bold text-ink-800 shadow-2xs transition-all cursor-pointer"
            >
              Periksa Tautan
            </button>
            <button
              type="button"
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className="text-[11.5px] font-semibold text-primary hover:underline cursor-pointer"
            >
              {isGuideOpen ? "Tutup panduan" : "Cara membagikan folder"}
            </button>
          </div>

          {linkStatus && (
            <div className={cn("text-[11px] font-bold px-3 py-1 rounded-full border flex items-center gap-1", linkStatus.className)}>
              <span>{linkStatus.message}</span>
            </div>
          )}
        </div>

        {/* How to share folder guide modal/accordion */}
        {isGuideOpen && (
          <div className="rounded-xl bg-white border border-neutral-200/80 p-4 mt-2 space-y-2.5 text-[11.5px] text-ink-700 animate-in fade-in duration-150">
            <span className="font-bold text-xs text-text-primary block border-b border-neutral-100 pb-1.5">
              Cara membagikan folder:
            </span>
            <ol className="list-decimal list-inside space-y-1.5 font-medium leading-relaxed">
              <li>Buka folder penyimpanan di Google Drive, Dropbox, atau OneDrive.</li>
              <li>Pilih menu <strong>Bagikan (Share)</strong> pada folder tersebut.</li>
              <li>Ubah akses dari &quot;Pribadi&quot; menjadi <strong>&quot;Siapa saja yang memiliki tautan&quot;</strong> (Anyone with the link).</li>
              <li>Klik <strong>Salin Tautan (Copy link)</strong>.</li>
              <li>Tempel tautan di kolom Marketiv ini.</li>
            </ol>
          </div>
        )}
      </div>

      {/* ── Section 2: Informational Box (Folder Access Warning) ── */}
      <div className="bg-blue-50/70 text-blue-950 border border-blue-200/80 rounded-2xl p-4 flex gap-3 text-[11.5px] leading-relaxed">
        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
          i
        </div>
        <div className="space-y-1">
          <span className="font-extrabold block text-xs text-blue-900">Pastikan folder bisa dibuka</span>
          <p>
            Atur akses folder agar siapa pun yang memiliki tautan dapat melihat file. Jika folder masih bersifat pribadi, kreator tidak dapat membuka bahan produk Anda.
          </p>
        </div>
      </div>

      {/* ── Section 3: Recommendation List ── */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-text-primary uppercase tracking-wide">
          Sebaiknya folder berisi
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {folderRecommendations.map((item, index) => (
            <div key={index} className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-neutral-200/80 bg-white shadow-2xs">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-base leading-none mt-0.5 shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-text-primary leading-snug">{item.label}</span>
                  <span className="block text-[10.5px] text-text-muted mt-0.5 font-medium leading-relaxed">{item.desc}</span>
                </div>
              </div>
              <span className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 uppercase tracking-wider",
                item.badge === "Disarankan"
                  ? "bg-orange-50 text-orange-700 border-orange-200/80"
                  : "bg-neutral-100 text-text-muted border-neutral-200"
              )}>
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 4: Notes for Creator ── */}
      <Textarea
        id="asset-notes"
        label="Catatan untuk Kreator (Opsional)"
        rows={3}
        placeholder="Contoh: Gunakan foto produk terbaru. Logo tersedia di folder 'Logo'."
        value={assetNotes}
        onChange={(e) => onChangeAssetNotes(e.target.value)}
        helperText="Tambahkan informasi khusus mengenai file atau folder jika diperlukan."
      />
    </FormSectionCard>
  );
}
