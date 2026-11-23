"use client";

/**
 * Supabase Realtime (postgres_changes) — pengganti `src/lib/appwrite/realtime.ts`.
 *
 * Event yang sampai ke browser tetap disaring RLS SELECT tabelnya (0011):
 * `messages` hanya untuk peserta percakapan, `notifications` hanya pemiliknya.
 * Filter di sini (`conversation_id=eq.<id>`, `user_id=eq.<uid>`) mempersempit
 * langganan, BUKAN batas keamanan. Tabel harus ada di publikasi
 * `supabase_realtime` (0013: messages, notifications).
 *
 * Seperti sebelumnya, jangan memakai payload event sebagai sumber kebenaran:
 * perlakukan event sebagai sinyal lalu baca ulang lewat jalur baca biasa.
 */
import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "./client";

export type RealtimeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

export type RealtimeChange<Row extends Record<string, unknown> = Record<string, unknown>> =
  RealtimePostgresChangesPayload<Row>;

export interface RealtimeOptions {
  /** Default `"*"` (insert, update, delete). */
  event?: RealtimeEvent;
  /** Default `"public"`. */
  schema?: string;
  /** `false` = jangan berlangganan (mis. mode mock). Default `true`. */
  enabled?: boolean;
}

type RealtimeClient = Pick<ReturnType<typeof createClient>, "channel" | "removeChannel">;

let channelSeq = 0;

/**
 * Berlangganan perubahan satu tabel. Mengembalikan fungsi untuk berhenti.
 *
 * `filter` mengikuti sintaks Supabase (`kolom=eq.nilai`). Nama channel unik per
 * pemanggilan supaya dua komponen yang mendengar tabel sama tidak saling
 * mencopot channel.
 */
export function subscribeToTable<Row extends Record<string, unknown> = Record<string, unknown>>(
  table: string,
  filter: string | null | undefined,
  onChange: (change: RealtimeChange<Row>) => void,
  options: Omit<RealtimeOptions, "enabled"> & { client?: RealtimeClient } = {},
): () => void {
  const client = options.client ?? createClient();
  channelSeq += 1;
  const name = `rt:${table}:${filter ?? "all"}:${channelSeq}`;
  const channel = client
    .channel(name)
    .on(
      // Overload generik supabase-js tidak bisa menerima event bertipe union.
      "postgres_changes" as never,
      {
        event: options.event ?? "*",
        schema: options.schema ?? "public",
        table,
        ...(filter ? { filter } : {}),
      },
      (payload: RealtimeChange<Row>) => onChange(payload),
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

/**
 * Hook React di atas `subscribeToTable`.
 *
 * - `filter === null` → tidak berlangganan (mis. userId belum diketahui).
 * - `onChange` disimpan di ref, jadi callback baru tiap render TIDAK membuat
 *   langganan ulang; hanya perubahan table/filter/event/enabled yang membuat ulang.
 */
export function useRealtimeTable<Row extends Record<string, unknown> = Record<string, unknown>>(
  table: string,
  filter: string | null,
  onChange: (change: RealtimeChange<Row>) => void,
  options: RealtimeOptions = {},
): void {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const { event = "*", schema = "public", enabled = true } = options;

  useEffect(() => {
    if (!enabled || filter === null) return;
    return subscribeToTable<Row>(table, filter, (change) => onChangeRef.current(change), { event, schema });
  }, [table, filter, event, schema, enabled]);
}
