/**
 * Row Postgres (snake_case) → "Doc" bergaya Appwrite yang dibaca mapper lama.
 *
 * Mapper DTO di service (`mapCampaign(doc)`, `toOrder(doc)`, …) ditulis untuk
 * dokumen Appwrite: `$id`, `$createdAt`, kolom camelCase (atau snake_case untuk
 * kolom yang memang snake_case di Appwrite, mis. `conversations.umkm_id`), dan
 * JSON yang disimpan sebagai STRING. `rowToDoc()` membalik pemetaan Fase 2
 * (`scripts/migration/mapping.ts`, tabel di `progress/fase-02.md`) supaya mapper
 * itu bisa dipakai ulang apa adanya — kontrak DTO (skill
 * `marketiv-data-contracts`) tidak berubah.
 *
 * Aturan:
 *   id          → $id (+ `userId` untuk tabel `users`, karena PK = id Auth)
 *   created_at  → $createdAt (+ `createdAt` bila Appwrite punya kolom app itu)
 *   updated_at  → $updatedAt
 *   kolom lain  → nama Appwrite-nya (RENAME) atau apa adanya
 *   kolom jsonb yang dulu string JSON → `JSON.stringify` (JSON) — mapper lama
 *   mem-parse string.
 *
 * Kolom yang tidak dikenal diteruskan apa adanya. Tabel `LEGACY_COLUMNS`
 * DIHASILKAN dari mapping.ts; ubah di sana lalu regenerasi bila skema berubah.
 */

import type { Doc } from "./service-result";

interface LegacyTable {
  rename?: Record<string, string>;
  json?: readonly string[];
  /** Appwrite punya kolom app `createdAt` selain `$createdAt`. */
  createdAt?: boolean;
}

