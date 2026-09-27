// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimCampaign: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({ user: { userId: "user_1", role: "creator", email: "kreator@example.com" } }),
}));
vi.mock("@/services/creator/creator-dashboard.service", () => ({
  claimCampaign: mocks.claimCampaign,
}));

let root: Root | undefined;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

async function renderDashboard() {
  const [
    { CreatorDashboardView },
    { mockCreatorProfile, mockCreatorMetrics, mockCreatorActiveWorks, mockCreatorActivities, mockCreatorJobs },
  ] = await Promise.all([
    import("../CreatorDashboardView"),
    import("@/mocks/creator-dashboard.mock"),
  ]);

  await act(async () => {
    root?.render(
      <CreatorDashboardView
        profile={mockCreatorProfile}
        metrics={mockCreatorMetrics}
        activeWorks={mockCreatorActiveWorks}
        activities={mockCreatorActivities}
        recommendedJobs={mockCreatorJobs.slice(0, 2)}
        onRefresh={async () => {}}
      />
    );
  });
}

async function waitFor(assertion: () => void, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    await act(async () => {});
    try {
      assertion();
      return;
    } catch (err) {
      if (Date.now() > deadline) throw err;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

function claimButtons() {
  return [...host.querySelectorAll("button")].filter(
    (button) => button.textContent?.includes("Klaim Lowongan") || button.textContent?.includes("Mengklaim")
  );
}

describe("CreatorDashboardView — state proses klaim", { timeout: 20000 }, () => {
  it("menonaktifkan tombol dan menampilkan label proses selama klaim berjalan", async () => {
    let releaseClaim: (value: { success: boolean; data: null }) => void = () => {};
    mocks.claimCampaign.mockImplementation(
      () => new Promise<{ success: boolean; data: null }>((resolve) => { releaseClaim = resolve; })
    );

    await renderDashboard();
    await waitFor(() => expect(claimButtons().length).toBeGreaterThan(0));

    await act(async () => {
      claimButtons()[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      const pending = claimButtons()[0];
      expect(pending.textContent).toContain("Mengklaim");
      expect((pending as HTMLButtonElement).disabled).toBe(true);
    });

    await act(async () => {
      releaseClaim({ success: true, data: null });
    });

    await waitFor(() => {
      const settled = claimButtons()[0];
      expect(settled.textContent).toContain("Klaim Lowongan");
      expect((settled as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
