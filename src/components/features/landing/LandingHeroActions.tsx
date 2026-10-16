"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { dashboardByRole, isUserPortalRole, routes } from "@/lib/constants/routes";
import { LandingButton } from "./motion/LandingButton";

interface LandingHeroActionsProps {
  ctaUmkm: string;
  ctaCreator: string;
  dashboardCta?: string;
}

export function LandingHeroActions({ ctaUmkm, ctaCreator, dashboardCta = "Buka Dashboard" }: LandingHeroActionsProps) {
  const { user, loading } = useAuth();
  const dashboardHref = user && isUserPortalRole(user.role) ? dashboardByRole[user.role] : null;

  if (loading) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-3 sm:flex-row">
        <div className="h-14 w-full rounded-full bg-secondary-900/10 sm:w-60" />
        <div className="h-14 w-full rounded-full bg-secondary-900/5 sm:w-60" />
      </div>
    );
  }

  if (dashboardHref) {
    return (
      <LandingButton href={dashboardHref} variant="dark" curtain cursorLabel="Masuk">
        {dashboardCta}
      </LandingButton>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <LandingButton href={routes.registerWithRole("umkm")} variant="primary" curtain cursorLabel="Mulai">
        {ctaUmkm}
      </LandingButton>
      <LandingButton href={routes.registerWithRole("creator")} variant="outline" curtain cursorLabel="Daftar">
        {ctaCreator}
      </LandingButton>
    </div>
  );
}
