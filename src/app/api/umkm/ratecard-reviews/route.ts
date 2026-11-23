import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/require-user";
import { apiRoute, parseQuery } from "@/server/http";
import { getUmkmRatecardReviews } from "@/server/umkm/ratecard-reviews";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  orderId: z.string().optional(),
});

/**
 * GET /api/umkm/ratecard-reviews[?orderId=…] — pengganti Function
 * get-umkm-ratecard-reviews. Tanpa orderId → daftar; dengan → satu objek.
 * Format orderId divalidasi di modul server (400 "Order ID tidak valid.").
 */
export const GET = apiRoute("umkm.ratecard-reviews", async (request) => {
  const { user } = await requireUser({ role: "umkm" });
  const { orderId } = parseQuery(querySchema, request);
  return getUmkmRatecardReviews({ db: createAdminClient(), userId: user.id }, orderId ?? null);
});
