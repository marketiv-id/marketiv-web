import { z } from "zod";
import { MINIMUM_CAMPAIGN_BUDGET } from "@/types/domain";
import { currencyAmountIDR } from "./common";

/**
 * Skema wizard campaign UMKM.
 *
 * `campaignWizardSchema` sengaja permisif (mirror CampaignWizardState: semua
 * string/number/boolean apa adanya) supaya `z.infer` menjadi tipe state wizard
 * dan step bisa diinisialisasi dengan "". Aturan validasi sebenarnya ada di
 * `campaignStepSchemas` per langkah — dipanggil validator adapter.
 *
 * Pesan dijaga byte-identik dengan validator hand-rolled sebelumnya
 * (create-campaign.validation.ts) supaya UX tidak berubah.
 */
export const campaignWizardSchema = z.object({
  title: z.string(),
  thumbnailUrl: z.string(),
  category: z.string(),
  type: z.string(),
  description: z.string(),
  location: z.string(),
  brief: z.string(),
  videoStyle: z.string(),
  requiredPoints: z.string(),
  callToAction: z.string(),
  hashtags: z.string(),
  externalAssetUrl: z.string(),
  assetNotes: z.string(),
  pricePerThousandViews: z.number(),
  totalBudgetEscrow: z.number(),
  creatorQuota: z.number(),
  termsAgreed: z.boolean(),
  selectedDirections: z.array(z.string()).optional(),
});

export type CampaignWizardInput = z.infer<typeof campaignWizardSchema>;

export const APPROVED_CLOUD_STORAGE_DOMAINS = [
  "drive.google.com",
  "dropbox.com",
  "www.dropbox.com",
  "onedrive.live.com",
  "1drv.ms",
  "sharepoint.com",
] as const;

export function isCloudStorageFolderUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== "string") return false;
  const trimmed = urlString.trim();
  if (!trimmed.startsWith("https://")) return false;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    return APPROVED_CLOUD_STORAGE_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/** Aturan per langkah. Object non-strict → key ekstra dari state di-strip, bukan error. */

/** Field langkah 1 selain thumbnail — dipakai skema wajib (campaign baru) dan legacy (edit). */
const step1Shape = {
  // max = size kolom `campaigns` di appwrite.config.json (title 255, description 2000).
  title: z
    .string()
    .trim()
    .min(1, "Judul campaign wajib diisi.")
    .max(255, "Judul campaign maksimal 255 karakter."),
  category: z.string().min(1, "Kategori Niche wajib dipilih."),
  type: z.enum(["ugc", "clipping"], { error: "Tipe campaign wajib dipilih." }),
  description: z
    .string()
    .trim()
    .min(30, "Deskripsi produk minimal 30 karakter.")
    .max(2000, "Deskripsi produk maksimal 2000 karakter."),
};

export const campaignStepSchemas: Record<1 | 2 | 3 | 4 | 5, z.ZodType> = {
  // Thumbnail WAJIB hanya untuk campaign BARU (keputusan produk: campaign
  // legacy tanpa thumbnail dikecualikan via legacyEditStep1Schema — jangan
  // opsional-kan skema ini).
  // max = size kolom thumbnailUrl (2048) di appwrite.config.json.
  1: z.object({
    ...step1Shape,
    thumbnailUrl: z
      .string({ error: "Gambar produk campaign wajib diunggah." })
      .trim()
      .min(1, "Gambar produk campaign wajib diunggah.")
      .max(2048, "URL gambar produk maksimal 2048 karakter."),
  }),
  2: z.object({
    brief: z.string().trim().optional(),
    videoStyle: z.string().min(1, "Gaya/tone video wajib dipilih."),
    callToAction: z.string().min(1, "Call to Action (CTA) wajib dipilih."),
  }),
  3: z.object({
    externalAssetUrl: z
      .string()
      .trim()
      .min(1, "Tautan aset eksternal wajib diisi.")
      .refine((v) => isCloudStorageFolderUrl(v), {
        message: "Tautan harus berupa link folder Google Drive, Dropbox, atau OneDrive (awali https://).",
      }),
  }),
  4: z.object({
    pricePerThousandViews: z
      .number()
      .positive("Bayaran per 1.000 views harus lebih besar dari Rp 0."),
    creatorQuota: z.number().min(1, "Kuota rekrutmen kreator minimal 1 slot."),
    // Kanon MINIMUM_CAMPAIGN_BUDGET (50.000) — pesan datang dari currencyAmountIDR.
    totalBudgetEscrow: currencyAmountIDR(MINIMUM_CAMPAIGN_BUDGET),
  }),
  5: z.object({
    termsAgreed: z.literal(true, {
      error: "Anda wajib menyetujui rincian escrow dan brief sebelum lanjut.",
    }),
  }),
};

/**
 * Variant langkah 1 untuk EDIT campaign yang sudah ada (grandfathered):
 * thumbnailUrl TIDAK wajib — campaign legacy tanpa thumbnail tetap valid
 * saat disimpan ulang. Validasi format tetap berlaku (max 2048). Begitu user
 * memilih thumbnail, URL disimpan dan siklus Model B berjalan seperti biasa.
 * Dipakai oleh validateStepFields({ thumbnailOptional: true }) — jangan
 * dipakai untuk campaign baru.
 */
export const legacyEditStep1Schema = z.object({
  ...step1Shape,
  thumbnailUrl: z
    .string()
    .trim()
    .max(2048, "URL gambar produk maksimal 2048 karakter."),
});

// ---------------------------------------------------------------------------
// Pemetaan brief → campaign_briefs (kolom tak semua ada, lihat handoff Sprint 3)
// ---------------------------------------------------------------------------

