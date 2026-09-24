import { Client, Databases, ID, Query } from "node-appwrite";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async ({ req, res, log, error }) => {
  try {
    const env = getEnv(req);
    const databases = createDatabasesClient(env);
    const { Query } = await import("node-appwrite");

    const body = req.bodyJson || req.body || {};
    const submissionId = body.$id || body.submissionId;

    if (!submissionId) {
      return res.json({ success: false, error: "Missing submissionId" }, 400);
    }

    const submission = await databases.getDocument(
      env.databaseId, env.submissionsCollectionId, submissionId
    );

    const postUrl = submission.postUrl || "";
    const platform = submission.platform || "tiktok";
    const reasons = [];
    let risk = 0;

    // 1. URL valid (format benar)
    let parsedUrl = null;
    try {
      parsedUrl = new URL(postUrl);
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new Error("invalid protocol");
      }
    } catch {
      risk += 30;
      reasons.push("URL tidak valid");
    }

    // 2. Platform match
    if (parsedUrl && !isPlatformMatch(parsedUrl.hostname, platform)) {
      risk += 20;
      reasons.push(`Platform tidak cocok (${platform})`);
    }

    // 3. URL accessibility (tidak 404 / dapat diakses)
    if (parsedUrl) {
      try {
        const head = await fetch(parsedUrl.toString(), { method: "GET", redirect: "follow" });
        if (!head.ok) {
          risk += 25;
          reasons.push(`URL tidak dapat diakses (status ${head.status})`);
        }
      } catch (fetchErr) {
        risk += 25;
        reasons.push("URL tidak dapat diakses");
      }
    }

    // 4. Deduplikasi
    try {
      const duplicates = await databases.listDocuments(
        env.databaseId, env.submissionsCollectionId,
        [
          Query.equal("postUrl", postUrl),
          Query.notEqual("$id", submissionId),
          Query.limit(1),
        ]
      );
      if (duplicates.documents.length > 0) {
        risk += 25;
        reasons.push("URL duplikat dengan submission lain");
      }
    } catch (dupErr) {
      error("Deduplication check failed:", dupErr.message);
    }

    // 5. Content analysis (text-based) via Gemini
    const GEMINI_API_KEY = req.variables?.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (GEMINI_API_KEY && submission.caption) {
      try {
        const brief = await loadBrief(databases, env, submission.campaignId);
        const analysis = await runContentAnalysis(GEMINI_API_KEY, submission.caption, brief);
        const contentRisk = Math.floor((analysis.overallScore || 0) * 20 / 100);
        risk += contentRisk;

        await logAiRequest(databases, env, submission.creatorId, submission.caption, JSON.stringify(analysis));

        if (analysis.fraudSignal) {
          reasons.push(`Indikasi fraud: ${analysis.fraudSignal}`);
        }
        if (contentRisk > 0) {
          reasons.push(`Content analysis: ${analysis.reason || "kurang sesuai brief"} (${contentRisk}/20)`);
        }
      } catch (aiErr) {
        error("Content analysis failed:", aiErr.message);
      }
    } else if (!submission.caption) {
      reasons.push("Content analysis dilewati (caption kosong)");
    } else {
      reasons.push("Content analysis dilewati (GEMINI_API_KEY tidak dikonfigurasi)");
    }

    const fraudScore = Math.min(100, risk);
    const result = mapStatus(fraudScore);

    await databases.updateDocument(
      env.databaseId, env.submissionsCollectionId, submissionId,
      { fraudScore, fraudStatus: result }
    );

    try {
      await databases.createDocument(
        env.databaseId, env.fraudChecksCollectionId, ID.unique(),
        {
          submissionId,
          score: fraudScore,
          result,
          reason: reasons.join("; ") || "Lolos semua validasi",
        }
      );
    } catch (fcErr) {
      error("Failed to write fraud_checks:", fcErr.message);
    }

    log(`Fraud precheck for ${submissionId}: score=${fraudScore} status=${result}`);
    return res.json({ success: true, score: fraudScore, status: result });
  } catch (err) {
    error(err?.stack || err?.message || String(err));
    return res.json({ success: false, error: err.message }, 500);
  }
};

