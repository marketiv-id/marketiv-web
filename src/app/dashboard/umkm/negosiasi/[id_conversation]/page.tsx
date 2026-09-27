import { UmkmDashboardChrome } from "@/components/features/dashboard/UmkmDashboardChrome";
import { NegotiationRoomPage } from "@/components/features/umkm-dashboard/negotiation/detail/NegotiationRoomPage";

export const metadata = {
  title: "Negosiasi | Dashboard UMKM | Marketiv",
};

/**
 * Ruang negosiasi di-key oleh conversationId, bukan orderId — di Alur B
 * percakapan dan Custom Offer terjadi sebelum order ada.
 *
 * Tidak ada pembacaan di sini: chrome memuat nama usahanya sendiri di klien,
 * dan isi ruangnya diambil NegotiationRoomPage (`s5-ssr-to-client`).
 */
interface PageProps {
  params: Promise<{ id_conversation: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id_conversation } = await params;

  return (
    <UmkmDashboardChrome>
      <NegotiationRoomPage conversationId={id_conversation} />
    </UmkmDashboardChrome>
  );
}
