import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { HttpError, parseBody, readJsonBody } from "@/server/http";
import type { z } from "zod";

import type { CampaignWriteContext } from "./shared";

/** Sesi UMKM aktif → konteks tulis (client service role + userId sesi). */
export async function umkmWriteContext(): Promise<CampaignWriteContext> {
  const { user } = await requireUser({ role: "umkm" });
  return { db: createAdminClient(), userId: user.id };
}

/** Body JSON → divalidasi Zod (400 + pesan pertama bila gagal). */
export async function readBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  return parseBody(schema, await readJsonBody(request), "Data campaign tidak valid.");
}

/** Segmen ID di path: teks 1–255 karakter. */
export function pathId(value: string | undefined, label: string): string {
  const id = (value ?? "").trim();
  if (!id || id.length > 255) throw new HttpError(400, `${label} tidak valid.`);
  return id;
}
