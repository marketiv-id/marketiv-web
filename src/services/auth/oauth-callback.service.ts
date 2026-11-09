import type { ServiceErrorCode, UserRole } from "@/types/domain";
import type { SessionUser } from "./session.service";
import {
  isUserPortalRole,
  resolveSafePostLoginDestination,
} from "@/lib/constants/routes";

export interface OAuthCallbackInput {
  user: SessionUser | null;
  errorCode?: ServiceErrorCode | null;
  role?: "umkm" | "creator";
  next?: string;
  provisioningSucceeded?: boolean;
}

export type OAuthCallbackDecision =
  | { action: "redirect"; href: string }
  | { action: "provision" }
  | { action: "show_recovery" }
  | { action: "role_mismatch"; actualRole: UserRole };

export function resolveOAuthCallbackDecision(
  input: OAuthCallbackInput
): OAuthCallbackDecision {
  if (input.user) {
    if (!isUserPortalRole(input.user.role) || input.user.role !== input.role) {
      return { action: "role_mismatch", actualRole: input.user.role };
    }
    return {
      action: "redirect",
      href: resolveSafePostLoginDestination(input.user.role, input.next),
    };
  }

  if (input.errorCode !== "not_found") {
    return { action: "redirect", href: "/login?error=oauth" };
  }

  // UMKM & Kreator kini simetris: provision (role di-whitelist server) → satu wizard
  // /onboarding. Form perantara /auth/oauth-complete dihapus supaya UMKM tidak
  // mengisi Nama Usaha & Kategori dua kali berturut-turut.
  if (input.role === "umkm" || input.role === "creator") {
    if (input.provisioningSucceeded === false) return { action: "show_recovery" };
    if (input.provisioningSucceeded === true) {
      return { action: "redirect", href: "/onboarding" };
    }
    return { action: "provision" };
  }

  return { action: "redirect", href: "/register?error=profile_missing" };
}
