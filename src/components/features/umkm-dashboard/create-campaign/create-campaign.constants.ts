
export interface OptionItem {
  id: string;
  label: string;
  desc: string;
}

export const NICHE_OPTIONS: OptionItem[] = [
  { id: "kuliner", label: "Kuliner", desc: "Makanan & Minuman" },
  { id: "fashion", label: "Fashion", desc: "Pakaian & Aksesoris" },
  { id: "pariwisata", label: "Pariwisata", desc: "Travel & Liburan" },
  { id: "edukasi", label: "Edukasi", desc: "Kursus & Pengetahuan" },
  { id: "kecantikan", label: "Kecantikan", desc: "Kosmetik & Skin Care" },
  { id: "lainnya", label: "Lainnya", desc: "Umum & Jasa" },
];

export const TONE_OPTIONS: OptionItem[] = [
  { id: "natural", label: "Natural / Kasual", desc: "Santai & apa adanya" },
  { id: "edukatif", label: "Edukasi / Review", desc: "Penjelasan detail produk" },
  { id: "enerjik", label: "Enerjik & Fun", desc: "Penuh semangat & musik up-beat" },
  { id: "storytelling", label: "Storytelling", desc: "Memakai format cerita/narasi" },
  { id: "soft_selling", label: "Soft Selling", desc: "Promosi halus & estetik" },
];

export const CTA_OPTIONS: OptionItem[] = [
  { id: "kunjungi_toko", label: "Kunjungi Toko", desc: "Arahkan ke lapak offline/online" },
  { id: "follow_akun", label: "Follow Akun", desc: "Arahkan ke akun medsos merek" },
  { id: "coba_produk", label: "Coba Produk", desc: "Rekomendasikan mencoba produk" },
  { id: "pesan_sekarang", label: "Pesan Sekarang", desc: "Arahkan pembelian langsung" },
];

export const PRICE_TIERS = [
  { id: 3000, label: "Rp 3.000", desc: "Kategori Rendah / Pemula" },
  { id: 5000, label: "Rp 5.000", desc: "Kategori Menengah / Standar" },
  { id: 8000, label: "Rp 8.000", desc: "Kategori Tinggi / Premium" },
];

export const PAYMENT_METHODS = [
  { id: "va", name: "Bank Transfer Virtual Account", desc: "BNI, Mandiri, BCA, BRI" },
  { id: "qris", name: "QRIS Cashback", desc: "Gopay, OVO, Dana, LinkAja, ShopeePay" },
  { id: "wallet", name: "Saldo Dompet Marketiv", desc: "Bayar instan via saldo platform" },
];

export const STEP_TIPS: Record<number, string> = {
  1: "Gunakan nama kampanye yang mudah dikenali kreator.",
  2: "Arahan yang jelas mempercepat kreator memahami gaya video.",
  3: "Pastikan tautan Drive bisa diakses publik.",
  4: "Tarif lebih tinggi biasanya menarik lebih banyak kreator.",
  5: "Periksa kembali semua data sebelum simulasi pembayaran.",
};

export interface QuickDirectionItem {
  id: string;
  label: string;
  category: "product" | "experience" | "value" | "behind_the_product";
  categoryLabel: string;
  niches?: string[];
}

export const QUICK_DIRECTIONS: QuickDirectionItem[] = [
  // Produk
  { id: "show_product", label: "Tampilkan produk", category: "product", categoryLabel: "Produk", niches: ["kuliner", "fashion", "kecantikan", "edukasi", "pariwisata", "lainnya"] },
  { id: "show_texture", label: "Tekstur produk", category: "product", categoryLabel: "Produk", niches: ["kuliner", "kecantikan"] },
  { id: "show_packaging", label: "Detail kemasan", category: "product", categoryLabel: "Produk", niches: ["kuliner", "kecantikan", "fashion"] },
  { id: "show_variants", label: "Varian produk", category: "product", categoryLabel: "Produk", niches: ["kuliner", "fashion"] },
  { id: "show_portion", label: "Ukuran & porsi", category: "product", categoryLabel: "Produk", niches: ["kuliner"] },
  { id: "show_fit", label: "Fit di badan", category: "product", categoryLabel: "Produk", niches: ["fashion"] },
  { id: "show_stitching", label: "Detail jahitan", category: "product", categoryLabel: "Produk", niches: ["fashion"] },

  // Pengalaman (Experience)
  { id: "try_product", label: "Coba produknya", category: "experience", categoryLabel: "Pengalaman", niches: ["kuliner", "kecantikan"] },
  { id: "first_reaction", label: "Reaksi saat mencoba", category: "experience", categoryLabel: "Pengalaman", niches: ["kuliner", "kecantikan"] },
  { id: "usage_howto", label: "Cara penggunaan", category: "experience", categoryLabel: "Pengalaman", niches: ["kecantikan", "edukasi"] },
  { id: "before_after", label: "Hasil pemakaian", category: "experience", categoryLabel: "Pengalaman", niches: ["kecantikan"] },
  { id: "outfit_styling", label: "Outfit styling", category: "experience", categoryLabel: "Pengalaman", niches: ["fashion"] },
  { id: "place_ambiance", label: "Suasana tempat", category: "experience", categoryLabel: "Pengalaman", niches: ["pariwisata"] },
  { id: "place_spots", label: "Fasilitas & spot foto", category: "experience", categoryLabel: "Pengalaman", niches: ["pariwisata"] },

  // Nilai / Keunggulan (Value)
  { id: "highlight_benefits", label: "Keunggulan produk", category: "value", categoryLabel: "Nilai & Keunggulan", niches: ["kuliner", "fashion", "edukasi", "lainnya"] },
  { id: "key_ingredients", label: "Bahan utama", category: "value", categoryLabel: "Nilai & Keunggulan", niches: ["kuliner", "kecantikan"] },
  { id: "price_promo", label: "Harga & promo", category: "value", categoryLabel: "Nilai & Keunggulan", niches: ["kuliner", "pariwisata", "lainnya"] },
  { id: "target_audience", label: "Siapa yang cocok", category: "value", categoryLabel: "Nilai & Keunggulan", niches: ["edukasi", "fashion"] },
  { id: "course_perks", label: "Manfaat materi", category: "value", categoryLabel: "Nilai & Keunggulan", niches: ["edukasi"] },

  // Proses & Cerita (Behind the product)
  { id: "process_making", label: "Proses pembuatan", category: "behind_the_product", categoryLabel: "Proses & Cerita", niches: ["kuliner"] },
  { id: "process_serving", label: "Proses penyajian", category: "behind_the_product", categoryLabel: "Proses & Cerita", niches: ["kuliner"] },
  { id: "brand_story", label: "Cerita merek", category: "behind_the_product", categoryLabel: "Proses & Cerita", niches: ["pariwisata", "lainnya"] },
  { id: "location_access", label: "Akses & lokasi usaha", category: "behind_the_product", categoryLabel: "Proses & Cerita", niches: ["pariwisata", "kuliner"] },
];

