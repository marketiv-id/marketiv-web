// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/auth/session.service", () => ({
  getSession: vi.fn(async () => ({ success: true, data: { email: "kreator@example.com" } })),
}));
vi.mock("../CreatorIdentityContext", () => ({
  useCreatorIdentity: () => ({ refreshIdentity: vi.fn() }),
}));
vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({ refresh: vi.fn(), user: { userId: "user_1", role: "creator" } }),
}));

let root: Root | undefined;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // Beberapa komponen memanggil matchMedia; jsdom tidak menyediakannya.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("Panel notifikasi pengaturan kreator", { timeout: 20000 }, () => {
  it("tidak menampilkan tombol simpan yang tidak bisa menyimpan apa pun", async () => {
    const [{ SettingsView }, { mockCreatorProfile, mockCreatorPortfolioItems }] = await Promise.all([
      import("../SettingsView"),
      import("@/mocks/creator-dashboard.mock"),
    ]);

    await act(async () => {
      root?.render(
        <SettingsView initialProfile={mockCreatorProfile} initialPortfolio={mockCreatorPortfolioItems} />
      );
    });

    await act(async () => {
      [...host.querySelectorAll("button")]
        .find((button) => button.textContent?.includes("Notifikasi"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const text = host.textContent ?? "";
    expect(text).toContain("Fitur notifikasi akan segera hadir.");
    expect(text).not.toContain("Simpan Preferensi");
  });
});
