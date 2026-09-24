import { Client, Databases, Query, Permission, Role } from "node-appwrite";

/**
 * Ubah status campaign (jeda / aktifkan kembali / terbitkan). UMKM-ONLY.
 *
 * MENGAPA DI SERVER:
 * Jika Permission.update ada di sisi klien, UMKM bisa langsung menulis
 * { remainingBudget: N, status: "active" } dari browser dan "mendanai" campaign
 * tanpa melalui Midtrans. Function ini menggantikan semua client-side
 * updateDocument ke kolom status sehingga baris campaign aman tanpa
 * Permission.update di klien.
 *
 * ACTION yang didukung:
 *   "pause"   — active → paused
 *   "resume"  — paused → active
 *   "publish" — draft  → active (wajib remainingBudget > 0, butuh pembayaran)
 *
 * Fix SEC-H1 — 2026-08-08
 */

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
    const action = str(body.action); // "pause" | "resume" | "publish"

    if (!campaignId) return json(res, { error: "campaignId wajib diisi." }, 400);
    if (!["pause", "resume", "publish"].includes(action)) {
      return json(res, { error: "action harus salah satu dari: pause, resume, publish." }, 400);
    }

    const databases = createDatabasesClient(env);

    // Baca campaign dengan filter kepemilikan
    const listRes = await databases.listDocuments(env.databaseId, env.campaignsCollectionId, [
      Query.equal("$id", campaignId),
      Query.equal("umkmId", userId),
      Query.limit(1),
    ]);
    if (listRes.total === 0) {
      return json(res, { error: "Campaign tidak ditemukan atau bukan milik Anda." }, 404);
    }
    const campaign = listRes.documents[0];
    const current = str(campaign.status);

    if (action === "pause") {
      if (current !== "active") {
        return json(res, { error: "Hanya campaign aktif yang bisa dijeda." }, 409);
      }
      await databases.updateDocument(env.databaseId, env.campaignsCollectionId, campaignId, {
        status: "paused",
      });
      log(`Campaign ${campaignId} dijeda oleh ${userId}`);
      return json(res, { campaignId, status: "paused" });
    }

    if (action === "resume") {
      if (current !== "paused") {
        return json(res, { error: "Hanya campaign terjeda yang bisa diaktifkan kembali." }, 409);
      }
      await databases.updateDocument(env.databaseId, env.campaignsCollectionId, campaignId, {
        status: "active",
      });
      log(`Campaign ${campaignId} diaktifkan kembali oleh ${userId}`);
      return json(res, { campaignId, status: "active" });
    }

    if (action === "publish") {
      if (current !== "draft") {
        return json(res, { error: "Hanya campaign draft yang bisa diterbitkan." }, 409);
      }
      const remaining = Number(campaign.remainingBudget) || 0;
      const budgetTarget = Number(campaign.budget) || 0;
      if (remaining < budgetTarget) {
        return json(
          res,
          { error: "Dana campaign belum mencukupi target budget. Lakukan pembayaran/top-up terlebih dahulu." },
          409
        );
      }
      const newPermissions = [
        Permission.read(Role.any()),
        Permission.delete(Role.user(userId)),
      ];

      await databases.updateDocument(env.databaseId, env.campaignsCollectionId, campaignId, {
        status: "active",
        publishedAt: new Date().toISOString(),
      }, newPermissions);

      try {
        const briefRes = await databases.listDocuments(env.databaseId, env.campaignBriefsCollectionId, [
          Query.equal("campaignId", campaignId),
          Query.limit(1)
        ]);
        if (briefRes.documents.length > 0) {
          await databases.updateDocument(env.databaseId, env.campaignBriefsCollectionId, briefRes.documents[0].$id, {}, newPermissions);
        }
      } catch (e) {
        log(`Gagal update permission brief: ${e.message}`);
      }

      try {
        const assetRes = await databases.listDocuments(env.databaseId, env.campaignAssetsCollectionId, [
          Query.equal("campaignId", campaignId),
          Query.limit(1)
        ]);
        if (assetRes.documents.length > 0) {
          await databases.updateDocument(env.databaseId, env.campaignAssetsCollectionId, assetRes.documents[0].$id, {}, newPermissions);
        }
      } catch (e) {
        log(`Gagal update permission asset: ${e.message}`);
      }

      log(`Campaign ${campaignId} diterbitkan oleh ${userId}`);
      return json(res, { campaignId, status: "active" });
    }

    // Tidak seharusnya sampai sini
    return json(res, { error: "Aksi tidak valid." }, 400);
  } catch (err) {
    error(err?.stack || err?.message || String(err));
    return json(res, { error: "Internal server error" }, 500);
  }
};

function str(value) {
  return typeof value === "string" ? value : "";
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
    campaignBriefsCollectionId:
      process.env.CAMPAIGN_BRIEFS_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_CAMPAIGN_BRIEF_COLLECTION ||
      "6ab530d00018edb50097",
    campaignAssetsCollectionId:
      process.env.CAMPAIGN_ASSETS_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_CAMPAIGN_ASSET_COLLECTION ||
      "campaign_assets",
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
