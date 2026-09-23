import { Client, Databases, Query } from "node-appwrite";
import {
  evaluateUmkmCompletion,
  evaluateCreatorCompletion,
  nextProfileCompleted,
  umkmFailedFields,
} from "./completion.js";

/**
 * Update profil UMKM/Kreator + hitung `isProfileCompleted` secara server-side.
 *
 * Kenapa Function (bukan updateDocument dari browser):
 * - Flag completion adalah source of truth untuk RoleGuard, claim campaign, dan
 *   direktori kreator. Client tidak boleh menulisnya sendiri.
 * - `phone`/`address` UMKM ada di `users`, bukan `umkm_profiles`.
 * - Evaluasi Creator butuh join `creator_social_accounts` (TikTok).
 *
 * Body:
 * - Field profil yang di-whitelist per role (lihat UMKM_* / CREATOR_*).
 * - `isProfileCompleted` di body SELALU diabaikan — hanya hasil evaluasi server
 *   yang ditulis.
 *
 * Completion evaluation WAJIB memakai hasil `updateDocument()` (atau read by
 * `$id`) — BUKAN `listDocuments()` re-read setelah write. `listDocuments()`
 * bisa mengembalikan baris stale dan menyebabkan flag tidak pernah flip ke
 * true meski write payload sudah lengkap.
 *
 * Flag never downgrade: true → true; false → true hanya jika evaluasi pass.
 */

const UMKM_PROFILE_FIELDS = [
  "businessName",
  "category",
  "city",
  "description",
  "tiktok",
  "logoUrl",
];

const UMKM_USER_FIELDS = ["phone", "address"];

const CREATOR_PROFILE_FIELDS = [
  "displayName",
  "niche",
  "city",
  "bio",
  "avatarUrl",
  "bannerUrl",
];

export default async ({ req, res, log, error }) => {
  try {
    if (req.method && req.method !== "POST") {
      return json(res, { error: "Method not allowed" }, 405);
    }

    const env = getEnv(req);
    const userId = getUserId(req);
    if (!userId) return json(res, { error: "Unauthorized" }, 401);

    const body = parseBody(req);
    const databases = createDatabasesClient(env);

    const userRow = await findByUserId(databases, env.databaseId, env.usersCollectionId, userId);
    if (!userRow) return json(res, { error: "Profil pengguna tidak ditemukan." }, 404);

    const role = userRow.role;
    if (role !== "umkm" && role !== "creator") {
      return json(res, { error: "Role tidak didukung untuk update profil." }, 400);
    }

    if (role === "umkm") {
      return await handleUmkm({ databases, env, userId, body, userRow, res, log });
    }
    return await handleCreator({ databases, env, userId, body, res, log });
  } catch (err) {
    error(err?.stack || err?.message || String(err));
    return json(res, { error: "Internal server error" }, 500);
  }
};

async function handleUmkm({ databases, env, userId, body, userRow, res, log }) {
  const profile = await findByUserId(databases, env.databaseId, env.umkmProfilesCollectionId, userId);
  if (!profile) return json(res, { error: "Profil UMKM tidak ditemukan." }, 404);

  const profilePayload = pickFields(body, UMKM_PROFILE_FIELDS);
  const userPayload = pickFields(body, UMKM_USER_FIELDS);

  // Sumber evaluasi = hasil write ini (updateDocument return), bukan
  // listDocuments() re-read — re-read broad query bisa stale setelah write.
  let freshProfile = profile;
  if (Object.keys(profilePayload).length > 0) {
    freshProfile = await databases.updateDocument(
      env.databaseId,
      env.umkmProfilesCollectionId,
      profile.$id,
      profilePayload
    );
  }
  let freshUser = userRow;
  if (Object.keys(userPayload).length > 0) {
    freshUser = await databases.updateDocument(
      env.databaseId,
      env.usersCollectionId,
      userRow.$id,
      userPayload
    );
  }
  if (!freshProfile || !freshUser) {
    return json(res, { error: "Profil UMKM tidak ditemukan." }, 404);
  }

  const completionFields = {
    businessName: freshProfile.businessName,
    category: freshProfile.category,
    city: freshProfile.city,
    description: freshProfile.description,
    phone: freshUser.phone,
  };
  const evaluated = evaluateUmkmCompletion(completionFields);
  const nextFlag = nextProfileCompleted(profile.isProfileCompleted === true, evaluated);

  if (profile.isProfileCompleted !== nextFlag) {
    await databases.updateDocument(env.databaseId, env.umkmProfilesCollectionId, profile.$id, {
      isProfileCompleted: nextFlag,
    });
  }

  if (nextFlag) {
    log(`update-profile umkm ${userId} completed=true`);
  } else {
    const failed = umkmFailedFields(completionFields);
    log(`update-profile umkm ${userId} completed=false failed=${failed.join(",")}`);
  }
  return json(res, {
    success: true,
    role: "umkm",
    isProfileCompleted: nextFlag,
    businessName: freshProfile.businessName,
    category: freshProfile.category,
    city: freshProfile.city,
    description: freshProfile.description,
    tiktok: freshProfile.tiktok ?? "",
    logoUrl: freshProfile.logoUrl ?? "",
    address: freshUser.address ?? "",
    phone: freshUser.phone ?? "",
  });
}

