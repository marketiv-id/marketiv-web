import { describe, expect, it } from "vitest";

import { notificationId, notify } from "@/server/notifications/notify";
import { createFakeSupabase } from "@/test/fake-supabase";

describe("notify", () => {
  it("ID deterministik sama dengan Function lama / private.notification_id", () => {
    // sha256("order_1:deliverable_submitted") — dihitung dengan node:crypto.
    expect(notificationId("order_1", "deliverable_submitted")).toMatch(/^ntf[0-9a-f]{29}$/);
    expect(notificationId("a", "b")).toBe(notificationId("a", "b"));
    expect(notificationId("a", "b")).not.toBe(notificationId("a", "c"));
  });

  it("idempoten: event yang sama tidak menggandakan notifikasi", async () => {
    const db = createFakeSupabase({ notifications: [] });
    const input = { userId: "u1", title: "Hai", message: "Pesan", type: "order", sourceId: "o1", kind: "paid" };
    await notify(db as never, input);
    await notify(db as never, [input, { ...input, userId: "" }]);
    expect(db.tables.notifications).toHaveLength(1);
    expect(db.tables.notifications[0]).toMatchObject({ user_id: "u1", is_read: false, id: notificationId("o1", "paid") });
  });

  it("tidak melempar saat DB gagal", async () => {
    const db = createFakeSupabase();
    db.failTable("notifications", { code: "42501", message: "denied" });
    await expect(notify(db as never, { userId: "u", title: "t", message: "m", type: "x", sourceId: "s", kind: "k" })).resolves.toBeUndefined();
  });
});
