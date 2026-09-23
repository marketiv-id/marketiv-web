// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  getSession: vi.fn(),
  updateProfile: vi.fn(),
  uploadLogo: vi.fn(),
  refreshAuth: vi.fn(),
  refreshIdentity: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));
vi.mock("lucide-react", () => ({
  Store: () => <span />,
  MapPin: () => <span />,
  Bell: () => <span />,
  Check: () => <span />,
  Building: () => <span />,
  Phone: () => <span />,
  Mail: () => <span />,
}));
vi.mock("@/services/umkm/umkm-dashboard.service", () => ({
  getUmkmSettingsProfile: mocks.getProfile,
  updateUmkmProfile: mocks.updateProfile,
  uploadUmkmLogo: mocks.uploadLogo,
}));
vi.mock("@/services/auth/session.service", () => ({ getSession: mocks.getSession }));
vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({ refresh: mocks.refreshAuth }),
}));
vi.mock("@/components/features/dashboard/UmkmIdentityContext", () => ({
  useUmkmIdentity: () => ({ refreshIdentity: mocks.refreshIdentity }),
}));
vi.mock("@/components/features/dashboard/UmkmDashboardChrome", () => ({
  UmkmDashboardChrome: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/features/umkm-dashboard/shared/UmkmPageWrapper", () => ({
  UmkmPageWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let root: Root | undefined;
let host: HTMLDivElement;

const validProfile = {
  docId: "profile-1",
  userId: "user-1",
  businessName: "Kopi Pagi",
  category: "kuliner",
  description: "Deskripsi usaha valid tepat dua puluh karakter.",
  city: "Bandung",
  address: "",
  tiktok: "",
  logoUrl: "",
  isProfileCompleted: false,
};

async function render() {
  const { PengaturanClient } = await import("../PengaturanClient");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<PengaturanClient />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

function field(label: string) {
  const element = [...document.querySelectorAll("label")].find((node) =>
    node.textContent?.includes(label)
  );
  return element?.parentElement?.querySelector("input, textarea, select") as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement;
}

async function setValue(label: string, value: string) {
  const node = field(label);
  const prototype =
    node instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : node instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function save() {
  const button = [...document.querySelectorAll("button")].find((node) =>
    node.textContent?.includes("Simpan Perubahan")
  ) as HTMLButtonElement;
  await act(async () => {
    button.click();
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.getProfile.mockResolvedValue({ success: true, data: validProfile });
  mocks.getSession.mockResolvedValue({
    success: true,
    data: { email: "umkm@example.test", phone: "08123456789" },
  });
  mocks.updateProfile.mockResolvedValue({ success: true, data: validProfile });
  mocks.refreshAuth.mockResolvedValue({ success: true, data: {} });
  mocks.refreshIdentity.mockResolvedValue(undefined);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

describe("PengaturanClient", () => {
  it.each([
    ["Deskripsi", "Deskripsi tidak boleh kosong."],
    ["Kota", "Kota tidak boleh kosong."],
  ])("tidak memanggil update service saat %s wajib kosong", async (label, message) => {
    await render();
    await setValue(label, "");
    await save();

    expect(mocks.updateProfile).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain(message);
  });

  it("tidak pernah mengirim phone kosong sebagai payload valid", async () => {
    await render();
    await setValue("Nomor WhatsApp", "");
    await save();

    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("memanggil update service sekali dengan phone tervalidasi", async () => {
    await render();
    await setValue("Nomor WhatsApp", " 08123456789 ");
    await save();

    expect(mocks.updateProfile).toHaveBeenCalledTimes(1);
    expect(mocks.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "08123456789" })
    );
  });
});