async function handleCreator({ databases, env, userId, body, res, log }) {
  const profile = await findByUserId(
    databases,
    env.databaseId,
    env.creatorProfilesCollectionId,
    userId
  );
  if (!profile) return json(res, { error: "Profil kreator tidak ditemukan." }, 404);

  const profilePayload = pickFields(body, CREATOR_PROFILE_FIELDS);
  // Hasil write — jangan listDocuments() re-read (stale setelah write).
  let freshProfile = profile;
  if (Object.keys(profilePayload).length > 0) {
    freshProfile = await databases.updateDocument(
      env.databaseId,
      env.creatorProfilesCollectionId,
      profile.$id,
      profilePayload
    );
  }
  if (!freshProfile) return json(res, { error: "Profil kreator tidak ditemukan." }, 404);

  const socials = await databases.listDocuments(env.databaseId, env.creatorSocialAccountsCollectionId, [
    Query.equal("creatorId", userId),
    Query.equal("platform", "tiktok"),
    Query.limit(1),
  ]);
  const tiktokUsername = socials.documents[0]?.username ?? "";

  const evaluated = evaluateCreatorCompletion({
    displayName: freshProfile.displayName,
    niche: freshProfile.niche,
    city: freshProfile.city,
    bio: freshProfile.bio,
    tiktokUsername,
  });
  const nextFlag = nextProfileCompleted(profile.isProfileCompleted === true, evaluated);

  if (profile.isProfileCompleted !== nextFlag) {
    await databases.updateDocument(env.databaseId, env.creatorProfilesCollectionId, profile.$id, {
      isProfileCompleted: nextFlag,
    });
  }

  log(
    nextFlag
      ? `update-profile creator ${userId} completed=true`
      : `update-profile creator ${userId} completed=false`
  );
  return json(res, {
    success: true,
    role: "creator",
    isProfileCompleted: nextFlag,
    displayName: freshProfile.displayName,
    niche: freshProfile.niche,
    city: freshProfile.city,
    bio: freshProfile.bio,
    avatarUrl: freshProfile.avatarUrl ?? "",
    bannerUrl: freshProfile.bannerUrl ?? "",
    tiktokUsername,
  });
}

function getEnv(req) {
  const env = {
    appwriteEndpoint: process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT,
    appwriteProjectId: process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID,
    appwriteApiKey: req.headers["x-appwrite-key"] || process.env.APPWRITE_API_KEY,
    databaseId: process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_DB_ID,
    usersCollectionId: process.env.USERS_COLLECTION_ID || process.env.NEXT_PUBLIC_USER_COLLECTION || "users",
    umkmProfilesCollectionId: process.env.UMKM_PROFILES_COLLECTION_ID || "umkm_profiles",
    creatorProfilesCollectionId:
      process.env.CREATOR_PROFILES_COLLECTION_ID || process.env.NEXT_PUBLIC_CREATOR_COLLECTION || "creator_profiles",
    creatorSocialAccountsCollectionId:
      process.env.CREATOR_SOCIAL_ACCOUNT_COLLECTION_ID ||
      process.env.CREATOR_SOCIAL_ACCOUNTS_COLLECTION_ID ||
      "creator_social_accounts",
  };
  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  return env;
}

function createDatabasesClient(env) {
  const client = new Client()
    .setEndpoint(env.appwriteEndpoint)
    .setProject(env.appwriteProjectId)
    .setKey(env.appwriteApiKey);
  return new Databases(client);
}

function getUserId(req) {
  return req.headers?.["x-appwrite-user-id"] || req.headers?.["X-Appwrite-User-Id"];
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

async function findByUserId(databases, databaseId, collectionId, userId) {
  const result = await databases.listDocuments(databaseId, collectionId, [
    Query.equal("userId", userId),
    Query.limit(1),
  ]);
  return result.documents[0] || null;
}

function pickFields(body, allowed) {
  const payload = {};
  for (const key of allowed) {
    const value = body[key];
    if (value !== undefined) payload[key] = value;
  }
  return payload;
}

function json(res, body, statusCode = 200) {
  return res.json(body, statusCode, { "content-type": "application/json" });
}
