"use client";

import { UtensilsCrossed, Shirt, MapPin, BookOpen, Sparkles, LayoutGrid } from "lucide-react";
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
