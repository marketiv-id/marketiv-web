"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { dashboardByRole, isUserPortalRole, routes } from "@/lib/constants/routes";
import { LandingButton } from "./motion/LandingButton";

interface LandingHeroActionsProps {
  ctaUmkm: string;
  ctaCreator: string;
  dashboardCta?: string;
  // "dark" is for the orange hero frame, where the primary action turns white.
  tone?: "light" | "dark";
}

export function LandingHeroActions({ ctaUmkm, ctaCreator, dashboardCta = "Buka Dasbor", tone = "light" }: LandingHeroActionsProps) {
  const { user, loading } = useAuth();
  const dashboardHref = user && isUserPortalRole(user.role) ? dashboardByRole[user.role] : null;
  const onDark = tone === "dark";

  if (loading) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-3 sm:flex-row">
        <div className={onDark ? "h-14 w-full rounded-full bg-white/25 sm:w-60" : "h-14 w-full rounded-full bg-secondary-900/10 sm:w-60"} />
        <div className={onDark ? "h-14 w-full rounded-full bg-white/10 sm:w-60" : "h-14 w-full rounded-full bg-secondary-900/5 sm:w-60"} />
      </div>
    );
  }

  if (dashboardHref) {
    return (
      <LandingButton href={dashboardHref} variant={onDark ? "light" : "dark"} curtain cursorLabel="Masuk">
        {dashboardCta}
      </LandingButton>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <LandingButton href={routes.registerWithRole("umkm")} variant={onDark ? "light" : "primary"} curtain arrow cursorLabel="Mulai">
        {ctaUmkm}
      </LandingButton>
      <LandingButton href={routes.registerWithRole("creator")} variant={onDark ? "outline-light" : "outline"} curtain cursorLabel="Daftar">
        {ctaCreator}
      </LandingButton>
    </div>
  );
}
