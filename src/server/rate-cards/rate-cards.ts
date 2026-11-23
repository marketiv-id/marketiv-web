import "server-only";

import { HttpError, throwIfDbError } from "@/server/http";
import type { CreatorRateCardPackage } from "@/types/creator-dashboard";
import type { RateCardStatus } from "@/types/domain";

import {
  normalizeStatus,
  packageColumns,
  statusOf,
  toRateCardPackageDto,
  type CreatorWriteContext,
  type RateCardWriteBody,
  type Row,
} from "./shared";

/**
 * Tulis rate card kreator (Fase 6) — pengganti CRUD langsung dari browser di
 * `creator-appwrite.service.ts`. Model 1 `rate_cards` per paket UI (1:1);
 * status di parent, judul parent = nama paket.
 *
 * Pesan error sama dengan service lama. "Tidak ditemukan / bukan milik"
 * tetap 403 "Paket tidak ditemukan atau bukan milik Anda." seperti dulu.
 */

export const NOT_OWNED = "Paket tidak ditemukan atau bukan milik Anda.";

type RpcPair = { rate_card: Row; package: Row } | null;

/** POST /api/rate-cards — parent + paket dalam satu transaksi (maks 3 per kreator). */
export async function createRateCard(
  { db, userId }: CreatorWriteContext,
  body: RateCardWriteBody,
): Promise<CreatorRateCardPackage> {
  const cols = packageColumns(body);
  const { data, error } = await db.rpc("creator_create_rate_card", {
    p_creator_id: userId,
    p_name: cols.name,
    p_description: cols.description,
    p_output: cols.output,
    p_delivery_days: cols.delivery_days,
    p_price: cols.price,
    p_revision_limit: cols.revision_limit,
    p_status: statusOf(body.published),
  });
  throwIfDbError(error);
  const pair = data as RpcPair;
  if (!pair) throw new HttpError(500, "Terjadi kesalahan di server. Coba lagi.", "server");
  return toRateCardPackageDto(pair.package, normalizeStatus(pair.rate_card.status));
}

/** PATCH /api/rate-cards/[rateCardId]/packages/[packageId] — update in-place + mirror judul/status. */
export async function updateRateCardPackage(
  { db, userId }: CreatorWriteContext,
  ids: { rateCardId: string; packageId: string },
  body: RateCardWriteBody,
): Promise<CreatorRateCardPackage> {
  const cols = packageColumns(body);
  const { data, error } = await db.rpc("creator_update_rate_card_package", {
    p_creator_id: userId,
    p_rate_card_id: ids.rateCardId,
    p_package_id: ids.packageId,
    p_name: cols.name,
    p_description: cols.description,
    p_output: cols.output,
    p_delivery_days: cols.delivery_days,
    p_price: cols.price,
    p_revision_limit: cols.revision_limit,
    p_status: statusOf(body.published),
  });
  throwIfDbError(error);
  const pair = data as RpcPair;
  if (!pair) throw new HttpError(403, NOT_OWNED);
  return toRateCardPackageDto(pair.package, normalizeStatus(pair.rate_card.status));
}

/** Baca parent milik kreator; 403 bila bukan miliknya / tidak ada. */
async function requireOwnedRateCard({ db, userId }: CreatorWriteContext, rateCardId: string): Promise<Row> {
  const { data, error } = await db
    .from("rate_cards")
    .select("id, creator_id, status")
    .eq("id", rateCardId)
    .eq("creator_id", userId)
    .maybeSingle();
  throwIfDbError(error);
  if (!data) throw new HttpError(403, NOT_OWNED);
  return data as Row;
}

/**
 * PATCH /api/rate-cards/[rateCardId] — `{ status, packageId }`.
 * Mengubah status parent lalu mengembalikan DTO paket `packageId`
 * (bentuk sama dengan `setCreatorRateCardPackageStatusInAppwrite` lama).
 */
export async function setRateCardStatus(
  ctx: CreatorWriteContext,
  rateCardId: string,
  body: { status: RateCardStatus; packageId: string },
): Promise<CreatorRateCardPackage> {
  await requireOwnedRateCard(ctx, rateCardId);

  const { data: pkg, error: pkgError } = await ctx.db
    .from("rate_card_packages")
    .select("*")
    .eq("id", body.packageId)
    .eq("rate_card_id", rateCardId)
    .maybeSingle();
  throwIfDbError(pkgError);
  if (!pkg) throw new HttpError(403, NOT_OWNED);

  const { error } = await ctx.db
    .from("rate_cards")
    .update({ status: body.status })
    .eq("id", rateCardId)
    .eq("creator_id", ctx.userId);
  throwIfDbError(error);

  return toRateCardPackageDto(pkg as Row, body.status);
}

/**
 * DELETE /api/rate-cards/[rateCardId] (seluruh rate card) atau
 * DELETE /api/rate-cards/[rateCardId]/packages/[packageId] (satu paket; parent
 * ikut terhapus bila tidak tersisa paket). Ditolak 409 bila ada order berjalan.
 */
export async function deleteRateCard(
  { db, userId }: CreatorWriteContext,
  ids: { rateCardId: string; packageId?: string },
): Promise<{ deleted: true }> {
  const { data, error } = await db.rpc("creator_delete_rate_card", {
    p_creator_id: userId,
    p_rate_card_id: ids.rateCardId,
    p_package_id: ids.packageId ?? null,
  });
  throwIfDbError(error);
  if (data !== true) throw new HttpError(403, NOT_OWNED);
  return { deleted: true };
}

/**
 * POST /api/rate-cards/[rateCardId]/packages — tambah paket ke rate card
 * milik sendiri. UI saat ini memakai model 1:1 (paket dibuat bersama parent
 * lewat POST /api/rate-cards); route ini disediakan sesuai rencana Fase 6.
 */
export async function createRateCardPackage(
  ctx: CreatorWriteContext,
  rateCardId: string,
  body: RateCardWriteBody,
): Promise<CreatorRateCardPackage> {
  const card = await requireOwnedRateCard(ctx, rateCardId);
  const { data, error } = await ctx.db
    .from("rate_card_packages")
    .insert({ rate_card_id: rateCardId, ...packageColumns(body) })
    .select("*")
    .single();
  throwIfDbError(error);
  return toRateCardPackageDto(data as Row, normalizeStatus(card.status));
}
