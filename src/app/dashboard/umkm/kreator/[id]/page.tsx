import { UmkmDashboardChrome } from "@/components/features/dashboard/UmkmDashboardChrome";
import { CreatorDetailPage } from "@/components/features/umkm-dashboard/creators";

export const metadata = {
  title: "Profil Kreator | Dashboard UMKM | Marketiv",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CreatorProfilePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <UmkmDashboardChrome>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <CreatorDetailPage creatorId={id} />
      </div>
    </UmkmDashboardChrome>
  );
}
