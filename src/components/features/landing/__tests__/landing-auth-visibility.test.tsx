// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as unknown,
    loading: false,
  },
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => mocks.auth,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// jsdom has no matchMedia; GSAP queries it when ScrollTrigger registers. "matches: false" behaves like reduced motion.
if (!window.matchMedia) {
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
}

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const umkmUser = {
  userId: "umkm-1",
  email: "umkm@example.com",
  role: "umkm" as const,
  status: "active" as const,
  emailVerified: true,
  isProfileCompleted: true,
};

const creatorUser = {
  userId: "creator-1",
  email: "creator@example.com",
  role: "creator" as const,
  status: "active" as const,
  emailVerified: true,
  isProfileCompleted: true,
};

let root: Root | undefined;
let host: HTMLDivElement;

function mockAuth(state: { user: unknown; loading: boolean }) {
  mocks.auth.user = state.user;
  mocks.auth.loading = state.loading;
}

async function render(element: React.ReactNode) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(element));
}

async function click(selector: string) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  await act(async () => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_ADMIN_APP_URL", "https://admin.example.test");
  vi.clearAllMocks();
  mockAuth({ user: null, loading: false });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  vi.unstubAllEnvs();
});

describe("auth-aware landing actions", () => {
  it("shows guest auth links on desktop and mobile", async () => {
    const { Navbar } = await import("@/components/layouts/Navbar");
    mockAuth({ user: null, loading: false });
    await render(<Navbar />);

    // The desktop bar and the mobile burger menu each carry one login and one register link.
    expect(document.querySelectorAll('a[href="/login"]')).toHaveLength(2);
    expect(document.querySelectorAll('a[href="/register"]')).toHaveLength(2);
    await click('button[aria-label="Buka menu navigasi"]');
    expect(document.querySelector('button[aria-label="Tutup menu navigasi"]')).not.toBeNull();
  });

  it("shows UMKM dashboard on desktop and mobile", async () => {
    const { Navbar } = await import("@/components/layouts/Navbar");
    mockAuth({ user: umkmUser, loading: false });
    await render(<Navbar />);

    const dashboardLinks = document.querySelectorAll('a[href="/dashboard/umkm"]');
    expect(dashboardLinks).toHaveLength(2);
    expect(document.querySelector('a[href="/register?role=umkm"]')).toBeNull();
    expect(document.querySelectorAll('a[href="/login"]')).toHaveLength(0);
    expect(document.querySelectorAll('a[href="/register"]')).toHaveLength(0);
  });

  it("shows Creator dashboard on desktop and mobile", async () => {
    const { Navbar } = await import("@/components/layouts/Navbar");
    mockAuth({ user: creatorUser, loading: false });
    await render(<Navbar />);

    expect(document.querySelectorAll('a[href="/dashboard/kreator"]')).toHaveLength(2);
    expect(document.querySelectorAll('a[href="/login"]')).toHaveLength(0);
    expect(document.querySelectorAll('a[href="/register"]')).toHaveLength(0);
  });

  it("does not show auth links while session is loading", async () => {
    const { Navbar } = await import("@/components/layouts/Navbar");
    mockAuth({ user: null, loading: true });
    await render(<Navbar />);

    expect(document.querySelectorAll('a[href="/login"]')).toHaveLength(0);
    expect(document.querySelectorAll('a[href="/register"]')).toHaveLength(0);
  });

  it("keeps registration CTAs for guests", async () => {
    const { LANDING_CONTENT } = await import("@/data/content");
    const { LandingHeroActions } = await import("../LandingHeroActions");
    mockAuth({ user: null, loading: false });
    await render(<LandingHeroActions {...LANDING_CONTENT.hero} />);

    expect(document.querySelector('a[href="/register?role=umkm"]')).not.toBeNull();
    expect(document.querySelector('a[href="/register?role=creator"]')).not.toBeNull();
    expect(document.body.textContent).toContain(LANDING_CONTENT.hero.ctaUmkm);
    expect(document.body.textContent).toContain(LANDING_CONTENT.hero.ctaCreator);
  });

  it("shows dashboard CTA for authenticated Creator", async () => {
    const { LANDING_CONTENT } = await import("@/data/content");
    const { LandingHeroActions } = await import("../LandingHeroActions");
    mockAuth({ user: creatorUser, loading: false });
    await render(<LandingHeroActions {...LANDING_CONTENT.hero} />);

    expect(document.querySelector('a[href="/dashboard/kreator"]')).not.toBeNull();
    expect(document.querySelector('a[href="/register?role=umkm"]')).toBeNull();
    expect(document.querySelector('a[href="/register?role=creator"]')).toBeNull();
    expect(document.body.textContent).toContain("Buka Dasbor");
  });

  it("does not show hero auth CTAs while session is loading", async () => {
    const { LANDING_CONTENT } = await import("@/data/content");
    const { LandingHeroActions } = await import("../LandingHeroActions");
    mockAuth({ user: null, loading: true });
    await render(<LandingHeroActions {...LANDING_CONTENT.hero} />);

    expect(document.querySelector('a[href="/register?role=umkm"]')).toBeNull();
    expect(document.querySelector('a[href="/register?role=creator"]')).toBeNull();
    expect(document.querySelector('a[href^="/dashboard/"]')).toBeNull();
  });
});
