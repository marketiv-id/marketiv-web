/**
 * Rehydrasi data mentah Appwrite → wizard state untuk halaman edit draft.
 *
 * DILETAKKAN DI SINI (komponen) karena TONE_OPTIONS/CTA_OPTIONS ada di
 * `create-campaign.constants.ts` dan service layer tidak boleh mengimpor dari
 * `components/`. Service mengembalikan data mentah; file ini yang mengkonversi.
 */
import type { CampaignEditRaw } from "@/services/umkm/umkm-dashboard.service";
import type { CampaignWizardState } from "./types";
import { TONE_OPTIONS, CTA_OPTIONS } from "./create-campaign.constants";
import { decomposeBriefDetail } from "@/lib/validations/campaign.schema";

export type RehydratedWizard = {
  /** Field wizard yang sudah dipulihkan — dipakai untuk seeding useState. */
  state: Partial<CampaignWizardState>;
  /** Info tambahan di luar state wizard — dipakai W15 untuk asset upsert. */
  meta: {
    /** $id baris `campaign_assets` pertama; ada → update, tidak ada → create. */
    assetId?: string;
  };
  /**
   * Peringatan yang ditampilkan inline HANYA saat ada data yang benar-benar
   * tidak bisa dipulihkan. Jangan menampilkan banner "mungkin ada data hilang"
   * saat semua field berhasil dipulihkan.
   */
  warnings: string[];
};

/**
 * Konversi `CampaignEditRaw` → `RehydratedWizard`.
 *
 * Yang TIDAK dipulihkan (dan mengapa):
 * - `termsAgreed` — sengaja di-reset; user harus menyetujui ulang setiap simpan.
 * - `videoStyle` / `callToAction` bila label-nya tak cocok lagi dengan konstanta
 *   saat ini → jatuh ke string kosong; validasi step 2 memaksa pilih ulang.
 * - `doAndDont` / `requiredPoints` dikembalikan apa adanya dari DB (tidak
 *   dicompose ulang) supaya tidak ada data yang hilang saat round-trip.
 */
export function rehydrateWizard(raw: CampaignEditRaw): RehydratedWizard {
  const warnings: string[] = [...(raw.warnings ?? [])];
  const meta: RehydratedWizard["meta"] = {};

  const { campaign, brief, asset } = raw;

  // ── Step 1 fields ─────────────────────────────────────────────────────────
  const state: Partial<CampaignWizardState> = {
    title: campaign.title,
    thumbnailUrl: campaign.thumbnailUrl, // "" untuk campaign legacy tanpa gambar
    category: campaign.niche,       // campaigns.category → niche
    type: campaign.type ?? "",       // campaigns.type → "ugc" / "clipping"
    description: campaign.brief,    // campaigns.description (mapped as brief)
    pricePerThousandViews: campaign.pricePerThousandViews,
    totalBudgetEscrow: campaign.totalBudgetEscrow,
    creatorQuota: campaign.creatorQuota,
    termsAgreed: false,              // sengaja reset — user wajib setuju ulang
  };

  // ── Step 3 (asset) ────────────────────────────────────────────────────────
  if (asset) {
    state.externalAssetUrl = asset.fileUrl;
    meta.assetId = asset.id;
  }

  // ── Step 2 (brief) ────────────────────────────────────────────────────────
  if (brief) {
    // Pisah briefDetail → komponen sub-field
    const decomposed = decomposeBriefDetail(brief.briefDetail);
    if (decomposed.lossy) {
      // Data ada tapi format tidak dikenal — pakai briefDetail penuh sebagai `brief`
      warnings.push(
        "Beberapa data brief tidak dapat dipulihkan secara otomatis. Periksa langkah 2 sebelum menyimpan."
      );
    }

    state.brief = decomposed.brief;
    state.requiredPoints = decomposed.requiredPoints;
    state.hashtags = decomposed.hashtags;
    state.location = decomposed.location;
    state.assetNotes = decomposed.assetNotes;
    state.selectedDirections = decomposed.selectedDirections;

    // Reverse-match TONE_OPTIONS lewat `contentAngle`
    const matchedTone = TONE_OPTIONS.find((o) => {
      const angle = brief.contentAngle.trim().toLowerCase();
      const id = o.id.toLowerCase();
      const label = o.label.toLowerCase();
      return (
        angle === id ||
        angle === label ||
        angle.startsWith(`${label} — `) ||
        angle.startsWith(label)
      );
    });
    state.videoStyle = matchedTone ? matchedTone.id : "";
    if (!matchedTone && brief.contentAngle.trim()) {
      warnings.push(
        "Gaya/tone video tidak bisa dipulihkan secara otomatis. Pilih ulang pada langkah 2."
      );
    }

    // Reverse-match CTA_OPTIONS lewat `cta`
    const matchedCta = CTA_OPTIONS.find((o) => {
      const ctaVal = brief.cta.trim().toLowerCase();
      const id = o.id.toLowerCase();
      const label = o.label.toLowerCase();
      return (
        ctaVal === id ||
        ctaVal === label ||
        ctaVal.startsWith(label)
      );
    });
    state.callToAction = matchedCta ? matchedCta.id : "";
    if (!matchedCta && brief.cta.trim()) {
      warnings.push(
        "Call to Action tidak bisa dipulihkan secara otomatis. Pilih ulang pada langkah 2."
      );
    }
  }

  return { state, meta, warnings };
}
