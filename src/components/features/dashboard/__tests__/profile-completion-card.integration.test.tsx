// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatorMetric, CreatorProfile } from "@/types/creator-dashboard";

const mocks = vi.hoisted(() => ({
  auth: { user: null as unknown },
  getOverview: vi.fn(),
  push: vi.fn(),
  claimCampaign: vi.fn(),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => mocks.auth,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({ default: () => <span data-testid="next-image" /> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/umkm/umkm-dashboard.service", () => ({ getOverview: mocks.getOverview }));
vi.mock("@/services/creator/creator-dashboard.service", () => ({ claimCampaign: mocks.claimCampaign }));
vi.mock("@/components/features/dashboard/UmkmDashboardChrome", () => ({
  UmkmDashboardChrome: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/features/umkm-dashboard/shared/UmkmPageWrapper", () => ({
  UmkmPageWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/features/umkm-dashboard/overview/HeroOverview", () => ({
  HeroOverview: () => <section data-testid="umkm-hero" />,
}));
vi.mock("@/components/features/umkm-dashboard/overview/CampaignSection", () => ({
  CampaignSection: () => <section data-testid="umkm-campaigns" />,
}));
vi.mock("@/components/features/umkm-dashboard/overview/ActivityTimeline", () => ({
  ActivityTimeline: () => <section data-testid="umkm-activity" />,
}));
vi.mock("@/components/features/umkm-dashboard/overview/FinancialOverview", () => ({
  FinancialOverview: () => <section />,
}));
vi.mock("@/components/features/umkm-dashboard/overview/InsightSection", () => ({
  InsightSection: () => <section />,
}));
vi.mock("@/components/features/umkm-dashboard/overview/QuickActions", () => ({
  QuickActions: () => <section />,
}));
vi.mock("@/components/features/umkm-dashboard/overview/UmkmDashboardTour", () => ({
  UmkmDashboardTour: () => null,
}));
vi.mock("@/lib/onboarding/umkm-dashboard-tour-flow", () => ({
  navigateUmkmCampaignForOnboarding: vi.fn(),
}));
vi.mock("@/components/features/dashboard/shared", () => ({
  DashboardBadge: () => <span />,
  DashboardStateCard: ({ title }: { title: string }) => <section>{title}</section>,
}));

const umkmUser = (isProfileCompleted: boolean) => ({
  userId: "umkm-1",
  email: "umkm@example.test",
  role: "umkm" as const,
  status: "active" as const,
  emailVerified: true,
  isProfileCompleted,
});

const creatorUser = (isProfileCompleted: boolean) => ({
  userId: "creator-1",
  email: "creator@example.test",
  role: "creator" as const,
  status: "active" as const,
  emailVerified: true,
  isProfileCompleted,
});

const creatorProfile: CreatorProfile = {
  id: "creator-profile-1",
  name: "Kreator Test",
  username: "kreator-test",
  avatarUrl: "",
  niche: "kuliner",
  bio: "",
  location: "Bandung",
  followers: 0,
  startingPrice: 0,
  rating: 0,
  completedJobs: 0,
  engagementRate: 0,
  isVerified: false,
  isOnboarded: false,
};

const creatorMetrics: CreatorMetric = {
  availableJobsCount: 0,
  activeJobsCount: 0,
  pendingSubmissionsCount: 0,
  balance: 0,
  pendingPayouts: 0,
  validatedViewsCount: 0,
  activeRateCardsCount: 0,
  negotiationOrdersCount: 0,
  escrowBalance: 0,
};

let root: Root | undefined;
let host: HTMLDivElement;

async function render(element: React.ReactNode) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(element);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderUmkm(isProfileCompleted: boolean) {
  const { UmkmOverviewClient } = await import("@/components/features/umkm-dashboard/overview/UmkmOverviewClient");
  mocks.auth.user = umkmUser(isProfileCompleted);
  await render(<UmkmOverviewClient />);
}

async function renderCreator(isProfileCompleted: boolean) {
  const { CreatorDashboardView } = await import("@/components/features/creator-dashboard/CreatorDashboardView");
  mocks.auth.user = creatorUser(isProfileCompleted);
  await render(
    <CreatorDashboardView
      profile={creatorProfile}
      metrics={creatorMetrics}
      activeWorks={[]}
      activities={[]}
      recommendedJobs={[]}
      onRefresh={async () => undefined}
    />
  );
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.auth.user = null;
  mocks.getOverview.mockResolvedValue({
    success: true,
    data: { businessName: "Usaha Test", campaigns: [], activities: [], insights: [] },
  });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("Profile completion card on dashboards", () => {
  it("shows UMKM reminder with Pengaturan CTA when profile is incomplete", async () => {
    await renderUmkm(false);

    expect(document.body.textContent).toContain("Profil Belum Lengkap");
    expect(document.querySelector('a[href="/dashboard/umkm/pengaturan"]')?.textContent).toContain("Lengkapi Profil");
  });

  it("hides UMKM reminder when profile is complete", async () => {
    await renderUmkm(true);

    expect(document.body.textContent).not.toContain("Profil Belum Lengkap");
  });

  it("shows Creator reminder with Settings CTA when profile is incomplete", async () => {
    await renderCreator(false);

    expect(document.body.textContent).toContain("Profil Belum Lengkap");
    expect(document.querySelector('a[href="/dashboard/kreator/settings"]')?.textContent).toContain("Lengkapi Profil");
  });

  it("hides Creator reminder when profile is complete", async () => {
    await renderCreator(true);

    expect(document.body.textContent).not.toContain("Profil Belum Lengkap");
  });
});
