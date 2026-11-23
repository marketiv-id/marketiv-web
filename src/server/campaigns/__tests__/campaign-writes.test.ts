import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCampaignAsset, deleteCampaignAsset } from "@/server/campaigns/assets";
import { putCampaignBrief } from "@/server/campaigns/brief";
import { createCampaignDraft, createCampaignSchema } from "@/server/campaigns/create";
import { deleteCampaignDraft } from "@/server/campaigns/delete";
import { patchCampaignDraft, patchDraftSchema } from "@/server/campaigns/draft";
import { isOwnCampaignThumbnailUrl, type CampaignWriteContext } from "@/server/campaigns/shared";
import { patchCampaignStatus } from "@/server/campaigns/status";
import { HttpError } from "@/server/http";

import { createMutableFake, type MutableFake } from "./mutable-fake";

const UID = "a1111111-1111-4111-8111-111111111111";
const OTHER = "b2222222-2222-4222-8222-222222222222";
const BASE = "https://proj.supabase.test";
const thumb = (folder: string, file = "t.png") => `${BASE}/storage/v1/object/public/campaign-assets/${folder}/${file}`;

const campaignRow = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  umkm_id: UID,
  title: "Promo",
  category: "kuliner",
  type: "ugc",
  platforms: ["tiktok"],
  description: "desk",
  budget: 100000,
  reward_per_1000_views: 5000,
  status: "draft",
  claim_limit: 10,
  submission_days: 7,
  total_claims: 0,
  spent_amount: 0,
  remaining_budget: 0,
  published_at: null,
  thumbnail_url: "",
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  ...over,
});

let db: MutableFake;
const ctx = (): CampaignWriteContext => ({ db: db as unknown as CampaignWriteContext["db"], userId: UID });

async function httpError(promise: Promise<unknown>): Promise<HttpError> {
  const err = await promise.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(HttpError);
  return err as HttpError;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", BASE);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  db = createMutableFake({
    campaigns: [
      campaignRow(),
      campaignRow({ id: "c_other", umkm_id: OTHER }),
      campaignRow({ id: "c_active", status: "active", remaining_budget: 100000 }),
      campaignRow({ id: "c_paused", status: "paused", remaining_budget: 100000 }),
      campaignRow({ id: "c_funded", remaining_budget: 100000, thumbnail_url: thumb(UID, "lama.png") }),
    ],
    campaign_assets: [
      { id: "a_old", campaign_id: "c1", source: "external", type: "link", file_url: "https://x/1", created_at: "2026-11-01T00:00:00Z" },
      { id: "a_new", campaign_id: "c1", source: "external", type: "link", file_url: "https://x/2", created_at: "2026-11-02T00:00:00Z" },
    ],
    campaign_briefs: [],
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isOwnCampaignThumbnailUrl", () => {
  it("hanya URL publik campaign-assets di folder milik sendiri", () => {
    expect(isOwnCampaignThumbnailUrl(thumb(UID), UID)).toBe(true);
    expect(isOwnCampaignThumbnailUrl(thumb(OTHER), UID)).toBe(false);
    expect(isOwnCampaignThumbnailUrl(`${BASE}/storage/v1/object/public/avatars/${UID}/t.png`, UID)).toBe(false);
    expect(isOwnCampaignThumbnailUrl(`https://evil.test/storage/v1/object/public/campaign-assets/${UID}/t.png`, UID)).toBe(false);
    expect(isOwnCampaignThumbnailUrl(`${thumb(UID)}?x=1`, UID)).toBe(false);
    expect(isOwnCampaignThumbnailUrl(`${BASE}/storage/v1/object/public/campaign-assets/${UID}/a/b.png`, UID)).toBe(false);
    expect(isOwnCampaignThumbnailUrl("bukan url", UID)).toBe(false);
  });
});