export const LEGACY_COLUMNS = {
  users: { rename: {"id": "userId"}, createdAt: true },
  otp_rate_limits: { rename: {"window_start": "windowStart"} },
  appeals: { rename: {"user_id": "userId", "action_ref": "actionRef", "deadline_at": "deadlineAt", "sla_decided_at": "slaDecidedAt", "decided_at": "decidedAt"} },
  notifications: { rename: {"user_id": "userId", "is_read": "isRead"}, createdAt: true },
  ai_requests: { rename: {"user_id": "userId"}, createdAt: true },
  umkm_profiles: { rename: {"user_id": "userId", "business_name": "businessName", "logo_url": "logoUrl", "is_profile_completed": "isProfileCompleted"} },
  creator_profiles: { rename: {"user_id": "userId", "display_name": "displayName", "avatar_url": "avatarUrl", "banner_url": "bannerUrl", "total_followers": "totalFollowers", "total_orders": "totalOrders", "is_profile_completed": "isProfileCompleted"} },
  creator_social_accounts: { rename: {"creator_id": "creatorId", "engagement_rate": "engagementRate"} },
  creator_portfolios: { rename: {"creator_id": "creatorId", "thumbnail_url": "thumbnailUrl", "portfolio_url": "portfolioUrl"} },
  user_storage_usage: { rename: {"user_id": "userId", "used_bytes": "usedBytes", "quota_bytes": "quotaBytes", "file_count": "fileCount"} },
  user_files: { rename: {"user_id": "userId", "storage_file_id": "storageFileId", "bucket_id": "bucketId", "file_name": "fileName", "mime_type": "mimeType", "size_bytes": "sizeBytes", "deleted_at": "deletedAt"}, createdAt: true },
  campaigns: { rename: {"umkm_id": "umkmId", "reward_per_1000_views": "rewardPer1000Views", "claim_limit": "claimLimit", "submission_days": "submissionDays", "total_claims": "totalClaims", "spent_amount": "spentAmount", "remaining_budget": "remainingBudget", "published_at": "publishedAt", "thumbnail_url": "thumbnailUrl"} },
  campaign_briefs: { rename: {"campaign_id": "campaignId", "content_angle": "contentAngle", "brief_detail": "briefDetail", "do_and_dont": "doAndDont", "materials": "materialsJson", "generated_by_ai": "generatedByAi"}, json: ["do_and_dont", "materials"] },
  campaign_assets: { rename: {"campaign_id": "campaignId", "file_url": "fileUrl", "file_name": "fileName"} },
  campaign_claims: { rename: {"campaign_id": "campaignId", "creator_id": "creatorId", "claimed_at": "claimedAt"} },
  campaign_submissions: { rename: {"claim_id": "claimId", "campaign_id": "campaignId", "creator_id": "creatorId", "post_url": "postUrl", "fraud_score": "fraudScore", "fraud_status": "fraudStatus", "review_notes": "reviewNotes", "creator_credit": "creatorCredit", "ai_generated": "aiGenerated", "ai_disclosed": "aiDisclosed"} },
  fraud_checks: { rename: {"submission_id": "submissionId"}, createdAt: true },
  rate_cards: { rename: {"creator_id": "creatorId"}, createdAt: true },
  rate_card_packages: { rename: {"rate_card_id": "rateCardId", "delivery_days": "deliveryDays", "revision_limit": "revisionLimit"} },
  conversations: {  },
  offers: { rename: {"conversation_id": "conversationId", "umkm_id": "umkmId", "creator_id": "creatorId", "revision_limit": "revisionLimit", "package_id": "packageId", "package_name_snapshot": "packageNameSnapshot", "package_price_snapshot": "packagePriceSnapshot"}, createdAt: true },
  messages: {  },
  orders: { rename: {"offer_id": "offerId", "package_id": "packageId", "package_name_snapshot": "packageNameSnapshot", "package_price_snapshot": "packagePriceSnapshot", "creator_id": "creatorId", "umkm_id": "umkmId"}, createdAt: true },
  deliverables: { rename: {"order_id": "orderId", "file_url": "fileUrl", "file_id": "fileId", "creator_credit": "creatorCredit", "ai_generated": "aiGenerated"}, createdAt: true },
  revisions: { rename: {"order_id": "orderId", "requested_by": "requestedBy"} },
  ratecard_deliverable_validations: { rename: {"deliverable_id": "deliverableId", "order_id": "orderId", "deliverable_version": "deliverableVersion", "source_snapshot": "sourceSnapshot", "evidence_url_snapshot": "evidenceUrlSnapshot", "reviewed_by": "reviewedBy", "review_notes": "reviewNotes", "reviewed_at": "reviewedAt"} },
  wallets: { rename: {"user_id": "userId", "pending_balance": "pendingBalance"} },
  payments: {  },
  transactions: { rename: {"user_id": "userId", "reference_id": "referenceId", "reference_type": "referenceType"} },
  escrows: { rename: {"order_id": "orderId"} },
  withdrawals: { rename: {"user_id": "userId", "payout_method": "payoutMethod", "provider_name": "providerName", "account_number": "accountNumber", "account_name": "accountName", "processed_at": "processedAt"} },
} as const satisfies Record<string, LegacyTable>;

export type LegacyTableName = keyof typeof LEGACY_COLUMNS;

export function rowToDoc(table: LegacyTableName, row: Record<string, unknown> | null | undefined): Doc {
  if (!row) return {};
  const spec: LegacyTable = LEGACY_COLUMNS[table];
  const rename = spec.rename ?? {};
  const jsonCols = spec.json ?? [];
  const doc: Doc = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "created_at") {
      doc.$createdAt = value;
      if (spec.createdAt) doc.createdAt = value;
      continue;
    }
    if (key === "updated_at") {
      doc.$updatedAt = value;
      continue;
    }
    const out = jsonCols.includes(key) && value !== null && value !== undefined ? JSON.stringify(value) : value;
    if (key === "id") {
      doc.$id = value;
      if (rename.id) doc[rename.id] = value;
      continue;
    }
    doc[rename[key] ?? key] = out;
  }
  return doc;
}

export function rowsToDocs(table: LegacyTableName, rows: readonly Record<string, unknown>[] | null | undefined): Doc[] {
  return (rows ?? []).map((row) => rowToDoc(table, row));
}

/** Kebalikan nama kolom: nama Appwrite → kolom Postgres (untuk filter/sort). */
export function pgColumn(table: LegacyTableName, legacyName: string): string {
  if (legacyName === "$id") return "id";
  if (legacyName === "$createdAt" || legacyName === "createdAt") return "created_at";
  if (legacyName === "$updatedAt") return "updated_at";
  const rename: Record<string, string> = (LEGACY_COLUMNS[table] as LegacyTable).rename ?? {};
  for (const [pg, legacy] of Object.entries(rename)) if (legacy === legacyName) return pg;
  return legacyName;
}
