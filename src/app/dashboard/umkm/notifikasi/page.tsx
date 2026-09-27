import { UmkmDashboardChrome } from "@/components/features/dashboard/UmkmDashboardChrome";
import { NotificationView } from "@/components/features/shared/NotificationView";

export const metadata = {
  title: "Notifikasi | Dashboard UMKM | Marketiv",
};

export default function NotifikasiPage() {
  return (
    <UmkmDashboardChrome>
      <NotificationView theme="umkm" />
    </UmkmDashboardChrome>
  );
}