describe("createCampaignDraft (celah #2)", () => {
  it("body berbahaya di-strip; RPC menerima umkm_id sesi dan tanpa kolom uang/status", async () => {
    let captured: Record<string, unknown> = {};
    db.rpcImpl.create_campaign_draft = (args) => {
      captured = args;
      return campaignRow({ id: "c_new" });
    };
    const body = createCampaignSchema.parse({
      title: " Promo Baru ",
      category: "kuliner",
      type: "ugc",
      description: "desk",
      budget: 100000,
      rewardPer1000Views: 5000,
      claimLimit: 10,
      status: "active",
      remainingBudget: 999999,
      spentAmount: 1,
      umkmId: OTHER,
      brief: { briefDetail: "d", contentAngle: "a", cta: "c", doAndDont: '{"do":["x"],"dont":[]}' },
      asset: { fileUrl: "https://drive.google.com/drive/folders/x" },
    });
    const result = await createCampaignDraft(ctx(), body);

    expect(result.campaign.id).toBe("c_new");
    expect(captured).toEqual({
      p_umkm_id: UID,
      p_campaign: {
        title: "Promo Baru",
        thumbnail_url: "",
        category: "kuliner",
        type: "ugc",
        description: "desk",
        budget: 100000,
        reward_per_1000_views: 5000,
        claim_limit: 10,
        submission_days: 7,
      },
      p_brief: {
        objective: "",
        content_angle: "a",
        cta: "c",
        brief_detail: "d",
        do_and_dont: { do: ["x"], dont: [] },
        generated_by_ai: false,
      },
      p_asset: { file_url: "https://drive.google.com/drive/folders/x", file_name: "" },
    });
  });

  it("thumbnail milik orang lain / host asing → 400 tanpa RPC", async () => {
    const body = createCampaignSchema.parse({
      title: "x", category: "k", type: "ugc", description: "", budget: 100000, rewardPer1000Views: 0, claimLimit: 1,
      thumbnailUrl: thumb(OTHER),
    });
    expect((await httpError(createCampaignDraft(ctx(), body))).status).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("validasi: budget di bawah minimum, tipe asing", () => {
    expect(createCampaignSchema.safeParse({ title: "x", category: "k", type: "ugc", description: "", budget: 100, rewardPer1000Views: 0, claimLimit: 1 }).success).toBe(false);
    expect(createCampaignSchema.safeParse({ title: "x", category: "k", type: "video", description: "", budget: 100000, rewardPer1000Views: 0, claimLimit: 1 }).success).toBe(false);
  });
});

describe("patchCampaignDraft", () => {
  it("allowlist: kolom uang/status di body diabaikan; update difilter pemilik+draft+dana", async () => {
    const body = patchDraftSchema.parse({ title: "Judul Baru", remainingBudget: 5, status: "active", spentAmount: 9 });
    const { campaign } = await patchCampaignDraft(ctx(), "c1", body);
    expect(campaign).toMatchObject({ title: "Judul Baru", status: "draft", remaining_budget: 0, spent_amount: 0 });
    const update = db.ops.find((o) => o.op === "update");
    expect(update?.values).toEqual({ title: "Judul Baru" });
    expect(update?.filters).toEqual({ id: "c1", umkm_id: UID, status: "draft", remaining_budget: 0 });
  });

  it("milik orang lain / bukan draft → 404 pesan lama", async () => {
    const other = await httpError(patchCampaignDraft(ctx(), "c_other", { title: "x" }));
    expect(other.status).toBe(404);
    expect(other.message).toBe("Campaign draft tidak ditemukan atau bukan milik Anda.");
    expect((await httpError(patchCampaignDraft(ctx(), "c_active", { title: "x" }))).status).toBe(404);
    expect(db.ops.some((o) => o.op === "update")).toBe(false);
  });

  it("sudah didanai: budget/reward/kuota/thumbnail tidak boleh berubah; nilai sama boleh", async () => {
    for (const body of [{ budget: 200000 }, { rewardPer1000Views: 1 }, { claimLimit: 99 }, { thumbnailUrl: thumb(UID, "baru.png") }]) {
      expect((await httpError(patchCampaignDraft(ctx(), "c_funded", body))).status).toBe(400);
    }
    const same = await patchCampaignDraft(ctx(), "c_funded", { budget: 100000, thumbnailUrl: thumb(UID, "lama.png"), title: "ok" });
    expect(same.campaign.title).toBe("ok");
  });

  it("thumbnail: URL lama (legacy) boleh dikirim ulang, URL baru wajib milik sendiri", async () => {
    db.tables.campaigns[0].thumbnail_url = "https://cloud.appwrite.io/v1/storage/buckets/campaign-assets/files/f/view";
    await expect(patchCampaignDraft(ctx(), "c1", { thumbnailUrl: "https://cloud.appwrite.io/v1/storage/buckets/campaign-assets/files/f/view" })).resolves.toBeTruthy();
    expect((await httpError(patchCampaignDraft(ctx(), "c1", { thumbnailUrl: thumb(OTHER) }))).status).toBe(400);
    const ok = await patchCampaignDraft(ctx(), "c1", { thumbnailUrl: thumb(UID) });
    expect(ok.campaign.thumbnail_url).toBe(thumb(UID));
  });

  it("body kosong → 400; perubahan bersamaan (dana masuk) → 409", async () => {
    expect((await httpError(patchCampaignDraft(ctx(), "c1", {}))).status).toBe(400);
    // Simulasikan webhook: baris berubah antara baca dan tulis.
    const original = db.from.bind(db);
    let reads = 0;
    db.from = (table: string) => {
      const q = original(table);
      if (table === "campaigns" && ++reads === 2) db.tables.campaigns[0].remaining_budget = 100000;
      return q;
    };
    expect((await httpError(patchCampaignDraft(ctx(), "c1", { title: "x" }))).status).toBe(409);
  });
});

describe("brief & aset", () => {
  it("PUT brief: upsert per campaign_id, doAndDont string → objek", async () => {
    const { brief } = await putCampaignBrief(ctx(), "c1", { briefDetail: "d", contentAngle: "a", cta: "c", doAndDont: '{"do":[],"dont":["y"]}' });
    expect(brief).toMatchObject({ campaign_id: "c1", do_and_dont: { do: [], dont: ["y"] }, objective: "" });
    await putCampaignBrief(ctx(), "c1", { briefDetail: "d2", contentAngle: "a", cta: "c", doAndDont: "rusak" });
    expect(db.tables.campaign_briefs).toHaveLength(1);
    expect(db.tables.campaign_briefs[0]).toMatchObject({ brief_detail: "d2", do_and_dont: null });
  });

  it("brief/aset hanya selama draft & milik sendiri", async () => {
    expect((await httpError(putCampaignBrief(ctx(), "c_active", { briefDetail: "", contentAngle: "", cta: "" }))).status).toBe(409);
    expect((await httpError(putCampaignBrief(ctx(), "c_other", { briefDetail: "", contentAngle: "", cta: "" }))).status).toBe(404);
    expect((await httpError(createCampaignAsset(ctx(), "c_active", { fileUrl: "https://x" }))).status).toBe(409);
    expect((await httpError(deleteCampaignAsset(ctx(), "c_other", "a_old"))).status).toBe(404);
  });

  it("POST aset replace mengganti aset TERLAMA; tanpa replace menambah", async () => {
    const replaced = await createCampaignAsset(ctx(), "c1", { fileUrl: "https://x/baru", replace: true });
    expect(replaced.asset).toMatchObject({ id: "a_old", file_url: "https://x/baru", file_name: "Folder Aset Eksternal" });
    const added = await createCampaignAsset(ctx(), "c1", { fileUrl: "https://x/3", fileName: "Drive" });
    expect(added.asset).toMatchObject({ campaign_id: "c1", source: "external", type: "link", file_name: "Drive" });
    expect(db.tables.campaign_assets).toHaveLength(3);
  });

  it("DELETE aset: harus anak campaign itu", async () => {
    await expect(deleteCampaignAsset(ctx(), "c1", "a_new")).resolves.toEqual({ ok: true });
    expect((await httpError(deleteCampaignAsset(ctx(), "c1", "tidak-ada"))).status).toBe(404);
  });
});

describe("deleteCampaignDraft", () => {
  it("hapus draft milik sendiri, kembalikan thumbnail lama", async () => {
    await expect(deleteCampaignDraft(ctx(), "c_funded")).resolves.toEqual({ ok: true, thumbnailUrl: thumb(UID, "lama.png") });
    expect(db.ops.at(-1)?.filters).toEqual({ id: "c_funded", umkm_id: UID, status: "draft" });
  });

  it("bukan draft → 409, milik orang lain → 404, FK pembayaran → 409", async () => {
    expect((await httpError(deleteCampaignDraft(ctx(), "c_active"))).status).toBe(409);
    expect((await httpError(deleteCampaignDraft(ctx(), "c_other"))).status).toBe(404);
    db.failWith.set("campaigns.delete", { code: "23503", message: "fk" });
    const fk = await httpError(deleteCampaignDraft(ctx(), "c1"));
    expect(fk.status).toBe(409);
    expect(fk.message).toContain("riwayat pembayaran");
  });
});

describe("patchCampaignStatus", () => {
  it("pause/resume: transisi bersyarat", async () => {
    expect((await patchCampaignStatus(ctx(), "c_active", { action: "pause" })).campaign.status).toBe("paused");
    expect((await patchCampaignStatus(ctx(), "c_paused", { action: "resume" })).campaign.status).toBe("active");
    const wrong = await httpError(patchCampaignStatus(ctx(), "c1", { action: "pause" }));
    expect([wrong.status, wrong.message]).toEqual([409, "Hanya campaign aktif yang bisa dijeda."]);
    expect((await httpError(patchCampaignStatus(ctx(), "c_other", { action: "resume" }))).status).toBe(404);
  });

  it.each([
    ["not_found", 404],
    ["not_draft", 409],
    ["underfunded", 409],
  ] as const)("publish: RPC %s → %i", async (result, status) => {
    db.rpcImpl.publish_campaign = () => result;
    expect((await httpError(patchCampaignStatus(ctx(), "c1", { action: "publish" }))).status).toBe(status);
  });

  it("publish sukses: RPC dengan umkm sesi, lalu baca ulang baris", async () => {
    db.rpcImpl.publish_campaign = (args) => {
      expect(args).toEqual({ p_umkm_id: UID, p_campaign_id: "c_funded" });
      db.tables.campaigns.find((c) => c.id === "c_funded")!.status = "active";
      return "published";
    };
    const { campaign } = await patchCampaignStatus(ctx(), "c_funded", { action: "publish" });
    expect(campaign.status).toBe("active");
  });
});
