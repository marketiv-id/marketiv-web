// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("next/image", () => ({ default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} /> }));
vi.mock("lucide-react", () => ({ Store: () => <span /> }));
vi.mock("@/components/providers/AuthProvider", () => ({ useAuth: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/services/umkm/umkm-dashboard.service", () => ({
  getUmkmSettingsProfile: mocks.getProfile,
  updateUmkmProfile: mocks.updateProfile,
  uploadUmkmLogo: vi.fn(),
}));
vi.mock("@/lib/onboarding-skip", () => ({ markOnboardingSkipped: vi.fn() }));
vi.mock("../OnboardingShell", () => ({
  OnboardingShell: ({ children, footer, title }: { children: React.ReactNode; footer: React.ReactNode; title: string }) => <main><h1>{title}</h1>{children}{footer}</main>,
  OnboardingPrimaryButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
  OnboardingSecondaryButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));
vi.mock("@/components/auth/AuthField", () => ({
  AuthField: ({ label, name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => <label>{label}<input aria-label={label} name={name} {...props} /></label>,
  AuthSelectField: ({ label, name, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: Array<{ value: string; label: string }> }) => <label>{label}<select aria-label={label} name={name} {...props}><option value="" />{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>,
  AuthTextareaField: ({ label, name, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => <label>{label}<textarea aria-label={label} name={name} {...props} /></label>,
  AuthErrorBanner: ({ message }: { message: string }) => <p role="alert">{message}</p>,
}));

let root: Root | undefined;
let host: HTMLDivElement;

async function render(element: React.ReactNode) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(element));
}

async function setValue(label: string, value: string) {
  const node = document.querySelector(`[aria-label="${label}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  await act(async () => {
    const prototype = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function click(text: string) {
  const node = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes(text)) as HTMLButtonElement;
  await act(async () => node.click());
}

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.getProfile.mockResolvedValue({ success: true, data: null });
  mocks.updateProfile.mockResolvedValue({ success: true, data: {} });
  mocks.refresh.mockResolvedValue({ success: true, data: {} });
});

describe("UMKM profile onboarding", () => {
  it("prefills legacy business data and account WhatsApp", async () => {
    mocks.getProfile.mockResolvedValue({ success: true, data: {
      businessName: "Dapur Sehat Sukabumi", category: "kuliner", city: "Sukabumi", description: "Deskripsi usaha lama yang cukup panjang.", logoUrl: "", address: "Jl. Merdeka", tiktok: "@dapur",
    } });
    const { UmkmOnboarding } = await import("../UmkmOnboarding");
    await render(<UmkmOnboarding initialPhone="08123456789" />);

    expect((document.querySelector('[aria-label="Nama Usaha"]') as HTMLInputElement).value).toBe("Dapur Sehat Sukabumi");
    expect((document.querySelector('[aria-label="Kategori Usaha"]') as HTMLSelectElement).value).toBe("kuliner");
    expect((document.querySelector('[aria-label="Kota"]') as HTMLInputElement).value).toBe("Sukabumi");
    await click("Lanjut");
    await click("Lanjut");
    expect((document.querySelector('[aria-label="Nomor WhatsApp"]') as HTMLInputElement).value).toBe("08123456789");
  });

  it("accepts new UMKM without legacy business values and persists Step 1 identity", async () => {
    const { UmkmOnboarding } = await import("../UmkmOnboarding");
    await render(<UmkmOnboarding initialPhone="08123456789" />);
    expect((document.querySelector('[aria-label="Nama Usaha"]') as HTMLInputElement).value).toBe("");
    expect((document.querySelector('[aria-label="Kategori Usaha"]') as HTMLSelectElement).value).toBe("");
    await setValue("Nama Usaha", "Usaha Baru");
    await setValue("Kategori Usaha", "kuliner");
    await setValue("Kota", "Sukabumi");
    await click("Lanjut");
    await setValue("Deskripsi Usaha", "Deskripsi usaha baru yang cukup panjang.");
    await click("Lanjut");
    await setValue("Nomor WhatsApp", "08123456789");
    await click("Selesaikan Profil");

    expect(mocks.updateProfile).toHaveBeenCalledWith(expect.objectContaining({
      businessName: "Usaha Baru", category: "kuliner", city: "Sukabumi", phone: "08123456789",
    }));
    expect(mocks.updateProfile).not.toHaveBeenCalledWith(expect.objectContaining({
      isProfileCompleted: true,
    }));
    expect(mocks.replace).toHaveBeenCalledWith("/dashboard/umkm");
  });

  it("preserves skip destination without profile write", async () => {
    const { UmkmOnboarding } = await import("../UmkmOnboarding");
    await render(<UmkmOnboarding />);
    await click("Lewati dulu");

    expect(mocks.updateProfile).not.toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledWith("/dashboard/umkm");
  });
});
