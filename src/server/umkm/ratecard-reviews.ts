import "server-only";

import { HttpError } from "@/server/http";
import type {
  RatecardReview,
  RatecardReviewDeliverable,
  RatecardReviewValidation,
} from "@/types/ratecard-review.types";

import { byKey, callReadRpc, groupBy, looseNumber as number, str, type Row, type UmkmReadContext } from "./shared";

/**
 * Port `get-umkm-ratecard-reviews`. Join dikumpulkan RPC
 * `umkm_ratecard_review_context` (0015) — hanya order rate card milik UMKM
 * (punya offer atau paket). Pemetaan DTO setia pada Function lama.
 */

/** Format ID lama (Appwrite) — UUID juga lolos (36 karakter). */
export const ORDER_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/;

interface ReviewContextRows {
  orders: Row[];
  offers: Row[];
  creators: Row[];
  packages: Row[];
  escrows: Row[];
  deliverables: Row[];
  revisions: Row[];
  validations: Row[];
}

interface ReviewContext {
  offerById: Map<string, Row>;
  creatorByUserId: Map<string, Row>;
  packageById: Map<string, Row>;
  escrowByOrderId: Map<string, Row>;
  deliverablesByOrderId: Map<string, Row[]>;
  validationByDeliverableId: Map<string, Row>;
  revisionsByOrderId: Map<string, Row[]>;
}

export async function getUmkmRatecardReviews(
  ctx: UmkmReadContext,
  orderId?: string | null,
): Promise<RatecardReview[] | RatecardReview> {
  const id = (orderId ?? "").trim();
  if (id && !ORDER_ID_PATTERN.test(id)) {
    throw new HttpError(400, "Order ID tidak valid.");
  }

  const rows = await callReadRpc<ReviewContextRows>(ctx.db, "umkm_ratecard_review_context", {
    p_umkm_id: ctx.userId,
    p_order_id: id || null,
  });

  if (id && rows.orders.length === 0) {
    throw new HttpError(404, "Review pekerjaan tidak ditemukan.");
  }
  if (rows.orders.length === 0) return [];

  const context: ReviewContext = {
    offerById: byKey(rows.offers, (r) => str(r.id)),
    creatorByUserId: byKey(rows.creators, (r) => str(r.user_id)),
    packageById: byKey(rows.packages, (r) => str(r.id)),
    escrowByOrderId: byKey(rows.escrows, (r) => str(r.order_id)),
    deliverablesByOrderId: groupBy(rows.deliverables, (r) => str(r.order_id)),
    validationByDeliverableId: pickLatestValidations(rows.validations),
    revisionsByOrderId: groupBy(rows.revisions, (r) => str(r.order_id)),
  };

  const reviews = rows.orders.map((order) => toReview(order, context));
  return id ? reviews[0] : reviews;
}

function toReview(order: Row, context: ReviewContext): RatecardReview {
  const orderId = str(order.id);
  const offer = context.offerById.get(str(order.offer_id)) ?? null;
  const conversationId = str(offer?.conversation_id);
  const creatorId = str(order.creator_id);
  const creator = context.creatorByUserId.get(creatorId) ?? null;
  const pkg = context.packageById.get(str(order.package_id)) ?? null;
  const escrow = context.escrowByOrderId.get(orderId) ?? null;
  const deliverables = [...(context.deliverablesByOrderId.get(orderId) ?? [])].sort(compareDeliverablesDesc);
  const latest = deliverables[0] ?? null;
  const validation = latest ? (context.validationByDeliverableId.get(str(latest.id)) ?? null) : null;
  const revisions = [...(context.revisionsByOrderId.get(orderId) ?? [])].sort((a, b) =>
    createdAt(b).localeCompare(createdAt(a)),
  );
  const packageId = str(order.package_id);
  const packageName = str(order.package_name_snapshot) || str(pkg?.name);

  return {
    orderId,
    conversationId,

    creatorId,
    creatorName: str(creator?.display_name) || "Creator",
    creatorAvatarUrl: str(creator?.avatar_url),

    projectTitle: str(offer?.title) || packageName || "Pekerjaan Rate Card",
    scope: str(offer?.description) || str(pkg?.description),
    packageContext:
      packageId || packageName
        ? {
            id: packageId,
            name: packageName,
            description: str(pkg?.description),
            output: str(pkg?.output),
            deliveryDays: number(pkg?.delivery_days),
            basePrice: number(order.package_price_snapshot ?? pkg?.price),
          }
        : null,

    amount: number(order.amount),
    orderStatus: str(order.status) as RatecardReview["orderStatus"],
    escrowStatus: str(escrow?.status) as RatecardReview["escrowStatus"],

    revisionCount: revisions.length,
    revisionLimit: resolveRevisionLimit(order.revision_limit, offer?.revision_limit, pkg?.revision_limit),

    latestDeliverable: latest ? mapDeliverable(latest) : null,
    validation: mapValidation(validation),
    deliverableHistory: deliverables.map(mapDeliverable),
    revisionHistory: revisions.map((revision) => ({
      id: str(revision.id),
      message: str(revision.message),
      status: str(revision.status) as RatecardReview["revisionHistory"][number]["status"],
      createdAt: createdAt(revision),
    })),
    createdAt: createdAt(order),
  };
}

function mapDeliverable(deliverable: Row): RatecardReviewDeliverable {
  return {
    id: str(deliverable.id),
    version: number(deliverable.version),
    status: str(deliverable.status) as RatecardReviewDeliverable["status"],
    source: str(deliverable.source) as RatecardReviewDeliverable["source"],
    fileUrl: str(deliverable.file_url),
    notes: str(deliverable.notes),
    createdAt: createdAt(deliverable),
  };
}

function mapValidation(validation: Row | null): RatecardReviewValidation {
  if (!validation) return { status: "pending" };
  const raw = str(validation.status);
  const status = raw === "valid" || raw === "invalid" ? raw : "pending";
  return {
    status,
    reviewNotes: str(validation.review_notes) || undefined,
    reviewedAt: str(validation.reviewed_at) || createdAt(validation) || undefined,
  };
}

function compareDeliverablesDesc(a: Row, b: Row): number {
  return number(b.version) - number(a.version) || createdAt(b).localeCompare(createdAt(a));
}

function pickLatestValidations(validations: Row[]): Map<string, Row> {
  const result = new Map<string, Row>();
  for (const validation of validations) {
    const deliverableId = str(validation.deliverable_id);
    const current = result.get(deliverableId);
    if (!current || createdAt(validation) > createdAt(current)) {
      result.set(deliverableId, validation);
    }
  }
  return result;
}

function resolveRevisionLimit(storedValue: unknown, ...sourceValues: unknown[]): number {
  const stored = nonNegativeInteger(storedValue);
  if (stored !== null && stored > 0) return stored;
  for (const value of sourceValues) {
    const parsed = nonNegativeInteger(value);
    if (parsed !== null) return parsed;
  }
  return stored ?? 0;
}

function nonNegativeInteger(value: unknown): number | null {
  // Number(null) = 0 di Function lama juga (kolom Appwrite kosong = null).
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

/** `createdAt` app digabung ke `created_at` saat migrasi (Fase 2). */
function createdAt(row: Row | null): string {
  return str(row?.created_at);
}
