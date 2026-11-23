import { describe, expect, it } from "vitest";

import { toAdminFileUrl } from "../file-url";
import { toQueueItem } from "../ratecard-deliverable-queue";

describe("toAdminFileUrl", () => {
  it("URL file privat app user → route admin same-origin", () => {
    expect(toAdminFileUrl("https://app.marketiv.test/api/files/abc-123/url?redirect=1")).toBe(
      "/api/admin/files/abc-123/url?redirect=1",
    );
    expect(toAdminFileUrl("http://localhost:3000/api/files/f%201/url")).toBe("/api/admin/files/f%201/url?redirect=1");
  });

  it.each([
    "https://drive.google.com/file/d/xyz/view",
    "https://cloud.appwrite.io/v1/storage/buckets/b/files/f/view?project=p",
    "https://app.test/api/files/abc/other",
    "javascript:alert(1)",
    "bukan url",
    "",
  ])("URL lain dibiarkan: %s", (url) => {
    expect(toAdminFileUrl(url)).toBe(url);
  });

  it("antrean validasi rate card memakai URL admin", () => {
    const item = toQueueItem({
      deliverable_id: "d1", order_id: "o1", version: 1, source: "storage",
      file_url: "https://app.test/api/files/uf-1/url?redirect=1", notes: null, submitted_at: "2026-01-01T00:00:00+00:00",
      creator_id: "c", creator_display_name: null, umkm_id: "u", umkm_business_name: null, package_name_snapshot: null, amount: 0,
    });
    expect(item.evidenceUrl).toBe("/api/admin/files/uf-1/url?redirect=1");
  });
});
