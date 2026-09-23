"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  AuthField,
  AuthSelectField,
  AuthTextareaField,
  AuthErrorBanner,
} from "@/components/auth/AuthField";
import {
  OnboardingShell,
  OnboardingPrimaryButton,
  OnboardingSecondaryButton,
} from "./OnboardingShell";
import {
  updateUmkmProfile,
  uploadUmkmLogo,
  getUmkmSettingsProfile,
} from "@/services/umkm/umkm-dashboard.service";
import { umkmOnboardingSchema } from "@/lib/validations/profile.schema";
import { parseOrErrors } from "@/lib/validations/to-field-errors";
import { markOnboardingSkipped } from "@/lib/onboarding-skip";
import { dashboardByRole } from "@/lib/constants/routes";
import { NICHE_OPTIONS } from "@/components/features/umkm-dashboard/create-campaign/create-campaign.constants";

const STEPS = ["Identitas Usaha", "Profil Usaha", "Kontak"] as const;

/** Sama dengan RegisterUmkmForm — nilainya harus cocok dengan campaigns.category. */
const CATEGORY_OPTIONS = NICHE_OPTIONS.map((o) => ({
  value: o.id,
  label: `${o.label} — ${o.desc}`,
}));

export function UmkmOnboarding({
  initialName,
  initialPhone,
}: {
  initialName?: string;
  initialPhone?: string;
}) {
  const router = useRouter();
  const { refresh } = useAuth();

  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState(initialName ?? "");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [phone, setPhone] = useState(initialPhone ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);

  // Data UMKM legacy milik umkm_profiles. Kegagalan baca tidak menghalangi
  // akun baru, yang valid memiliki identitas bisnis kosong sebelum onboarding.
  useEffect(() => {
    let cancelled = false;
    void getUmkmSettingsProfile().then((res) => {
      if (cancelled || !res.success || !res.data) return;
      const profile = res.data;
      setBusinessName((current) => current || profile.businessName);
      setCategory((current) => current || profile.category);
      setCity((current) => current || profile.city);
      setDescription((current) => current || profile.description);
      setLogoUrl((current) => current || profile.logoUrl);
      setAddress((current) => current || profile.address);
      setTiktok((current) => current || profile.tiktok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const formValues = () => ({
    businessName: businessName.trim(),
    category,
    city: city.trim(),
    description: description.trim(),
    phone: phone.trim(),
    address: address.trim(),
    tiktok: tiktok.trim(),
  });

  function validateStep(target: number): boolean {
    const parsed = parseOrErrors(umkmOnboardingSchema, formValues());
    const all = parsed.ok ? {} : parsed.errors;
    const scope =
      target === 1
        ? ["businessName", "category", "city"]
        : target === 2
          ? ["description"]
          : ["phone", "address", "tiktok"];

    const scoped: Record<string, string> = {};
    for (const key of scope) {
      if (all[key]) scoped[key] = all[key];
    }

    setErrors(scoped);
    return Object.keys(scoped).length === 0;
  }

  function handleNext() {
    setBanner(null);
    if (validateStep(step)) setStep((s) => s + 1);
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBanner(null);
    setUploading(true);
    const res = await uploadUmkmLogo(file);
    setUploading(false);

    if (!res.success || !res.data) {
      setBanner(res.error ?? "Gagal mengunggah logo.");
      return;
    }
    setLogoUrl(res.data);
  }

  async function handleSubmit() {
    setBanner(null);
    if (!validateStep(3)) return;

    const parsed = parseOrErrors(umkmOnboardingSchema, formValues());
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setStep(1);
      return;
    }

    // phone dikirim ke Function `update-profile` — mendarat di users.phone dan
    // ikut evaluasi completion server-side. Client TIDAK menulis isProfileCompleted.
    const profilePayload = {
      ...parsed.data,
      ...(logoUrl ? { logoUrl } : {}),
    };

    setPending(true);
    const res = await updateUmkmProfile(profilePayload);

    if (!res.success) {
      setPending(false);
      setBanner(
        res.code === "auth"
          ? "Sesi berakhir, silakan login kembali."
          : res.error ?? "Gagal menyimpan profil. Coba lagi."
      );
      return;
    }

    setPending(false);

    await refresh();
    router.replace(dashboardByRole.umkm);
  }

  function handleSkip() {
    markOnboardingSkipped();
    router.replace(dashboardByRole.umkm);
  }

  const busy = pending || uploading;

  return (
    <OnboardingShell
      title="Lengkapi Profil Usaha"
      description="Lengkapi informasi dasar usaha Anda agar profil dan campaign dapat ditampilkan dengan informasi yang tepat."
      steps={STEPS}
      currentStep={step}
      footer={
        <div className="space-y-3">
          {step < STEPS.length ? (
            <OnboardingPrimaryButton type="button" onClick={handleNext} disabled={busy}>
              Lanjut
            </OnboardingPrimaryButton>
          ) : (
            <OnboardingPrimaryButton type="button" onClick={handleSubmit} disabled={busy}>
              {pending ? "Menyimpan…" : "Selesaikan Profil"}
            </OnboardingPrimaryButton>
          )}

          {step > 1 ? (
            <OnboardingSecondaryButton
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={busy}
            >
              Kembali
            </OnboardingSecondaryButton>
          ) : (
            <OnboardingSecondaryButton type="button" onClick={handleSkip} disabled={busy}>
              Lewati dulu
            </OnboardingSecondaryButton>
          )}

          <p className="pt-1 text-center text-[0.72rem] font-semibold leading-relaxed text-text-muted">
            Kalau dilewati, Anda tetap bisa masuk dashboard dan melengkapinya nanti
            lewat Pengaturan.
          </p>
        </div>
      }
    >
      {banner && (
        <div className="mb-4">
          <AuthErrorBanner message={banner} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <AuthField
            label="Nama Usaha"
            name="businessName"
            autoComplete="organization"
            placeholder="Dapur Sehat Sukabumi"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            error={errors.businessName}
            disabled={busy}
          />
          <AuthSelectField
            label="Kategori Usaha"
            name="category"
            placeholder="Pilih kategori…"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            error={errors.category}
            disabled={busy}
          />
          <AuthField
            label="Kota"
            name="city"
            autoComplete="address-level2"
            placeholder="Sukabumi"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            error={errors.city}
            disabled={busy}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <AuthTextareaField
            label="Deskripsi Usaha"
            name="description"
            rows={4}
            placeholder="Jelaskan produk dan apa yang membuat usaha Anda menarik untuk dipromosikan."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={errors.description}
            hint="Dibaca kreator sebelum menerima campaign atau penawaran Anda."
            disabled={busy}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-[0.74rem] font-extrabold text-ink-950">
              Logo Usaha <span className="font-semibold text-text-muted">(opsional)</span>
            </span>
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-orange-200/80 bg-orange-50/50 shadow-inner">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="Pratinjau logo usaha"
                    width={64}
                    height={64}
                    className="h-16 w-16 object-cover"
                    unoptimized
                  />
                ) : (
                  <Store size={22} className="text-orange-500" aria-hidden />
                )}
              </div>
              <label className="min-h-[44px] flex-1 cursor-pointer rounded-full border border-neutral-200/80 bg-white px-5 py-2.5 text-center text-xs sm:text-sm font-extrabold text-ink-950 shadow-2xs hover:bg-neutral-50 transition-all flex items-center justify-center">
                {uploading ? "Mengunggah…" : logoUrl ? "Ganti logo" : "Pilih logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleLogoChange}
                  disabled={busy}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <AuthField
            label="Nomor WhatsApp"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
            hint="Untuk konfirmasi pesanan dan info pencairan Anda. Format: 08xx atau 628xx."
            disabled={busy}
          />
          <AuthField
            label="Alamat (opsional)"
            name="address"
            autoComplete="street-address"
            placeholder="Jl. Merdeka No. 12"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            error={errors.address}
            disabled={busy}
          />
          <AuthField
            label="TikTok Usaha (opsional)"
            name="tiktok"
            placeholder="@dapursehat"
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
            error={errors.tiktok}
            hint="Membantu kreator memahami gaya konten yang Anda inginkan."
            disabled={busy}
          />
        </div>
      )}
    </OnboardingShell>
  );
}
