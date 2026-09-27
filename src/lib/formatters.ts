/**
 * Konstanta standar mata uang & locale Rupiah di seluruh Marketiv.
 */
export const IDR_LOCALE = "id-ID" as const;
export const IDR_CURRENCY_CODE = "IDR" as const;
export const IDR_CURRENCY_SYMBOL = "Rp" as const;

export function formatCurrency(value: number) {
  return new Intl.NumberFormat(IDR_LOCALE, {
    style: "currency",
    currency: IDR_CURRENCY_CODE,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format string/angka menjadi representasi rupiah dengan titik pemisah ribuan (.)
 * tanpa simbol "Rp". Sangat cocok untuk input field/form nominal uang.
 * @example formatRupiahInput("123123131") → "123.123.131"
 * @example formatRupiahInput(120000)      → "120.000"
 * @example formatRupiahInput("")          → ""
 */
export function formatRupiahInput(value: string | number): string {
  if (value === "" || value === null || value === undefined) return "";
  const cleanDigits = String(value).replace(/[^0-9]/g, "");
  if (!cleanDigits) return "";
  const num = parseInt(cleanDigits, 10);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat(IDR_LOCALE).format(num);
}

/**
 * Parsing string berformat rupiah kembali ke angka murni (number/integer).
 * @example parseRupiahInput("123.123.131") → 123123131
 * @example parseRupiahInput("Rp 120.000")  → 120000
 */
export function parseRupiahInput(value: string): number {
  if (!value) return 0;
  const cleanDigits = value.replace(/[^0-9]/g, "");
  return cleanDigits ? parseInt(cleanDigits, 10) : 0;
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat(IDR_LOCALE, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Label jumlah follower yang gagal-tertutup: 0 berarti kreator belum pernah
 * mengisi angkanya, jadi tampilannya "—" — bukan 0 dan bukan angka karangan.
 */
export function formatFollowersLabel(followers: number) {
  return followers > 0 ? formatCompactNumber(followers) : "—";
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Baru saja";
  if (diffHours < 24) return `${diffHours} jam lalu`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} hari lalu`;
}

export function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    const formatted = (value / 1_000_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    });
    return `Rp ${formatted} M`;
  }
  if (value >= 1_000_000) {
    const formatted = (value / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    });
    return `Rp ${formatted} jt`;
  }
  if (value >= 1_000) {
    const formatted = (value / 1_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    });
    return `Rp ${formatted} rb`;
  }
  return `Rp ${value}`;
}

/**
 * Format angka views/tayangan ke representasi ringkas Bahasa Indonesia.
 * Menggantikan semua fungsi `formatViews` lokal di komponen UMKM.
 * @example formatCompactViews(1_200_000) → "1.2jt"
 * @example formatCompactViews(45_000)    → "45rb"
 * @example formatCompactViews(500)       → "500"
 */
export function formatCompactViews(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })}rb`;
  }
  return String(value);
}
