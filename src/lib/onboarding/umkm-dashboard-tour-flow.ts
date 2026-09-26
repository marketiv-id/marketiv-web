import { startUmkmOnboardingTour } from "./umkm-driver";
import { umkmDashboardTourSteps } from "./umkm-dashboard-tour";
import {
  abandonUmkmDashboardTourSession,
  beginUmkmDashboardTourSession,
  beginUmkmCampaignHandoff,
  claimUmkmCampaignTour,
  markUmkmCampaignTourCompleted,
  markUmkmCampaignTourHandled,
  markUmkmCampaignTourSkipped,
  markUmkmDashboardTourHandled,
  markUmkmDashboardTourSkipped,
  prepareUmkmDashboardTourReplay,
  restoreUmkmCampaignHandoff,
} from "./umkm-dashboard-tour-session";
import { umkmCampaignTourSteps } from "./umkm-campaign-tour";
import { UMKM_ONBOARDING_TOUR_ENABLED } from "./umkm-tour-feature";
import { routes } from "../constants/routes";

/** Single T03 seam from eligible UMKM Dashboard session into T02 adapter. */
export function startUmkmDashboardTourForSession(userId: string): boolean {
  if (!UMKM_ONBOARDING_TOUR_ENABLED) return false;
  if (!beginUmkmDashboardTourSession(userId)) return false;

  const tour = startUmkmOnboardingTour(umkmDashboardTourSteps, {
    onDestroyed: () => markUmkmDashboardTourHandled(userId),
    onSkipped: () => markUmkmDashboardTourSkipped(userId),
  });
  if (!tour) abandonUmkmDashboardTourSession(userId);
  return tour !== null;
}

/** Call only from existing user-triggered Dashboard Campaign navigation. */
export function beginUmkmCampaignHandoffForSession(userId: string): boolean {
  if (!UMKM_ONBOARDING_TOUR_ENABLED) return false;
  return beginUmkmCampaignHandoff(userId);
}

/** Reuses existing route; navigation occurs only from a user event handler. */
export function navigateUmkmCampaignForOnboarding(
  userId: string | undefined,
  navigate: (href: string) => void
): void {
  if (userId) beginUmkmCampaignHandoffForSession(userId);
  navigate(routes.umkmCreateCampaign);
}

/**
 * T05 orchestration boundary: prepare replay before requesting Dashboard
 * navigation. The replay phase also makes rapid repeat requests idempotent.
 */
export function replayUmkmDashboardOnboarding(
  userId: string | undefined,
  navigate: (href: string) => void
): boolean {
  if (!UMKM_ONBOARDING_TOUR_ENABLED) return false;
  if (!userId || !prepareUmkmDashboardTourReplay(userId)) return false;
  navigate(routes.dashboardUmkm);
  return true;
}

/** Campaign-side continuation. It never performs navigation. */
export function startUmkmCampaignTourForSession(userId: string): boolean {
  if (!UMKM_ONBOARDING_TOUR_ENABLED) return false;
  if (!claimUmkmCampaignTour(userId)) return false;

  const tour = startUmkmOnboardingTour(umkmCampaignTourSteps, {
    onDestroyed: () => markUmkmCampaignTourHandled(userId),
    onSkipped: () => markUmkmCampaignTourSkipped(userId),
    onCompleted: () => markUmkmCampaignTourCompleted(userId),
  });

  if (!tour) restoreUmkmCampaignHandoff(userId);
  return tour !== null;
}
