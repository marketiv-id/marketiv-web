import { ReactNode } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { UmkmIdentityProvider } from "@/components/features/dashboard/UmkmIdentityContext";
import { NotificationProvider } from "@/components/features/shared/NotificationProvider";

/**
 * Boundary guard segment UMKM.
 * Chrome dashboard tetap dirender per-page; layout ini menegakkan role dan menyediakan UmkmIdentityProvider + NotificationProvider (satu instance lintas navigasi).
 */
export default function UmkmDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="umkm">
      <UmkmIdentityProvider>
        <NotificationProvider role="umkm">{children}</NotificationProvider>
      </UmkmIdentityProvider>
    </RoleGuard>
  );
}
