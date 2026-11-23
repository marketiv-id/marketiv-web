import "server-only";

import type { z } from "zod";

import { creatorPortfolioSchema } from "@/lib/validations/profile.schema";
import { HttpError, throwIfDbError } from "@/server/http";
import type { CreatorWriteContext, Row } from "@/server/rate-cards/shared";
import type { CreatorPortfolioItem } from "@/types/creator-dashboard";

/** Portofolio kreator (Fase 6) — pengganti create/update/delete langsung dari browser. */

export const portfolioWriteSchema = creatorPortfolioSchema;
export type PortfolioWriteBody = z.infer<typeof portfolioWriteSchema>;

const NOT_FOUND = "Portofolio tidak ditemukan.";

const str = (value: unknown): string => (typeof value === "string" ? value : "");

/** Sama dengan `mapPortfolioDoc` lama (view-model `url`). */
export function toPortfolioDto(row: Row): CreatorPortfolioItem {
  return {
    id: str(row.id),
    title: str(row.title),
    url: str(row.portfolio_url),
    description: str(row.description),
    thumbnailUrl: str(row.thumbnail_url) || undefined,
  };
}

/** Kolom yang ditulis — trim + default sama dengan service lama. */
function columns(body: PortfolioWriteBody) {
  return {
    title: body.title.trim(),
    description: body.description?.trim() ?? "",
    thumbnail_url: body.thumbnailUrl?.trim() || null,
    portfolio_url: body.portfolioUrl.trim(),
  };
}

export async function createPortfolio({ db, userId }: CreatorWriteContext, body: PortfolioWriteBody) {
  const { data, error } = await db
    .from("creator_portfolios")
    .insert({ creator_id: userId, ...columns(body) })
    .select("*")
    .single();
  throwIfDbError(error);
  return toPortfolioDto(data as Row);
}

export async function updatePortfolio(
  { db, userId }: CreatorWriteContext,
  portfolioId: string,
  body: PortfolioWriteBody,
) {
  const { data, error } = await db
    .from("creator_portfolios")
    .update(columns(body))
    .eq("id", portfolioId)
    .eq("creator_id", userId)
    .select("*")
    .maybeSingle();
  throwIfDbError(error);
  if (!data) throw new HttpError(404, NOT_FOUND);
  return toPortfolioDto(data as Row);
}

export async function deletePortfolio({ db, userId }: CreatorWriteContext, portfolioId: string) {
  const { data, error } = await db
    .from("creator_portfolios")
    .delete()
    .eq("id", portfolioId)
    .eq("creator_id", userId)
    .select("id");
  throwIfDbError(error);
  if (!data || (data as Row[]).length === 0) throw new HttpError(404, NOT_FOUND);
  return { deleted: true as const };
}
