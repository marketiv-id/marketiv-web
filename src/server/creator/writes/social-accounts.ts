import "server-only";

import { z } from "zod";

import { requiredStringMax } from "@/lib/validations/common";
import { HttpError, throwIfDbError } from "@/server/http";
import type { CreatorWriteContext, Row } from "@/server/rate-cards/shared";

/**
 * Akun sosial kreator (Fase 6). Dulu: list lalu create/update dari browser
 * (tanpa unique index → bisa duplikat). Sekarang satu UPSERT pada constraint
 * unik `(creator_id, platform)` (0002).
 *
 * `followers` opsional: bila tidak dikirim, nilai lama dibiarkan (baris baru
 * memakai default 0) — sama dengan perilaku lama.
 */

export const socialAccountWriteSchema = z.object({
  platform: z.enum(["tiktok", "instagram", "youtube"], { error: "Platform tidak didukung." }),
  username: requiredStringMax("Username", 255),
  followers: z
    .number({ error: "Jumlah followers harus angka bulat 0 atau lebih." })
    .int("Jumlah followers harus angka bulat 0 atau lebih.")
    .min(0, "Jumlah followers harus angka bulat 0 atau lebih.")
    .optional(),
});
export type SocialAccountWriteBody = z.infer<typeof socialAccountWriteSchema>;

export interface SocialAccountDto {
  id: string;
  platform: string;
  username: string;
  followers: number;
}

const toDto = (row: Row): SocialAccountDto => ({
  id: String(row.id ?? ""),
  platform: String(row.platform ?? ""),
  username: String(row.username ?? ""),
  followers: Number(row.followers) || 0,
});

export async function upsertSocialAccount(
  { db, userId }: CreatorWriteContext,
  body: SocialAccountWriteBody,
): Promise<SocialAccountDto> {
  const values = {
    creator_id: userId,
    platform: body.platform,
    username: body.username.trim(),
    ...(body.followers !== undefined ? { followers: body.followers } : {}),
  };
  const { data, error } = await db
    .from("creator_social_accounts")
    .upsert(values, { onConflict: "creator_id,platform" })
    .select("*")
    .single();
  throwIfDbError(error);
  return toDto(data as Row);
}

export async function deleteSocialAccount({ db, userId }: CreatorWriteContext, accountId: string) {
  const { data, error } = await db
    .from("creator_social_accounts")
    .delete()
    .eq("id", accountId)
    .eq("creator_id", userId)
    .select("id");
  throwIfDbError(error);
  if (!data || (data as Row[]).length === 0) throw new HttpError(404, "Akun sosial tidak ditemukan.");
  return { deleted: true as const };
}
