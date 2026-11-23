import "server-only";

import { z } from "zod";

import { creatorProfileUpdateSchema, umkmProfileUpdateSchema } from "@/lib/validations/profile.schema";
import { callWriteRpc, type WriteDb } from "@/server/conversations/write-rpc";
import { HttpError, parseBody } from "@/server/http";

/**
 * PATCH /api/profile — pengganti Function `update-profile`.
 *
 * Body = patch parsial (key camelCase sama dengan Function lama). Field di luar
 * whitelist per role dibuang (`isProfileCompleted` selalu diabaikan); field
 * yang dikirim divalidasi dengan aturan form yang sama
 * (`umkmProfileUpdateSchema` / `creatorProfileUpdateSchema`, versi parsial).
 *
 * Penulisan + evaluasi kelengkapan (never downgrade) dilakukan RPC
 * `update_profile` dalam satu transaksi dengan baris terkunci.
 */

/** URL gambar dari Storage. "" = hapus gambar. Skema hanya http(s). */
const imageUrl = (fieldName: string) =>
  z
    .string()
    .trim()
    .max(2048, `${fieldName} maksimal 2048 karakter.`)
    .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), `${fieldName} tidak valid.`);

export const umkmProfilePatchSchema = umkmProfileUpdateSchema
  .partial()
  .extend({ logoUrl: imageUrl("Logo").optional() });

export const creatorProfilePatchSchema = creatorProfileUpdateSchema
  .partial()
  .extend({
    avatarUrl: imageUrl("Foto profil").optional(),
    bannerUrl: imageUrl("Banner").optional(),
  });

export type ProfileUpdateResult = Record<string, unknown> & {
  success: true;
  role: "umkm" | "creator";
  isProfileCompleted: boolean;
};

export async function updateProfile(
  ctx: { db: WriteDb; userId: string; role: string },
  body: unknown,
): Promise<ProfileUpdateResult> {
  let patch: Record<string, unknown>;
  if (ctx.role === "umkm") {
    patch = parseBody(umkmProfilePatchSchema, body, "Data profil tidak valid.");
  } else if (ctx.role === "creator") {
    patch = parseBody(creatorProfilePatchSchema, body, "Data profil tidak valid.");
  } else {
    throw new HttpError(400, "Role tidak didukung untuk update profil.");
  }

  // Zod membuang key yang tidak dikenal; buang juga undefined supaya RPC hanya
  // melihat key yang benar-benar dikirim (`p_patch ? 'key'`).
  const cleaned = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));

  return callWriteRpc<ProfileUpdateResult>(ctx.db, "update_profile", {
    p_user_id: ctx.userId,
    p_patch: cleaned,
  });
}
