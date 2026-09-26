import { Client, Databases, ID, Permission, Role, Query } from "node-appwrite";

/**
 * Perbarui konten campaign draft. UMKM-ONLY — caller harus memiliki campaign.
 *
 * MENGAPA DI SERVER:
 * Kalau UMKM punya Permission.update pada baris campaigns dari browser, ia bisa
 * langsung menulis { remainingBudget: N, status: "active" } dan "mendanai" campaign
 * tanpa melalui Midtrans sama sekali. Dengan merutekan semua update melalui Function
 * ini, kampanye yang terpapar ke klien hanya punya Permission.read + Permission.delete.
 * Function ini menegakkan allowlist field yang ketat — tidak ada field keuangan.
 *
 * FIELD ALLOWLIST (non-keuangan):
 *   title, category, type, platforms, description, budget (nominal target),
 *   rewardPer1000Views, claimLimit, submissionDays, thumbnailUrl
 *
 * TIDAK DIIZINKAN melalui Function ini (server-only):
 *   remainingBudget, spentAmount, status, totalClaims, publishedAt
 *
 * thumbnailUrl (gambar produk campaign):
 *   - string, maks 2048 (size kolom), wajib URL view file bucket
 *     campaign-assets — path divalidasi, host TIDAK di-hardcode supaya tidak
 *     bergantung pada endpoint publik yang bisa berbeda dari endpoint Function.
 *   - DITOLAK bila campaign sudah didanai (remainingBudget > 0) dan nilainya
 *     berubah — aturan DRAFT + NOT FUNDED → thumbnail immutable.
 *
 * Brief dan asset di-upsert oleh klien sendiri karena baris tersebut sudah punya
 * Permission.update(Role.user(umkmId)) yang diberikan saat createDocument pertama
 * dan tidak menyimpan data keuangan.
 *
 * Fix SEC-H1 — 2026-08-08
 * thumbnailUrl — Campaign Product Thumbnail
 */

const MAX_TITLE = 255;
const MAX_DESCRIPTION = 5000;
const MIN_BUDGET = 50000;
const MAX_BUDGET = 999999999;
const MAX_THUMBNAIL_URL = 2048;

export default async ({ req, res, log, error }) => {
  try {
    if (req.method && req.method !== "POST") {
      return json(res, { error: "Method not allowed" }, 405);
    }

    const env = getEnv(req);
    const userId = getUserId(req);
    if (!userId) return json(res, { error: "Unauthorized" }, 401);

    const body = parseBody(req);
    const campaignId = str(body.campaignId);
    if (!campaignId) return json(res, { error: "campaignId wajib diisi." }, 400);

    const databases = createDatabasesClient(env);

    // Validasi kepemilikan + status draft (ownership-checked, bukan cuma $id)
    const res2 = await databases.listDocuments(env.databaseId, env.campaignsCollectionId, [
      Query.equal("$id", campaignId),
      Query.equal("umkmId", userId),
      Query.equal("status", "draft"),
      Query.limit(1),
    ]);
    if (res2.total === 0) {
      return json(res, { error: "Campaign draft tidak ditemukan atau bukan milik Anda." }, 404);
    }
    const campaign = res2.documents[0];
    const isFunded = (Number(campaign.remainingBudget) || 0) > 0;

    // Bangun payload hanya dari field yang diizinkan
    const patch = {};
    const title = str(body.title).trim();
    if (title) {
      if (title.length > MAX_TITLE) return json(res, { error: `Judul maksimal ${MAX_TITLE} karakter.` }, 400);
      patch.title = title;
    }
    if (body.category !== undefined) patch.category = str(body.category).trim();
    if (body.type !== undefined) patch.type = str(body.type).trim();
    if (body.platforms !== undefined) {
      patch.platforms = Array.isArray(body.platforms) ? body.platforms : [str(body.platforms)];
    }
    const description = body.description !== undefined ? str(body.description).trim() : undefined;
    if (description !== undefined) {
      if (description.length > MAX_DESCRIPTION) return json(res, { error: `Deskripsi maksimal ${MAX_DESCRIPTION} karakter.` }, 400);
      patch.description = description;
    }
    if (body.budget !== undefined) {
      const budget = Number(body.budget);
      if (isFunded && budget !== campaign.budget) {
        return json(res, { error: "Tidak dapat mengubah budget setelah pendanaan masuk." }, 400);
      }
      if (!Number.isInteger(budget) || budget < MIN_BUDGET || budget > MAX_BUDGET) {
        return json(res, { error: `Budget tidak valid. Minimal Rp${MIN_BUDGET.toLocaleString("id-ID")}.` }, 400);
      }
      patch.budget = budget;
    }
    if (body.rewardPer1000Views !== undefined) {
      const rpv = Number(body.rewardPer1000Views);
      if (isFunded && rpv !== campaign.rewardPer1000Views) {
        return json(res, { error: "Tidak dapat mengubah reward setelah pendanaan masuk." }, 400);
      }
      if (!Number.isInteger(rpv) || rpv < 0) return json(res, { error: "rewardPer1000Views tidak valid." }, 400);
      patch.rewardPer1000Views = rpv;
    }
    if (body.claimLimit !== undefined) {
      const cl = Number(body.claimLimit);
      if (isFunded && cl !== campaign.claimLimit) {
        return json(res, { error: "Tidak dapat mengubah kuota kreator setelah pendanaan masuk." }, 400);
      }
      if (!Number.isInteger(cl) || cl < 1) return json(res, { error: "claimLimit harus minimal 1." }, 400);
      patch.claimLimit = cl;
    }
    if (body.submissionDays !== undefined) {
      const sd = Number(body.submissionDays);
      if (!Number.isInteger(sd) || sd < 1) return json(res, { error: "submissionDays harus minimal 1." }, 400);
      patch.submissionDays = sd;
    }
    if (body.thumbnailUrl !== undefined) {
      const thumb = str(body.thumbnailUrl).trim();
      if (thumb.length > MAX_THUMBNAIL_URL) {
        return json(res, { error: `URL gambar produk maksimal ${MAX_THUMBNAIL_URL} karakter.` }, 400);
      }
      if (thumb && !isCampaignThumbnailUrl(thumb)) {
        return json(res, { error: "URL gambar produk tidak valid." }, 400);
      }
      const currentThumb = str(campaign.thumbnailUrl).trim();
      if (isFunded && thumb !== currentThumb) {
        return json(res, { error: "Tidak dapat mengubah gambar campaign setelah pendanaan masuk." }, 400);
      }
      patch.thumbnailUrl = thumb;
    }

    if (Object.keys(patch).length === 0) {
      return json(res, { error: "Tidak ada field yang diperbarui." }, 400);
    }

    const updated = await databases.updateDocument(
      env.databaseId,
      env.campaignsCollectionId,
      campaignId,
      patch
    );

    log(`Campaign draft ${campaignId} diperbarui oleh ${userId}: ${Object.keys(patch).join(", ")}`);
    return json(res, { campaignId: updated.$id, status: updated.status });
  } catch (err) {
    error(err?.stack || err?.message || String(err));
    return json(res, { error: "Internal server error" }, 500);
  }
};