export function getRecommendedDirections(nicheId?: string): QuickDirectionItem[] {
  if (!nicheId) return QUICK_DIRECTIONS.slice(0, 5);
  const normNiche = nicheId.toLowerCase();
  const matched = QUICK_DIRECTIONS.filter((item) => item.niches?.includes(normNiche));
  if (matched.length >= 4) return matched.slice(0, 5);
  return QUICK_DIRECTIONS.slice(0, 5);
}

export interface CreatorGuidelineItem {
  id: string;
  label: string;
  type: "required" | "restriction";
  niches?: string[];
}

export const CREATOR_GUIDELINES: CreatorGuidelineItem[] = [
  // Wajib Ditampilkan (Required)
  { id: "req_product_clear", label: "Produk terlihat jelas", type: "required", niches: ["kuliner", "fashion", "kecantikan", "edukasi", "pariwisata", "lainnya"] },
  { id: "req_packaging", label: "Kemasan produk", type: "required", niches: ["kuliner", "kecantikan", "fashion"] },
  { id: "req_brand_name", label: "Nama merek", type: "required", niches: ["kuliner", "fashion", "kecantikan", "edukasi", "pariwisata", "lainnya"] },
  { id: "req_texture", label: "Tekstur / isi produk", type: "required", niches: ["kuliner", "kecantikan"] },
  { id: "req_try_process", label: "Proses mencicipi/mencoba", type: "required", niches: ["kuliner", "kecantikan"] },
  { id: "req_usage", label: "Cara penggunaan", type: "required", niches: ["kecantikan", "edukasi"] },
  { id: "req_color_accurate", label: "Warna produk akurat", type: "required", niches: ["fashion"] },
  { id: "req_fit_show", label: "Tampilkan fit produk", type: "required", niches: ["fashion"] },
  { id: "req_material_detail", label: "Detail bahan produk", type: "required", niches: ["fashion"] },
  { id: "req_location", label: "Lokasi & alamat usaha", type: "required", niches: ["pariwisata"] },

  // Perlu Dihindari (Restrictions)
  { id: "res_no_competitor", label: "Sebut kompetitor", type: "restriction", niches: ["kuliner", "fashion", "kecantikan", "edukasi", "pariwisata", "lainnya"] },
  { id: "res_no_overclaim", label: "Klaim berlebihan", type: "restriction", niches: ["kuliner", "kecantikan", "edukasi", "lainnya"] },
  { id: "res_no_wrong_price", label: "Info harga yang salah", type: "restriction", niches: ["kuliner", "pariwisata", "lainnya"] },
  { id: "res_no_harsh_language", label: "Bahasa kasar / tidak sopan", type: "restriction", niches: ["kuliner", "fashion", "kecantikan", "edukasi", "pariwisata", "lainnya"] },
  { id: "res_no_fake_fact", label: "Mengubah fakta produk", type: "restriction", niches: ["kuliner", "fashion", "kecantikan", "edukasi", "lainnya"] },
  { id: "res_no_exact_size_promise", label: "Menjanjikan ukuran pasti", type: "restriction", niches: ["fashion"] },
  { id: "res_no_medical_claim", label: "Klaim medis berlebihan", type: "restriction", niches: ["kecantikan"] },
];

export function getRecommendedGuidelines(nicheId?: string): { required: CreatorGuidelineItem[]; restrictions: CreatorGuidelineItem[] } {
  const normNiche = (nicheId || "").toLowerCase();
  const reqs = CREATOR_GUIDELINES.filter((item) => item.type === "required" && (item.niches?.includes(normNiche) || item.niches?.includes("lainnya"))).slice(0, 4);
  const rests = CREATOR_GUIDELINES.filter((item) => item.type === "restriction" && (item.niches?.includes(normNiche) || item.niches?.includes("lainnya"))).slice(0, 3);
  return { required: reqs, restrictions: rests };
}
