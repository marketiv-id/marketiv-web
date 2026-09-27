// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({ user: { userId: "user_1", role: "creator", email: "kreator@example.com" } }),
}));
vi.mock("@/services/creator/creator-dashboard.service", () => ({
  claimCampaign: vi.fn(async () => ({ success: true, data: null })),
}));

let root: Root | undefined;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
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

  return mockCreatorJobs;
}

describe("CreatorDashboardView — navigasi & state klaim", { timeout: 20000 }, () => {
  it("tautan Detail pada kartu rekomendasi mengarah ke detail job", async () => {
    const jobs = await renderDashboard();
    const expected = `/dashboard/kreator/job-pool/${jobs[0].id}`;

    expect(host.querySelector(`a[href='${expected}']`)).not.toBeNull();
  });
});
