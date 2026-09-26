"use client";

import { useRef } from "react";
import {
  UtensilsCrossed,
  Shirt,
  MapPin,
  BookOpen,
  Sparkles,
  LayoutGrid,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { FormSectionCard } from "../cards/FormSectionCard";
import { SelectableOptionCard } from "../cards/SelectableOptionCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NICHE_OPTIONS } from "../create-campaign.constants";
import { CAMPAIGN_TYPE_OPTIONS } from "@/lib/validations/campaign.schema";

const NICHE_ICONS: Record<string, React.ReactNode> = {
  kuliner:    <UtensilsCrossed size={16} />,
  fashion:    <Shirt size={16} />,
  pariwisata: <MapPin size={16} />,
  edukasi:    <BookOpen size={16} />,
  kecantikan: <Sparkles size={16} />,
  lainnya:    <LayoutGrid size={16} />,
};

interface ProductInfoStepProps {
  title: string;
  onChangeTitle: (val: string) => void;
  /** URL thumbnail tersimpan/terunggah — "" untuk campaign baru belum dipilih. */
  thumbnailUrl: string;
  /** Blob URL pratinjau sesaat saat unggah berlangsung (transien, tak pernah disimpan). */
  thumbnailPreviewUrl?: string;
  isUploadingThumbnail?: boolean;
  onSelectThumbnail: (file: File) => void;
  category: string;
  onChangeCategory: (val: string) => void;
  type: string;
  onChangeType: (val: string) => void;
  description: string;
  onChangeDescription: (val: string) => void;
  location: string;
  onChangeLocation: (val: string) => void;
  validationErrors?: Record<string, string>;
}

export function ProductInfoStep({
  title,
  onChangeTitle,
  thumbnailUrl,
  thumbnailPreviewUrl,
  isUploadingThumbnail = false,
  onSelectThumbnail,
  category,
  onChangeCategory,
  type,
  onChangeType,
  description,
  onChangeDescription,
  location,
  onChangeLocation,
  validationErrors = {},
}: ProductInfoStepProps) {
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const displayThumbnailUrl = thumbnailPreviewUrl || thumbnailUrl;

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset supaya file yang sama bisa dipilih ulang setelah error.
    e.target.value = "";
    if (file) onSelectThumbnail(file);
  };

  return (
    <FormSectionCard
      title="Informasi Produk"
      description="Lengkapi identitas produk dan jenis produk atau bisnis Anda agar kreator memahami produk Anda."
    >
      {/* Campaign title */}
      <Input
        id="campaign-title"
        label="Nama Produk atau Judul Kampanye"
        placeholder="Contoh: Review Keripik Tempe Renyah Sunda"
        value={title}
        onChange={(e) => onChangeTitle(e.target.value)}
        error={validationErrors.title}
        helperText={
          !validationErrors.title
            ? "Masukkan nama produk yang dipasarkan secara singkat & spesifik."
            : undefined
        }
      />

      {/* Product thumbnail — gambar produk campaign (bucket campaign-assets) */}
      <div id="field-thumbnailUrl" className="space-y-2.5">
        <label className="text-[.84rem] font-[700] text-ink-800">
          Gambar Produk Campaign <span className="text-primary ml-0.5">*</span>
        </label>
        <div className="flex items-start gap-3.5">
          <div className="relative w-24 aspect-video shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden flex items-center justify-center">
            {displayThumbnailUrl ? (
              /* <img> biasa: blob: URL sementara tidak boleh lewat next/image */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayThumbnailUrl}
                alt="Pratinjau gambar produk campaign"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <ImageIcon size={26} className="text-ink-300" />
            )}
            {isUploadingThumbnail && (
              <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center">
                <span className="text-[.62rem] font-extrabold text-white uppercase tracking-wider">
                  Mengunggah…
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbnailChange}
            />
            <button
              type="button"
              onClick={() => thumbnailInputRef.current?.click()}
              disabled={isUploadingThumbnail}
              className="px-4 py-2 bg-white hover:bg-neutral-50 text-ink-700 hover:text-ink-800 border border-neutral-200 text-xs font-bold rounded-xl shadow-3xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              <Upload size={13} />
              {isUploadingThumbnail
                ? "Mengunggah…"
                : displayThumbnailUrl
                  ? "Ganti Gambar"
                  : "Upload Gambar"}
            </button>
            <p className="text-[.74rem] leading-relaxed text-ink-400 font-[550]">
              Upload foto produk yang akan dipromosikan dalam campaign ini. Gambar
              ini akan ditampilkan kepada creator sebagai representasi utama
              campaign.
            </p>
          </div>
        </div>
        {validationErrors.thumbnailUrl && (
          <p className="text-[.76rem] text-red-500 font-[600] flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
            {validationErrors.thumbnailUrl}
          </p>
        )}
      </div>

      {/* Niche category grid */}
      <div id="field-category" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[.84rem] font-[700] text-ink-800">
            Kategori Kreator <span className="text-primary ml-0.5">*</span>
          </label>
          {category && (
            <span className="text-[.72rem] font-[700] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
              Terpilih ✓
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {NICHE_OPTIONS.map((cat) => (
            <SelectableOptionCard
              key={cat.id}
              selected={category === cat.id}
              onClick={() => onChangeCategory(cat.id)}
              title={cat.label}
              description={cat.desc}
              icon={NICHE_ICONS[cat.id]}
            />
          ))}
        </div>
        {validationErrors.category && (
          <p className="text-[.76rem] text-red-500 font-[600] flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
            {validationErrors.category}
          </p>
        )}
      </div>

      {/* Campaign type (UGC vs Clipping) */}
      <div id="field-type" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[.84rem] font-[700] text-ink-800">
            Jenis Kampanye <span className="text-primary ml-0.5">*</span>
          </label>
          {type && (
            <span className="text-[.72rem] font-[700] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
              Terpilih ✓
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {CAMPAIGN_TYPE_OPTIONS.map((opt) => (
            <SelectableOptionCard
              key={opt.id}
              selected={type === opt.id}
              onClick={() => onChangeType(opt.id)}
              title={opt.label}
              description={opt.desc}
            />
          ))}
        </div>
        {validationErrors.type && (
          <p className="text-[.76rem] text-red-500 font-[600] flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
            {validationErrors.type}
          </p>
        )}
      </div>

      {/* Location (optional) */}
      <Input
        id="target-location"
        label="Lokasi Target Kreator (Opsional)"
        placeholder="Contoh: Jabodetabek, Jawa Barat, atau Nasional"
        value={location}
        onChange={(e) => onChangeLocation(e.target.value)}
        helperText="Tentukan domisili kreator jika bisnis Anda hanya mencakup daerah tertentu."
      />

      {/* Product description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="campaign-description" className="text-[.84rem] font-[700] text-ink-800">
            Deskripsi Singkat Produk <span className="text-primary ml-0.5">*</span>
          </label>
          <span
            className={`text-[.72rem] font-[700] tabular-nums ${
              description.length >= 30 ? "text-emerald-600" : "text-ink-400"
            }`}
          >
            {description.length}/30 karakter min.
          </span>
        </div>
        <Textarea
          id="campaign-description"
          rows={4}
          placeholder="Tuliskan tentang kelebihan produk Anda, bahan, rasa, kegunaan, atau penawaran spesial yang membuat produk ini menarik..."
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          error={validationErrors.description}
          helperText={
            !validationErrors.description
              ? "Gambarkan keunggulan produk Anda dalam minimal 30 karakter untuk mempermudah kreator."
              : undefined
          }
        />
      </div>
    </FormSectionCard>
  );
}
