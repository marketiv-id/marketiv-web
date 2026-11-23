import type { ServiceResult } from "@/types/domain";
import type { AppNotification, NotifType } from "@/types/notification.types";
import type { UserRole } from "@/types/domain";
import { callApi } from "@/lib/api/call-api";
import { createClient } from "@/lib/supabase/client";
import { rowsToDocs } from "./legacy-doc";
import {
  type Doc,
  str,
  ok,
  failFromError,
  failFromWriteError,
  requireUserId,
  noData,
} from "./service-result";

/**
 * Notifikasi — satu untuk UMKM dan Kreator.
 *
 * BACA lewat supabase-js + RLS (pemilik saja). TULIS (tandai dibaca, tandai
 * semua, hapus) lewat Route Handler `/api/notifications/*` → RPC yang memfilter
 * `user_id` = sesi; browser tidak pernah menulis `notifications` langsung.
 * Daftar kosong ditampilkan sebagai empty state, bukan error.
 */

const COLLECTION = "notifications";
const PAGE_LIMIT = 100;

/**
 * `notifications.type` → kategori tampilan.
 *
 * Nilai DB ditulis Function dan tidak dibatasi enum. Yang tidak dikenali jatuh
 * ke "sistem" — sengaja, supaya notifikasi jenis baru tetap tampil alih-alih
 * hilang dari semua tab.
 */
const TYPE_ALIAS: Record<string, NotifType> = {
  // Campaign Mode (Alur A)
  campaign_published: "campaign",
  claim: "campaign",
  claim_expired: "campaign",
  submission_approved: "campaign",
  submission_rejected: "campaign",
  // Rate Card Mode (Alur B)
  chat_message: "negosiasi",
  offer_created: "negosiasi",
  offer_rejected: "negosiasi",
  order_created: "negosiasi",
  order_completed: "keuangan",
  deliverable_submitted: "negosiasi",
  revision_requested: "negosiasi",
  // Uang
  escrow_held: "keuangan",
  escrow_released: "keuangan",
  reward: "keuangan",
  reward_matured: "keuangan",
  withdrawal: "keuangan",
  payment: "keuangan",
};

/**
 * Tautan aksi per kategori. `notifications` tidak menyimpan URL, jadi tujuannya
 * diturunkan dari kategori + role pembaca — bukan ditebak per-notifikasi.
 */
const ACTION_BY_TYPE: Record<
  UserRole,
  Partial<Record<NotifType, { label: string; href: string }>>
> = {
  umkm: {
    campaign: { label: "Lihat Campaign", href: "/dashboard/umkm/campaign" },
    negosiasi: { label: "Lihat Negosiasi", href: "/dashboard/umkm/negosiasi" },
    keuangan: { label: "Lihat Keuangan", href: "/dashboard/umkm/keuangan" },
  },
  creator: {
    campaign: { label: "Lihat Job Pool", href: "/dashboard/kreator/job-pool" },
    negosiasi: { label: "Lihat Negosiasi", href: "/dashboard/kreator/negosiasi" },
    keuangan: { label: "Lihat Dompet", href: "/dashboard/kreator/keuangan" },
    rate_card: { label: "Lihat Rate Card", href: "/dashboard/kreator/rate-card" },
  },
  admin: {},
};

const mapNotification = (d: Doc, role: UserRole): AppNotification => {
  const type = TYPE_ALIAS[str(d.type)] ?? "sistem";
  const action = ACTION_BY_TYPE[role][type];
  return {
    id: str(d.$id),
    type,
    title: str(d.title),
    message: str(d.message),
    timestamp: str(d.createdAt) || str(d.$createdAt),
    isRead: d.isRead === true,
    actionLabel: action?.label,
    actionHref: action?.href,
  };
};

export async function getNotificationsFromAppwrite(
  role: UserRole
): Promise<ServiceResult<AppNotification[]>> {
  const auth = await requireUserId<AppNotification[]>([]);
  if (!auth.ok) return auth.result;

  try {
    const supabase = createClient();
    const notifications: AppNotification[] = [];
    // Padanan cursorAfter Appwrite: halaman berurutan stabil (created_at, id)
    // turun. Offset dipakai, bukan keyset `.lt("created_at")`, karena beberapa
    // notifikasi bisa berbagi created_at yang sama (ditulis satu transaksi) dan
    // keyset tunggal akan melompati sebagian.
    for (let offset = 0; ; offset += PAGE_LIMIT) {
      const { data, error } = await supabase
        .from(COLLECTION)
        .select("*")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + PAGE_LIMIT - 1);
      if (error) throw error;
      const docs = rowsToDocs(COLLECTION, data);
      for (const d of docs) notifications.push(mapNotification(d, role));
      if (docs.length < PAGE_LIMIT) break;
    }

    return ok(notifications);
  } catch (err) {
    return failFromError<AppNotification[]>(err, []);
  }
}

export async function markNotificationReadInAppwrite(
  id: string
): Promise<ServiceResult<null>> {
  try {
    await callApi("updateNotification", { id, isRead: true });
    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, noData<null>());
  }
}

/**
 * Tandai semua sebagai dibaca — satu request, satu UPDATE di server (hanya
 * notifikasi milik sendiri yang belum dibaca).
 */
export async function markAllNotificationsReadInAppwrite(
  ids: string[]
): Promise<ServiceResult<null>> {
  if (ids.length === 0) return ok(null);

  try {
    await callApi("markNotificationsRead", { ids });
    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, noData<null>());
  }
}

export async function deleteNotificationInAppwrite(
  id: string
): Promise<ServiceResult<null>> {
  try {
    await callApi("deleteNotification", { id });
    return ok(null);
  } catch (err) {
    return failFromWriteError<null>(err, noData<null>());
  }
}
