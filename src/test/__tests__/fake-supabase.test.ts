import { describe, expect, it } from "vitest";

import { rowToDoc } from "@/services/shared/legacy-doc";
import { createFakeSupabase } from "@/test/fake-supabase";

describe("fake-supabase", () => {
  const db = createFakeSupabase({
    campaigns: [
      { id: "c1", umkm_id: "u1", status: "active", budget: 100, created_at: "2026-01-02" },
      { id: "c2", umkm_id: "u1", status: "draft", budget: 50, created_at: "2026-01-03" },
      { id: "c3", umkm_id: "u2", status: "active", budget: 70, created_at: "2026-01-01", deleted_at: null },
    ],
  });

  it("filter, order, range, count", async () => {
    const res = await db.from("campaigns").select("*", { count: "exact" }).eq("status", "active").order("created_at", { ascending: false }).range(0, 0);
    expect(res.data).toEqual([expect.objectContaining({ id: "c1" })]);
    expect(res.count).toBe(2);
    const head = await db.from("campaigns").select("id", { count: "exact", head: true }).in("umkm_id", ["u1"]);
    expect(head).toMatchObject({ data: null, count: 2 });
    const or = await db.from("campaigns").select("*").or("status.eq.draft,umkm_id.eq.u2").order("id");
    expect((or.data as { id: string }[]).map((r) => r.id)).toEqual(["c2", "c3"]);
    const single = await db.from("campaigns").select("*").eq("id", "nope").single();
    expect(single.error?.code).toBe("PGRST116");
    expect(db.calls.at(-1)).toEqual({ table: "campaigns", filters: ["id.eq.nope"], count: undefined });
  });

  it("rpc terdaftar / tidak", async () => {
    db.setRpc("sum_x", (args) => ({ total: Number(args.n) * 2 }));
    expect(await db.rpc("sum_x", { n: 2 })).toEqual({ data: { total: 4 }, error: null });
    expect((await db.rpc("nope")).error?.code).toBe("PGRST202");
  });
});

describe("rowToDoc", () => {
  it("membalik pemetaan Fase 2", () => {
    expect(
      rowToDoc("umkm_profiles", { id: "p1", user_id: "u1", business_name: "Toko", created_at: "t1", updated_at: "t2", city: "Bdg" }),
    ).toEqual({ $id: "p1", userId: "u1", businessName: "Toko", $createdAt: "t1", $updatedAt: "t2", city: "Bdg" });
    expect(rowToDoc("users", { id: "u1", created_at: "t" })).toMatchObject({ $id: "u1", userId: "u1", $createdAt: "t", createdAt: "t" });
    expect(rowToDoc("conversations", { id: "x", umkm_id: "u1" })).toMatchObject({ umkm_id: "u1" });
    expect(rowToDoc("campaign_briefs", { id: "b", materials: ["a"], do_and_dont: null })).toMatchObject({ materialsJson: '["a"]', doAndDont: null });
  });
});
