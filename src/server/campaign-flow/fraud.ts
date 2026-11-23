import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { cleanAiText, generateText, isAiConfigured, type AiDeps, type FetchLike } from "@/server/ai/providers";
import { callWriteRpc } from "@/server/conversations/write-rpc";

/**
 * Port `ai-fraud-precheck`. Dijalankan route kirim bukti lewat `after()` —
 * setelah respons terkirim, jadi tidak pernah menahan/menggagalkan kreator.
 *
 * Skor risiko (sama dengan Function lama, maks 100):
 *   URL tidak valid +30 · host ≠ platform +20 · URL tidak bisa diakses +25 ·
 *   URL duplikat submission lain +25 · analisis caption vs brief 0–20 (AI).
 *   ≤30 safe · ≤70 review · >70 rejected.
 * Tanpa kredensial AI, analisis caption dilewati (alasan dicatat) dan skor
 * dihitung dari pemeriksaan lain — status netral, tidak memblokir review.
 *
 * Hasil disimpan atomik lewat RPC `record_fraud_check` (submission +
 * fraud_checks). Tidak pernah melempar: kegagalan hanya di-log.
 */

export type FraudResult = "safe" | "review" | "rejected";

export interface FraudDeps extends AiDeps {
  db: Pick<AdminSupabaseClient, "rpc" | "from">;
  /** fetch untuk cek URL publik (default global fetch). */
  urlFetch?: FetchLike;
}

const PLATFORM_HOST: Record<string, RegExp> = {
  tiktok: /tiktok\.com$/i,
  instagram: /instagram\.com$/i,
  youtube: /youtube\.com$|youtu\.be$/i,
};

export function mapFraudStatus(score: number): FraudResult {
  if (score <= 30) return "safe";
  if (score <= 70) return "review";
  return "rejected";
}

interface ContentAnalysis {
  overallScore?: number;
  fraudSignal?: string | null;
  reason?: string;
}

function briefFromRow(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    objective: row.objective ?? "",
    contentAngle: row.content_angle ?? "",
    cta: row.cta ?? "",
    briefDetail: row.brief_detail ?? "",
    doAndDont: row.do_and_dont ?? { do: [], dont: [] },
  };
}

function analysisPrompt(caption: string, brief: ReturnType<typeof briefFromRow>): string {
  const hashtags = (caption.match(/#[\w]+/g) || []).map((h) => h.slice(1));
  const briefText = brief ? JSON.stringify(brief) : "Tidak ada brief kampanye.";
  return `Analisis keaslian dan kesesuaian submission konten TikTok terhadap brief campaign.
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
}

function parseAnalysis(text: string): ContentAnalysis {
  try {
    return JSON.parse(cleanAiText(text)) as ContentAnalysis;
  } catch {
    return { overallScore: 50, fraudSignal: null, reason: "Gagal mem-parsing analisis" };
  }
}

export async function runFraudPrecheck(
  submissionId: string,
  deps: FraudDeps,
): Promise<{ score: number; status: FraudResult } | null> {
  const { db } = deps;
  const env = deps.env ?? process.env;
  const urlFetch = deps.urlFetch ?? ((input: string, init?: RequestInit) => fetch(input, init));
  try {
    const { data: submission, error } = await db
      .from("campaign_submissions")
      .select("id, campaign_id, creator_id, platform, post_url, caption")
      .eq("id", submissionId)
      .maybeSingle();
    if (error || !submission) {
      console.error("[fraud] submission tidak terbaca", submissionId, error?.code);
      return null;
    }
    const row = submission as Record<string, unknown>;
    const postUrl = typeof row.post_url === "string" ? row.post_url : "";
    const platform = typeof row.platform === "string" ? row.platform : "tiktok";
    const caption = typeof row.caption === "string" ? row.caption : "";
    const reasons: string[] = [];
    let risk = 0;

    let parsed: URL | null = null;
    try {
      parsed = new URL(postUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("protocol");
    } catch {
      parsed = null;
      risk += 30;
      reasons.push("URL tidak valid");
    }

    if (parsed && !PLATFORM_HOST[platform]?.test(parsed.hostname)) {
      risk += 20;
      reasons.push(`Platform tidak cocok (${platform})`);
    }

    if (parsed) {
      try {
        const res = await urlFetch(parsed.toString(), { method: "GET", redirect: "follow", signal: AbortSignal.timeout(10_000) });
        if (!res.ok) {
          risk += 25;
          reasons.push(`URL tidak dapat diakses (status ${res.status})`);
        }
      } catch {
        risk += 25;
        reasons.push("URL tidak dapat diakses");
      }
    }

    const { count: dupCount, error: dupError } = await db
      .from("campaign_submissions")
      .select("id", { count: "exact", head: true })
      .eq("post_url", postUrl)
      .neq("id", submissionId);
    if (dupError) {
      console.error("[fraud] cek duplikat gagal", dupError.code);
    } else if ((dupCount ?? 0) > 0) {
      risk += 25;
      reasons.push("URL duplikat dengan submission lain");
    }

    if (!caption) {
      reasons.push("Content analysis dilewati (caption kosong)");
    } else if (!isAiConfigured(env)) {
      reasons.push("Content analysis dilewati (AI tidak dikonfigurasi)");
    } else {
      try {
        const { data: briefRow } = await db
          .from("campaign_briefs")
          .select("objective, content_angle, cta, brief_detail, do_and_dont")
          .eq("campaign_id", String(row.campaign_id))
          .maybeSingle();
        const prompt = analysisPrompt(caption, briefFromRow(briefRow as Record<string, unknown> | null));
        const text = await generateText(prompt, { json: true, temperature: 0.2, maxOutputTokens: 1024 }, deps);
        const analysis = parseAnalysis(text);
        const contentRisk = Math.floor(((Number(analysis.overallScore) || 0) * 20) / 100);
        risk += Math.max(0, Math.min(20, contentRisk));
        if (analysis.fraudSignal) reasons.push(`Indikasi fraud: ${analysis.fraudSignal}`);
        if (contentRisk > 0) reasons.push(`Content analysis: ${analysis.reason || "kurang sesuai brief"} (${contentRisk}/20)`);
        const { error: logError } = await db.from("ai_requests").insert({
          user_id: String(row.creator_id),
          feature: "fraud",
          prompt: caption.slice(0, 5000),
          response: JSON.stringify(analysis).slice(0, 10000),
        });
        if (logError) console.error("[fraud] gagal mencatat ai_requests", logError.code);
      } catch (aiErr) {
        console.error("[fraud] content analysis gagal", aiErr instanceof Error ? aiErr.message : aiErr);
        reasons.push("Content analysis gagal");
      }
    }

    const score = Math.min(100, risk);
    const status = mapFraudStatus(score);
    await callWriteRpc(db, "record_fraud_check", {
      p_submission_id: submissionId,
      p_score: score,
      p_result: status,
      p_reason: reasons.join("; ") || "Lolos semua validasi",
    });
    return { score, status };
  } catch (err) {
    console.error("[fraud] precheck gagal", submissionId, err instanceof Error ? err.message : err);
    return null;
  }
}
