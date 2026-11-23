import "server-only";

import { z } from "zod";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { HttpError, throwIfDbError } from "@/server/http";

import { AiNotConfiguredError, cleanAiText, generateText, type AiDeps } from "./providers";

/**
 * POST /api/ai/brief — port `ai-brief`.
 *
 * Celah #4 ditutup: user SELALU dari sesi (bukan `userId` di body); bila
 * `campaignId` dikirim, campaign wajib milik user itu. Brief disimpan ke
 * `campaign_briefs` hanya bila campaign belum punya brief (perilaku lama).
 */

export const briefSchema = z.object({
  campaignId: z.string().trim().min(1).max(255).optional(),
  description: z.string({ error: "Deskripsi wajib diisi." }).trim().min(1, "Deskripsi wajib diisi.").max(5000),
  type: z.enum(["ugc", "clipping"], { error: "Tipe tidak valid. Harus 'ugc' atau 'clipping'." }),
  materials: z.array(z.string().max(500)).max(20).optional(),
  productName: z.string().max(255).optional(),
  targetMarket: z.string().max(255).optional(),
  goal: z.string().max(255).optional(),
});

export type BriefInput = z.infer<typeof briefSchema>;

export interface AiBrief {
  objective: string;
  contentAngle: string;
  cta: string;
  briefDetail: string;
  doAndDont: { do: string[]; dont: string[] };
}

export interface BriefContext {
  db: Pick<AdminSupabaseClient, "from">;
  userId: string;
}

export function buildBriefPrompt(input: BriefInput): string {
  const materials = input.materials ?? [];
  const materialsText = materials.length
    ? materials.map((m, i) => `${i + 1}. ${m}`).join("\n")
    : "No specific materials provided.";
  const typeInstructions =
    input.type === "ugc"
      ? "This is a UGC (User Generated Content) campaign. Direct the creator to create an original TikTok video from scratch using the provided product assets (photos/videos). Suggest approaches: Green Screen effect, Voiceover, or Slideshow Montage."
      : "This is a CLIPPING campaign. Direct the creator to cut/re-edit an existing long video from the provided source link. Include dynamic subtitles and a strong hook in the first 3 seconds.";
  return `Generate a structured campaign brief for a TikTok content campaign.
IMPORTANT: ALL output values in the JSON MUST be in Indonesian language (Bahasa Indonesia).
Product Name: ${input.productName || "Not specified"}
Description: ${input.description}
Target Market: ${input.targetMarket || "General"}
Campaign Goal: ${input.goal || "Brand awareness"}
Campaign Type: ${input.type}
${typeInstructions}
Assets/Materials provided:
${materialsText}
Return a JSON object with this exact structure (no markdown, no code fences, raw JSON only):
{
  "objective": "string - campaign objective",
  "contentAngle": "string - content angle/approach",
  "cta": "string - call to action",
  "briefDetail": "string - detailed creative direction, visuals, key messages, asset usage instructions",
  "doAndDont": {
    "do": ["array of do's"],
    "dont": ["array of don'ts"]
  }
}`;
}

const strList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

export function parseBrief(raw: string): AiBrief {
  const cleaned = cleanAiText(raw);
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const dd = (parsed.doAndDont ?? {}) as Record<string, unknown>;
    const s = (v: unknown) => (typeof v === "string" ? v : "");
    return {
      objective: s(parsed.objective),
      contentAngle: s(parsed.contentAngle),
      cta: s(parsed.cta),
      briefDetail: s(parsed.briefDetail),
      doAndDont: { do: strList(dd.do), dont: strList(dd.dont) },
    };
  } catch {
    // Sama dengan Function lama: teks mentah jadi briefDetail.
    return { objective: "", contentAngle: "", cta: "", briefDetail: cleaned, doAndDont: { do: [], dont: [] } };
  }
}

export async function generateCampaignBrief(
  ctx: BriefContext,
  input: BriefInput,
  deps: AiDeps = {},
): Promise<{ success: true; brief: AiBrief }> {
  if (input.campaignId) {
    const { data, error } = await ctx.db
      .from("campaigns")
      .select("id, umkm_id")
      .eq("id", input.campaignId)
      .eq("umkm_id", ctx.userId)
      .maybeSingle();
    throwIfDbError(error);
    if (!data) throw new HttpError(404, "Campaign tidak ditemukan.");
  }

  const prompt = buildBriefPrompt(input);
  let raw: string;
  try {
    raw = await generateText(prompt, { json: true, temperature: 0.7, maxOutputTokens: 2048 }, deps);
  } catch (err) {
    if (err instanceof AiNotConfiguredError) throw new HttpError(503, "Fitur AI belum dikonfigurasi.", "server");
    console.error("[ai.brief] semua penyedia gagal", err instanceof Error ? err.message : err);
    throw new HttpError(502, "Gagal menghasilkan brief AI. Coba lagi.", "server");
  }
  const brief = parseBrief(raw);

  // Audit + simpan brief: kegagalan tidak menggagalkan respons (perilaku lama).
  try {
    const { error } = await ctx.db.from("ai_requests").insert({
      user_id: ctx.userId,
      feature: "brief",
      prompt: prompt.slice(0, 5000),
      response: JSON.stringify(brief).slice(0, 10000),
    });
    if (error) console.error("[ai.brief] gagal mencatat ai_requests", error.code);
    if (input.campaignId) {
      const { error: briefError } = await ctx.db.from("campaign_briefs").upsert(
        {
          campaign_id: input.campaignId,
          objective: brief.objective.slice(0, 2000),
          content_angle: brief.contentAngle.slice(0, 2000),
          cta: brief.cta.slice(0, 1000),
          brief_detail: brief.briefDetail.slice(0, 10000),
          do_and_dont: brief.doAndDont,
          generated_by_ai: true,
        },
        { onConflict: "campaign_id", ignoreDuplicates: true },
      );
      if (briefError) console.error("[ai.brief] gagal menyimpan brief", briefError.code);
    }
  } catch (err) {
    console.error("[ai.brief] gagal mencatat", err);
  }

  return { success: true, brief };
}
