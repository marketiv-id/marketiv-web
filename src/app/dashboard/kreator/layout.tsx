import { ReactNode } from "react";
import { CreatorDashboardChrome } from "@/components/features/creator-dashboard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { NotificationProvider } from "@/components/features/shared/NotificationProvider";

interface CreatorLayoutProps {
  children: ReactNode;
}

export default function CreatorLayout({ children }: CreatorLayoutProps) {
  return (
    <RoleGuard role="creator">
      <NotificationProvider role="creator">
        <CreatorDashboardChrome>{children}</CreatorDashboardChrome>
      </NotificationProvider>
    </RoleGuard>
  );
}
