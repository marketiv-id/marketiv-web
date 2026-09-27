import { PlusCircle, Users, Sparkles } from "lucide-react";

/**
 * Variasi kartu penawaran pada empty state daftar campaign UMKM.
 *
 * Dipisah dari `CampaignsPage` supaya bisa diuji tanpa memuat seluruh halaman
 * (halaman itu menarik service, modal, dan chart yang tidak relevan untuk data ini).
 */
export const UMKM_CAMPAIGN_EMPTY_VARIANTS = [
  {
    badge: "Kuota Kampanye",
    icon: PlusCircle,
    iconBg: "bg-orange-50 text-orange-600 border-orange-200/80",
    title: "Buat Kampanye Bayar per Tayangan Baru",
    desc: "Unggah arahan produk dan tentukan tarif per 1.000 tayangan. Konten kreator akan mengklaim dan memposting di akun medsos mereka.",
    btnLabel: "Buat Kampanye Baru",
    href: "/dashboard/umkm/campaign/buat",
    isPrimary: true,
    features: [
      "Bayar hanya berdasarkan performa tayangan nyata",
      "Kreator langsung eksekusi tanpa drama revisi",
    ],
  },
  {
    badge: "Kolaborasi Kreator",
    icon: Users,
    iconBg: "bg-blue-50 text-blue-600 border-blue-200/80",
    title: "Jelajahi Direktori Kreator",
    desc: "Cari mikro-kreator lokal potensial berdasarkan kategori kuliner, fashion, kecantikan, dan mulai penawaran Paket Harga.",
    btnLabel: "Cari Mikro-Kreator",
    href: "/dashboard/umkm/kreator",
    isPrimary: false,
    features: [
      "Kreator aktif terverifikasi",
      "Negosiasi harga transparan dan aman",
    ],
  },
  {
    badge: "Paket Harga",
    icon: Sparkles,
    iconBg: "bg-amber-50 text-amber-600 border-amber-200/80",
    title: "Mulai Negosiasi Paket Harga",
    desc: "Pesan paket promosi harga tetap dengan Postingan Kolaborasi resmi di Instagram / TikTok untuk promosi eksklusif.",
    btnLabel: "Buka Tab Negosiasi",
    href: "/dashboard/umkm/negosiasi",
    isPrimary: false,
    features: [
      "Format Postingan Kolaborasi resmi",
      "Dana diamankan sistem Dana Aman hingga kesepakatan tuntas",
    ],
  },
];