function isPlatformMatch(hostname, platform) {
  const map = {
    tiktok: /tiktok\.com$/i,
    instagram: /instagram\.com$/i,
    youtube: /youtube\.com$|youtu\.be$/i,
  };
  const pattern = map[platform];
  if (!pattern) return false;
  return pattern.test(hostname);
}

function mapStatus(score) {
  if (score <= 30) return "safe";
  if (score <= 70) return "review";
  return "rejected";
}

async function loadBrief(databases, env, campaignId) {
  if (!campaignId) return null;
  try {
    const existing = await databases.listDocuments(
      env.databaseId, env.campaignBriefsCollectionId,
      [Query.equal("campaignId", campaignId), Query.limit(1)]
    );
    const doc = existing.documents[0];
    if (!doc) return null;
    let doAndDont = { do: [], dont: [] };
    try {
      doAndDont = doc.doAndDont ? JSON.parse(doc.doAndDont) : doAndDont;
    } catch { /* ignore */ }
    return {
      objective: doc.objective || "",
      contentAngle: doc.contentAngle || "",
      cta: doc.cta || "",
      briefDetail: doc.briefDetail || "",
      doAndDont,
    };
  } catch {
    return null;
  }
}

async function runContentAnalysis(apiKey, caption, brief) {
  const hashtags = (caption.match(/#[\w]+/g) || []).map((h) => h.slice(1));
  const briefText = brief
    ? JSON.stringify({
        objective: brief.objective,
        contentAngle: brief.contentAngle,
        cta: brief.cta,
        briefDetail: brief.briefDetail,
        doAndDont: brief.doAndDont,
      })
    : "Tidak ada brief kampanye.";

  const prompt = `Analisis keaslian dan kesesuaian submission konten TikTok terhadap brief campaign.

Caption: ${caption}
Hashtags: ${JSON.stringify(hashtags)}

Brief Campaign:
${briefText}

Kembalikan JSON objek (tanpa markdown, raw JSON only) dengan struktur:
{
  "captionRelevance": number 0-100,
  "hashtagRelevance": number 0-100,
  "fraudSignal": string | null,
  "overallScore": number 0-100,
  "reason": string
}
overallScore = seberapa TIDAK sesuai caption dengan brief (semakin tinggi = semakin tidak sesuai / berisiko).`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { captionRelevance: 0, hashtagRelevance: 0, fraudSignal: null, overallScore: 50, reason: "Gagal mem-parsing analisis" };
  }
}

async function logAiRequest(databases, env, userId, prompt, response) {
  try {
    await databases.createDocument(
      env.databaseId, env.aiRequestsCollectionId, ID.unique(),
      {
        userId: userId || "",
        feature: "fraud",
        prompt,
        response,
      }
    );
  } catch (logErr) {
    error("Failed to log ai_requests:", logErr.message);
  }
}

function getEnv(req) {
  const env = {
    appwriteEndpoint: process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT,
    appwriteProjectId: process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID,
    appwriteApiKey: req.headers["x-appwrite-key"] || process.env.APPWRITE_API_KEY,
    databaseId: process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_DB_ID,
    submissionsCollectionId: process.env.SUBMISSIONS_COLLECTION_ID || process.env.NEXT_PUBLIC_SUBMISSION_COLLECTION || "campaign_submissions",
    fraudChecksCollectionId: process.env.FRAUD_CHECKS_COLLECTION_ID || process.env.NEXT_PUBLIC_FRAUD_CHECK_COLLECTION || "fraud_checks",
    campaignsCollectionId: process.env.CAMPAIGNS_COLLECTION_ID || process.env.NEXT_PUBLIC_CAMPAIGN_COLLECTION || "campaigns",
    campaignBriefsCollectionId: process.env.CAMPAIGN_BRIEFS_COLLECTION_ID || "6ab530d00018edb50097",
    aiRequestsCollectionId: process.env.AI_REQUESTS_COLLECTION_ID || "ai_requests",
  };
  const missing = Object.entries(env).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  return env;
}

function createDatabasesClient(env) {
  const client = new Client()
    .setEndpoint(env.appwriteEndpoint)
    .setProject(env.appwriteProjectId)
    .setKey(env.appwriteApiKey);
  return new Databases(client);
}
