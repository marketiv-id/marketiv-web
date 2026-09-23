"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
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
  updateCreatorProfile,
  uploadCreatorAvatar,
  upsertCreatorSocialAccount,
} from "@/services/creator/creator-dashboard.service";
import {
  creatorOnboardingSchema,
  extractSocialUsername,
  CREATOR_NICHES,
} from "@/lib/validations/profile.schema";
import { parseOrErrors } from "@/lib/validations/to-field-errors";
import { markOnboardingSkipped } from "@/lib/onboarding-skip";
import { dashboardByRole } from "@/lib/constants/routes";

const STEPS = ["Identitas", "Tampilan", "Akun Sosial"] as const;

const NICHE_SELECT_OPTIONS = CREATOR_NICHES.map((n) => ({
  value: n,
  label: n.charAt(0).toUpperCase() + n.slice(1),
}));

export function CreatorOnboarding({ initialName }: { initialName?: string }) {
  const router = useRouter();
  const { refresh } = useAuth();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(initialName ?? "");
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [tiktok, setTiktok] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);

  function validateStep(target: number): boolean {
    const parsed = parseOrErrors(creatorOnboardingSchema, {
      displayName: displayName.trim(),
      niche,
      city: city.trim(),
      bio: bio.trim(),
    });
    const all = parsed.ok ? {} : parsed.errors;
    const scope =
      target === 1 ? ["displayName", "niche", "city"] : target === 2 ? ["bio"] : [];

    const scoped: Record<string, string> = {};
    for (const key of scope) {
      if (all[key]) scoped[key] = all[key];
    }

    if (target === 3 && !extractSocialUsername(tiktok)) {
      scoped.tiktok = tiktok.trim()
        ? "Tautan/username TikTok tidak valid."
        : "Akun TikTok wajib diisi.";
    }
    setErrors(scoped);
    return Object.keys(scoped).length === 0;
  }

  function handleNext() {
    setBanner(null);
    if (validateStep(step)) setStep((s) => s + 1);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBanner(null);
    setUploading(true);
    const res = await uploadCreatorAvatar(file);
    setUploading(false);

    if (!res.success || !res.data) {
      setBanner(res.error ?? "Gagal mengunggah foto profil.");
      return;
    }
    setAvatarUrl(res.data);
  }

  async function handleSubmit() {
    setBanner(null);
    if (!validateStep(3)) return;

    const parsed = parseOrErrors(creatorOnboardingSchema, {
      displayName: displayName.trim(),
      niche,
      city: city.trim(),
      bio: bio.trim(),
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setStep(1);
      return;
    }

    setPending(true);

    // Social dulu, lalu profil — Function `update-profile` evaluasi completion
    // dengan membaca creator_social_accounts. Client TIDAK menulis isProfileCompleted.
    const social = await upsertCreatorSocialAccount({
      platform: "tiktok",
      username: extractSocialUsername(tiktok),
    });
    if (!social.success) {
      setPending(false);
      setBanner(social.error ?? "Gagal menyimpan akun TikTok. Coba lagi.");
      return;
    }

    const res = await updateCreatorProfile({
      ...parsed.data,
      ...(avatarUrl ? { avatarUrl } : {}),
    });
    setPending(false);

    if (!res.success) {
      setBanner(
        res.code === "auth"
          ? "Sesi berakhir, silakan login kembali."
          : res.error ?? "Gagal menyimpan profil. Coba lagi."
      );
      return;
    }

    await refresh();
    router.replace(dashboardByRole.creator);
  }

  function handleSkip() {
    markOnboardingSkipped();
    router.replace(dashboardByRole.creator);
  }

  const busy = pending || uploading;

  return (
    <OnboardingShell
      title="Lengkapi Profil Kreator"
      description="Profil lengkap bikin kamu lebih mudah ditemukan UMKM dan bisa langsung klaim campaign."
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
            Kalau dilewati sekarang, kamu bisa lengkapi nanti — tapi belum bisa
            muncul di direktori atau klaim campaign.
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
            label="Nama Display"
            name="displayName"
            autoComplete="name"
            placeholder="Nadia Visuals"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={errors.displayName}
            disabled={busy}
          />
          <AuthSelectField
            label="Niche Konten"
            name="niche"
            placeholder="Pilih niche…"
            options={NICHE_SELECT_OPTIONS}
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            error={errors.niche}
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
            hint="UMKM pakai ini buat cari kreator di sekitar mereka."
            disabled={busy}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <AuthTextareaField
            label="Bio Singkat"
            name="bio"
            rows={4}
            placeholder="Ceritakan gaya konten dan pengalamanmu dalam beberapa kalimat."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            error={errors.bio}
            hint="Ini yang dilihat UMKM pertama kali di profil kamu."
            disabled={busy}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-[0.74rem] font-extrabold text-ink-950">
              Foto Profil <span className="font-semibold text-text-muted">(opsional)</span>
            </span>
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-orange-200/80 bg-orange-50/50 shadow-inner">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Pratinjau foto profil"
                    width={64}
                    height={64}
                    className="h-16 w-16 object-cover"
                    unoptimized
                  />
                ) : (
                  <UserRound size={22} className="text-orange-500" aria-hidden />
                )}
              </div>
              <label className="min-h-[44px] flex-1 cursor-pointer rounded-full border border-neutral-200/80 bg-white px-5 py-2.5 text-center text-xs sm:text-sm font-extrabold text-ink-950 shadow-2xs hover:bg-neutral-50 transition-all flex items-center justify-center">
                {uploading ? "Mengunggah…" : avatarUrl ? "Ganti foto" : "Pilih foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarChange}
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
            label="Akun TikTok"
            name="tiktok"
            placeholder="@nadia.visuals atau tautan profilnya"
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
            error={errors.tiktok}
            hint="TikTok-mu jadi portofolio utama kamu di Marketiv — wajib diisi."
            disabled={busy}
          />
        </div>
      )}
    </OnboardingShell>
  );
}