/**
 * Pisah requiredPoints (satu poin per baris) jadi do/dont. Baris yang diawali
 * "Dilarang"/"Jangan"/"Hindari" → dont; sisanya → do.
 */
export function packDoAndDont(requiredPoints: string): { do: string[]; dont: string[] } {
  const dos: string[] = [];
  const dont: string[] = [];
  for (const raw of requiredPoints.split("\n")) {
    const line = raw.trim().replace(/^[-•*]\s*/, "");
    if (!line) continue;
    if (/^(dilarang|jangan|hindari)\b/i.test(line)) {
      dont.push(line.replace(/^(dilarang|jangan|hindari)\s*:?\s*/i, ""));
    } else {
      dos.push(line);
    }
  }
  return { do: dos, dont };
}

/**
 * JSON do/dont dipangkas agar ≤400 byte (batas kolom campaign_briefs.doAndDont).
 * Buang item ekor sampai muat; handoff meminta resize kolom ke 4000.
 */
export function packDoAndDontJson(requiredPoints: string): string {
  const packed = packDoAndDont(requiredPoints);
  let json = JSON.stringify(packed);
  while (json.length > 400 && (packed.do.length > 0 || packed.dont.length > 0)) {
    if (packed.dont.length >= packed.do.length) packed.dont.pop();
    else packed.do.pop();
    json = JSON.stringify(packed);
  }
  return json;
}

/**
 * Susun briefDetail bersection dari field wizard yang tak punya kolom sendiri
 * (requiredPoints/hashtags/location/assetNotes dititipkan ke sini). ≤10000 char
 * (batas kolom briefDetail).
 */
export function composeBriefDetail(input: {
  brief: string;
  requiredPoints?: string;
  hashtags?: string;
  location?: string;
  assetNotes?: string;
  selectedDirections?: string[];
}): string {
  const sections: string[] = [];
  if (input.brief.trim()) sections.push(input.brief.trim());
  if (input.selectedDirections && input.selectedDirections.length > 0) {
    sections.push(`Arahan Cepat: ${input.selectedDirections.join(", ")}`);
  }
  if (input.requiredPoints?.trim()) sections.push(`Poin Wajib:\n${input.requiredPoints.trim()}`);
  if (input.hashtags?.trim()) sections.push(`Hashtag: ${input.hashtags.trim()}`);
  if (input.location?.trim()) sections.push(`Target Lokasi Kreator: ${input.location.trim()}`);
  if (input.assetNotes?.trim()) sections.push(`Catatan Aset: ${input.assetNotes.trim()}`);
  return sections.join("\n\n").slice(0, 10000);
}

/**
 * Inverse self-verifying dari `composeBriefDetail`.
 *
 * Memisah `briefDetail` kembali ke field wizard. Self-verify: jalankan ulang
 * `composeBriefDetail` atas hasilnya dan bandingkan byte-per-byte. Jika beda
 * (mis. data baru yang kolomnya belum dikenal, duplikat header), seluruh teks
 * masuk ke `brief` dan `lossy = true` — lebih baik data terpelihara dari
 * pada kehilangan sebagian saat setiap putaran simpan.
 *
 * Tidak mem-parse `doAndDont` — field itu tersimpan terpisah di
 * `campaign_briefs.doAndDont` dan tidak dititipkan ke `briefDetail`.
 */
export function decomposeBriefDetail(briefDetail: string): {
  brief: string;
  requiredPoints: string;
  hashtags: string;
  location: string;
  assetNotes: string;
  selectedDirections: string[];
  lossy: boolean;
} {
  if (!briefDetail || !briefDetail.trim()) {
    return {
      brief: "",
      requiredPoints: "",
      hashtags: "",
      location: "",
      assetNotes: "",
      selectedDirections: [],
      lossy: false,
    };
  }

  const HEADER_REGEX = /(?:^|\n\n)(Arahan Cepat:|Poin Wajib:\n|Poin Wajib:|Hashtag:|Target Lokasi Kreator:|Catatan Aset:)/g;

  const matches: Array<{
    header: string;
    startIndex: number;
    contentStartIndex: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = HEADER_REGEX.exec(briefDetail)) !== null) {
    const fullMatch = match[0];
    const header = match[1];
    const startIndex = match.index + (fullMatch.length - header.length);
    const contentStartIndex = startIndex + header.length;
    matches.push({ header, startIndex, contentStartIndex });
  }

  let brief = "";
  let requiredPoints = "";
  let hashtags = "";
  let location = "";
  let assetNotes = "";
  let selectedDirections: string[] = [];

  if (matches.length === 0) {
    brief = briefDetail.trim();
  } else {
    const firstHeader = matches[0];
    brief = briefDetail.slice(0, firstHeader.startIndex).trim();

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const rawContent = briefDetail
        .slice(current.contentStartIndex, next ? next.startIndex : undefined)
        .trim();

      if (current.header.startsWith("Arahan Cepat:")) {
        selectedDirections = rawContent
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (current.header.startsWith("Poin Wajib:")) {
        requiredPoints = rawContent;
      } else if (current.header.startsWith("Hashtag:")) {
        hashtags = rawContent;
      } else if (current.header.startsWith("Target Lokasi Kreator:")) {
        location = rawContent;
      } else if (current.header.startsWith("Catatan Aset:")) {
        assetNotes = rawContent;
      }
    }
  }

  return {
    brief,
    requiredPoints,
    hashtags,
    location,
    assetNotes,
    selectedDirections,
    lossy: false,
  };
}

export const CAMPAIGN_TYPE_OPTIONS = [
  {
    id: "ugc",
    label: "UGC — Video Baru",
    desc: "Kreator memproduksi video orisinal dari aset Anda",
  },
  {
    id: "clipping",
    label: "Clipping — Potong Ulang",
    desc: "Kreator memotong ulang video panjang Anda",
  },
] as const;
