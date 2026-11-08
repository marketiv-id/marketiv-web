/**
 * Appwrite Storage Service Wrapper
 *
 * Exposes Storage SDK for browser-safe file operations.
 * Allowed: profile pictures, business logos, campaign image references.
 * FORBIDDEN: raw video uploads — use external URL (Google Drive/Dropbox) instead.
 * FORBIDDEN: creator video proof — use TikTok/Instagram URL in campaign_submissions.
 *
 * Upload helper Sprint 3: bucket avatars/logos/portfolios/campaign-assets bersifat
 * client-writable langsung (create("users"), fileSecurity:false), jadi tidak lewat
 * Function validate-and-upload. Aturan ukuran/ekstensi divalidasi di klien karena
 * beda per bucket (5MB avatars/logos, 50MB portfolios, 50MB campaign-assets) dan
 * pesan error SDK tidak informatif. campaign-assets turun dari 100MB ke 50MB
 * mengikuti batas file plan Free Supabase (migrasi Fase 3, 0012_storage.sql).
 */
import { Storage, ID, Permission, Role } from "appwrite";
import { client } from "./client";
import { appwriteConfig } from "./config";

export const storage = new Storage(client);

/** Bucket yang boleh ditulis langsung dari browser — mirror appwrite.config.json. */
export type PublicBucket = "avatars" | "creatorBanners" | "logos" | "portfolios" | "campaignAssets";

/** `extensions: []` berarti semua ekstensi diperbolehkan (campaign-assets). */
export const BUCKET_RULES: Record<
  PublicBucket,
  { maxBytes: number; extensions: string[] }
> = {
  avatars: { maxBytes: 5_000_000, extensions: ["jpg", "jpeg", "png", "webp"] },
  creatorBanners: { maxBytes: 5_000_000, extensions: ["jpg", "jpeg", "png", "webp"] },
  logos: { maxBytes: 5_000_000, extensions: ["jpg", "jpeg", "png", "webp"] },
  portfolios: { maxBytes: 50_000_000, extensions: ["jpg", "jpeg", "png", "webp", "pdf", "mp4"] },
  campaignAssets: { maxBytes: 50_000_000, extensions: [] },
};

export type UploadedFile = {
  fileId: string;
  bucketId: string;
  url: string;
  name: string;
  sizeBytes: number;
};

/** Pelanggaran aturan bucket, dilempar SEBELUM request SDK. Pesan Indonesia. */
export class FileRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileRuleError";
  }
}

const fileExtension = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
};

const formatMb = (bytes: number): string =>
  `${(bytes / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} MB`;

/** Validasi ukuran & ekstensi terhadap aturan bucket. @throws FileRuleError */
export function assertFileAllowed(target: PublicBucket, file: File): void {
  const rules = BUCKET_RULES[target];
  if (file.size > rules.maxBytes) {
    throw new FileRuleError(`Ukuran file melebihi batas ${formatMb(rules.maxBytes)}.`);
  }
  if (rules.extensions.length > 0) {
    const ext = fileExtension(file.name);
    if (!rules.extensions.includes(ext)) {
      throw new FileRuleError(
        `Format file tidak didukung. Gunakan: ${rules.extensions.join(", ")}.`
      );
    }
  }
}

/** URL tampilan publik deterministik untuk file di bucket read(any). */
export function publicFileUrl(bucketId: string, fileId: string): string {
  const { endpoint, projectId } = appwriteConfig;
  return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
}

/**
 * Unggah file ke bucket publik dan kembalikan URL tampilannya.
 * Permission baris: read(any) supaya URL bisa dipakai di UI, update/delete owner.
 * @throws FileRuleError bila melanggar aturan bucket; error SDK bila upload gagal.
 */
export async function uploadPublicFile(
  target: PublicBucket,
  file: File,
  ownerUserId: string
): Promise<UploadedFile> {
  assertFileAllowed(target, file);
  const bucketId = appwriteConfig.buckets[target];
  const created = await storage.createFile({
    bucketId,
    fileId: ID.unique(),
    file,
    permissions: [
      Permission.read(Role.any()),
      Permission.update(Role.user(ownerUserId)),
      Permission.delete(Role.user(ownerUserId)),
    ],
  });
  return {
    fileId: created.$id,
    bucketId,
    url: publicFileUrl(bucketId, created.$id),
    name: file.name,
    sizeBytes: file.size,
  };
}

export async function deletePublicFile(bucketId: string, fileId: string): Promise<void> {
  await storage.deleteFile({ bucketId, fileId });
}
