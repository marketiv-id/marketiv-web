import { NegosiasiView } from "@/components/features/creator-dashboard/NegosiasiView";

export const metadata = {
  title: "Negosiasi Paket Harga | Dashboard Kreator | Marketiv",
};

/**
 * Data diambil di dalam NegosiasiView (klien), bukan di sini. DTO
 * `get-creator-negotiations` menegakkan kepemilikan lewat header
 * `x-appwrite-user-id` sesi aktif, dan sesi Appwrite hidup di browser —
 * memanggilnya dari Server Component akan selalu balik 401
 * (pelajaran `s3-ssr-session`).
 */
export default function NegosiasiPage() {
  return <NegosiasiView />;
}
