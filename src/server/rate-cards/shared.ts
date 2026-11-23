import "server-only";

import { z } from "zod";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { rateCardPackageSchema } from "@/lib/validations/rate-card.schema";
import type { DbErrorLike } from "@/server/http";
import type { CreatorRateCardPackage } from "@/types/creator-dashboard";
import type { RateCardStatus } from "@/types/domain";

/**
 * Bagian client service role yang dipakai modul tulis kreator (Fase 6).
 * `rpc` diketik longgar: RPC 0020 belum ada di `src/types/supabase.ts`
 * sampai tipe diregenerasi setelah semua migration Fase 6 digabung.
 * Panggil selalu sebagai method (`db.rpc(...)`) — supabase-js butuh `this`.
 */
export interface WriteDb {
  from: AdminSupabaseClient["from"];
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: DbErrorLike | null }>;
}

export function asWriteDb(client: AdminSupabaseClient): WriteDb {
  return client as unknown as WriteDb;
}

export interface CreatorWriteContext {
  db: WriteDb;
  /** userId sesi kreator yang sudah diverifikasi `requireUser({ role: "creator" })`. */
  userId: string;
}

export type Row = Record<string, unknown>;

const str = (value: unknown): string => (typeof value === "string" ? value : "");
const num = (value: unknown): number => (typeof value === "number" ? value : Number(value) || 0);

export const RATE_CARD_STATUSES = ["draft", "published"] as const;

/** Body tulis paket = skema form (`rateCardPackageSchema`) + flag `published` → rate_cards.status. */
export const rateCardWriteSchema = rateCardPackageSchema.extend({
  published: z.boolean({ error: "Status publikasi wajib diisi." }),
});
export type RateCardWriteBody = z.infer<typeof rateCardWriteSchema>;

/** Nilai teks disimpan ter-trim, sama dengan service Appwrite lama. */
export function packageColumns(body: RateCardWriteBody) {
  return {
    name: body.name.trim(),
    description: body.description.trim(),
    output: body.output.trim(),
    delivery_days: body.deliveryDays,
    price: body.price,
    revision_limit: body.revisionLimit,
  };
}

export const statusOf = (published: boolean): RateCardStatus => (published ? "published" : "draft");

/** Row `rate_card_packages` + status parent → DTO `CreatorRateCardPackage` (sama dengan `mapRcPackage` lama). */
export function toRateCardPackageDto(pkg: Row, status: RateCardStatus): CreatorRateCardPackage {
  return {
    id: str(pkg.id),
    rateCardId: str(pkg.rate_card_id),
    name: str(pkg.name),
    description: str(pkg.description),
    price: num(pkg.price),
    deliverable: str(pkg.output),
    estimatedDays: num(pkg.delivery_days),
    status,
    revisionCount: num(pkg.revision_limit),
  };
}

export function normalizeStatus(value: unknown): RateCardStatus {
  return value === "published" ? "published" : "draft";
}
