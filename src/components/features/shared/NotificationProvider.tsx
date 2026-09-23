"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppNotification } from "@/types/notification.types";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/services/shared/notification.service";
import { DATA_SOURCE_CONFIG } from "@/config/data-source.config";
import { realtimeClient, tableChannels } from "@/lib/appwrite/realtime";

export type NotificationRole = "umkm" | "creator";

export interface NotificationContextValue {
  notifs: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  reload: (options?: { showLoading?: boolean }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotif: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function formatUnreadBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}

interface NotificationProviderProps {
  role: NotificationRole;
  children: ReactNode;
}

export function NotificationProvider({ role, children }: NotificationProviderProps) {
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (options?: { showLoading?: boolean }) => {
    if (options?.showLoading) setLoading(true);
    try {
      const res = await getNotifications(role);
      if (res.success && res.data) {
        setNotifs(res.data);
        setError(null);
      } else {
        setError(res.error ?? "Gagal memuat notifikasi.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat notifikasi.");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (DATA_SOURCE_CONFIG.useMockData) return;
    const channels = tableChannels("notifications");
    if (channels.length === 0) return;
    return realtimeClient.subscribe(channels, () => {
      void reload();
    });
  }, [reload]);

  const markAsRead = useCallback(
    async (id: string) => {
      setNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      const res = await markNotificationRead(id);
      if (!res.success) void reload();
    },
    [reload],
  );

  const markAllRead = useCallback(async () => {
    const unreadIds = notifs.filter((n) => !n.isRead).map((n) => n.id);
    if (!unreadIds.length) return;
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    const res = await markAllNotificationsRead(unreadIds);
    if (!res.success) void reload();
  }, [notifs, reload]);

  const deleteNotif = useCallback(
    async (id: string) => {
      setNotifs((prev) => prev.filter((n) => n.id !== id));
      const res = await deleteNotification(id);
      if (!res.success) void reload();
    },
    [reload],
  );

  const unreadCount = useMemo(
    () => notifs.filter((n) => !n.isRead).length,
    [notifs],
  );

  const value = useMemo(
    () => ({
      notifs,
      unreadCount,
      loading,
      error,
      reload,
      markAsRead,
      markAllRead,
      deleteNotif,
    }),
    [
      notifs,
      unreadCount,
      loading,
      error,
      reload,
      markAsRead,
      markAllRead,
      deleteNotif,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications harus digunakan di dalam NotificationProvider");
  }
  return context;
}

export function useUnreadNotificationCount(): number {
  return useNotifications().unreadCount;
}
