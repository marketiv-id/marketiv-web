/**
 * Fase 5 — baca bersama (deliverable, revisi, notifikasi) dari Supabase.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

const mocks = vi.hoisted(() => ({
  db: null as unknown as FakeSupabase,
  userId: "creator-1" as string | null,
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => mocks.db }));
vi.mock("@/services/auth/session.service", () => ({
  getSession: vi.fn(),
  getCurrentUserId: async () => mocks.userId,
}));
vi.mock("@/lib/appwrite/databases", () => ({ databases: {} }));
vi.mock("@/lib/appwrite/config", () => ({ appwriteConfig: { databaseId: "db" } }));
vi.mock("@/lib/appwrite/functions", () => ({ executeFunction: vi.fn(), FUNCTION_IDS: {} }));

import { getDeliverablesInAppwrite, getRevisionsInAppwrite } from "../deliverable-appwrite.service";
import { getNotificationsFromAppwrite } from "../notification-appwrite.service";

const filtersOf = (table: string) => mocks.db.calls.filter((c) => c.table === table).map((c) => c.filters);

describe("deliverable & revisi", () => {
  beforeEach(() => {
    mocks.userId = "creator-1";
    mocks.db = createFakeSupabase({
      orders: [{ id: "ord-1", umkm_id: "umkm-1", creator_id: "creator-1", status: "in_progress" }],
      deliverables: [
        { id: "d-2", order_id: "ord-1", source: "upload", file_url: "https://f/2", file_id: "uf-2", notes: null, version: 2, status: "submitted", created_at: "2026-11-02T00:00:00+00:00" },
        { id: "d-1", order_id: "ord-1", source: "", file_url: "https://f/1", file_id: null, notes: "awal", version: 1, status: "revision_requested", created_at: "2026-11-01T00:00:00+00:00" },
        { id: "d-x", order_id: "ord-lain", version: 1, created_at: "2026-11-01T00:00:00+00:00" },
      ],
      revisions: [
        { id: "r-1", order_id: "ord-1", requested_by: "umkm-1", message: "ganti musik", status: "open", created_at: "2026-11-01T12:00:00+00:00" },
        { id: "r-0", order_id: "ord-1", requested_by: "umkm-1", message: "lama", status: "", created_at: "2026-10-31T12:00:00+00:00" },
      ],
    });
  });

  it("riwayat deliverable versi menaik, DTO identik", async () => {
    const result = await getDeliverablesInAppwrite("ord-1");
    expect(result.data).toEqual([
      { id: "d-1", orderId: "ord-1", source: "external_url", fileUrl: "https://f/1", fileId: undefined, notes: "awal", version: 1, status: "revision_requested", createdAt: "2026-11-01T00:00:00+00:00" },
      { id: "d-2", orderId: "ord-1", source: "upload", fileUrl: "https://f/2", fileId: "uf-2", notes: undefined, version: 2, status: "submitted", createdAt: "2026-11-02T00:00:00+00:00" },
    ]);
    expect(filtersOf("deliverables")).toEqual([["order_id.eq.ord-1"]]);
  });

  it("riwayat revisi terbaru dulu", async () => {
    const result = await getRevisionsInAppwrite("ord-1");
    expect(result.data).toEqual([
      { id: "r-1", orderId: "ord-1", requestedBy: "umkm-1", message: "ganti musik", status: "open", createdAt: "2026-11-01T12:00:00+00:00" },
      { id: "r-0", orderId: "ord-1", requestedBy: "umkm-1", message: "lama", status: "open", createdAt: "2026-10-31T12:00:00+00:00" },
    ]);
  });

  it("bukan pihak order → not_found tanpa membaca deliverable", async () => {
    mocks.userId = "orang-lain";
    expect(await getDeliverablesInAppwrite("ord-1")).toMatchObject({ success: false, code: "not_found", data: [] });
    expect(await getRevisionsInAppwrite("ord-1")).toMatchObject({ success: false, code: "not_found" });
    expect(filtersOf("deliverables")).toEqual([]);
    expect(filtersOf("revisions")).toEqual([]);
  });

  it("order tidak terbaca (RLS) → not_found", async () => {
    expect(await getDeliverablesInAppwrite("ord-tidak-ada")).toMatchObject({ success: false, code: "not_found" });
  });
});

describe("notifikasi", () => {
  it("hanya milik sendiri, terbaru dulu, peta tipe & aksi per role", async () => {
    mocks.userId = "umkm-1";
    mocks.db = createFakeSupabase({
      notifications: [
        { id: "n-1", user_id: "umkm-1", type: "order_completed", title: "Selesai", message: "Order selesai", is_read: true, created_at: "2026-11-01T00:00:00+00:00" },
        { id: "n-2", user_id: "umkm-1", type: "jenis_baru", title: "Info", message: "Halo", is_read: false, created_at: "2026-11-02T00:00:00+00:00" },
        { id: "n-x", user_id: "creator-1", type: "reward", title: "x", message: "x", is_read: false, created_at: "2026-11-03T00:00:00+00:00" },
      ],
    });
    const result = await getNotificationsFromAppwrite("umkm");
    expect(result.data).toEqual([
      { id: "n-2", type: "sistem", title: "Info", message: "Halo", timestamp: "2026-11-02T00:00:00+00:00", isRead: false, actionLabel: undefined, actionHref: undefined },
      { id: "n-1", type: "keuangan", title: "Selesai", message: "Order selesai", timestamp: "2026-11-01T00:00:00+00:00", isRead: true, actionLabel: "Lihat Keuangan", actionHref: "/dashboard/umkm/keuangan" },
    ]);
    expect(filtersOf("notifications")).toEqual([["user_id.eq.umkm-1"]]);
  });

  it("paginasi: membaca semua halaman (>100)", async () => {
    mocks.userId = "u";
    const rows = Array.from({ length: 205 }, (_, i) => ({
      id: `n-${String(i).padStart(3, "0")}`,
      user_id: "u",
      type: "reward",
      title: "t",
      message: "m",
      is_read: false,
      // sebagian created_at sama: urutan tie-break id tetap stabil
      created_at: `2026-11-01T00:00:${String(Math.floor(i / 3) % 60).padStart(2, "0")}+00:00`,
    }));
    mocks.db = createFakeSupabase({ notifications: rows });
    const result = await getNotificationsFromAppwrite("creator");
    expect(result.data).toHaveLength(205);
    expect(new Set(result.data.map((n) => n.id)).size).toBe(205);
    expect(filtersOf("notifications")).toHaveLength(3);
  });
});