function str(value) {
  return typeof value === "string" ? value : "";
}

/**
 * Validasi ketat-thumbnail: URL https yang pathname-nya persis
 * /storage/buckets/<campaign-assets>/files/<fileId>/view.
 * Host sengaja TIDAK dicocokkan dengan endpoint Function — endpoint publik
 * (NEXT_PUBLIC_APPWRITE_ENDPOINT) bisa berbeda dari APPWRITE_FUNCTION_API_ENDPOINT
 * sehingga kecocokan host akan menolak URL valid (coupling rapuh).
 */
function isCampaignThumbnailUrl(value) {
  if (!value.startsWith("https://")) return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  // URL publik = `${endpoint}/storage/...`; endpoint publik bisa memuat base
  // path (mis. /v1) sehingga prefix opsional sebelum /storage/ diizinkan.
  // Base path Function TIDAK dipakai sebagai acuan — endpoint publik dan
  // APPWRITE_FUNCTION_API_ENDPOINT boleh berbeda.
  const match = url.pathname.match(
    /^(?:\/[^/]+)*\/storage\/buckets\/([A-Za-z0-9_-]+)\/files\/([A-Za-z0-9_-]+)\/view$/
  );
  if (!match) return false;
  const bucketId =
    process.env.NEXT_PUBLIC_APPWRITE_BUCKET_CAMPAIGN_ASSETS || "campaign-assets";
  return match[1] === bucketId;
}

function getUserId(req) {
  return req.headers?.["x-appwrite-user-id"] || req.headers?.["X-Appwrite-User-Id"];
}

function getEnv(req) {
  const env = {
    appwriteEndpoint: process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT,
    appwriteProjectId: process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID,
    appwriteApiKey: req.headers["x-appwrite-key"] || process.env.APPWRITE_API_KEY,
    databaseId: process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_DB_ID,
    campaignsCollectionId:
      process.env.CAMPAIGNS_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_CAMPAIGN_COLLECTION ||
      "campaigns",
  };
  const missing = Object.entries(env).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) throw new Error(`Missing env vars: ${missing.join(", ")}`);
  return env;
}

function createDatabasesClient(env) {
  const client = new Client()
    .setEndpoint(env.appwriteEndpoint)
    .setProject(env.appwriteProjectId)
    .setKey(env.appwriteApiKey);
  return new Databases(client);
}

function parseBody(req) {
  try {
    if (req.bodyJson && typeof req.bodyJson === "object") return req.bodyJson;
    const rawBody = req.bodyText || req.body || "{}";
    return typeof rawBody === "object" ? rawBody : JSON.parse(rawBody);
  } catch {
    return {};
  }
}

function json(res, body, statusCode = 200) {
  return res.json(body, statusCode, { "content-type": "application/json" });
}
