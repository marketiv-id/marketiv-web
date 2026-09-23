# Notification Unread-Count Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Numeric unread badge on notification bell + “Notifikasi” sidebar item for UMKM and Creator, driven by one role-scoped `NotificationProvider` (single fetch + single notifications realtime subscription).

**Architecture:** Layout-mounted React context owns `notifs`, derived `unreadCount`, loading/error, optimistic mutations, and the only `tableChannels("notifications")` subscription. `NotificationHeaderDropdown`, both sidebars, and `NotificationView` consume that context. Dead topbar unread logic is removed.

**Tech Stack:** Next.js App Router, React 19 context, Appwrite client realtime (`realtimeClient.subscribe`), lucide-react `Bell`, Tailwind + existing `cn`, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-23-notification-unread-badge-design.md`
- No backend / database schema / Appwrite Functions changes.
- No notification business-logic or `notification.service` / `notification-appwrite.service` edits.
- No polling (`setInterval`, refetch loops for unread count).
- No second notifications realtime subscription — after implementation grep `tableChannels("notifications")` hits **only** `NotificationProvider.tsx`.
- Exactly one `NotificationProvider` mount per role: only `src/app/dashboard/umkm/layout.tsx` and `src/app/dashboard/kreator/layout.tsx`.
- No new state-management library; no unrelated refactors.
- Badge format (shared `formatUnreadBadge`): `0` → no badge (`null`); `1–9` → exact string; `10+` → `"9+"`.
- Preserve dropdown list UX, mark one/all read, delete, detail dialog, NotificationView tabs/pagination/skeleton/retry, mock-data mode, UMKM orange vs Creator violet themes, responsive/collapsed sidebar, active nav styling.
- Commits only when the human explicitly approves them in the execution session (repo rule). Commit steps below are for that approval gate.

---

### Task 1: NotificationProvider + formatUnreadBadge + tests

**Files:**
- Create: `src/components/features/shared/NotificationProvider.tsx`
- Create: `src/components/features/shared/__tests__/NotificationProvider.test.tsx`

**Interfaces:**
- Consumes: `getNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `deleteNotification` from `@/services/shared/notification.service`; `realtimeClient`, `tableChannels` from `@/lib/appwrite/realtime`; `DATA_SOURCE_CONFIG` from `@/config/data-source.config`; `AppNotification`, `UserRole`.
- Produces (later tasks depend on these exact names):
  - `type NotificationRole = "umkm" | "creator"`
  - `NotificationProvider({ role, children })`
  - `useNotifications(): NotificationContextValue` with `{ notifs, unreadCount, loading, error, reload, markAsRead, markAllRead, deleteNotif }`
  - `useUnreadNotificationCount(): number`
  - `formatUnreadBadge(count: number): string | null`

- [ ] **Step 1: Write failing tests for formatUnreadBadge + provider hooks**

Create `src/components/features/shared/__tests__/NotificationProvider.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppNotification } from "@/types/notification.types";

const mocks = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotification: vi.fn(),
  subscribe: vi.fn(() => () => {}),
}));

vi.mock("@/services/shared/notification.service", () => ({
  getNotifications: mocks.getNotifications,
  markNotificationRead: mocks.markNotificationRead,
  markAllNotificationsRead: mocks.markAllNotificationsRead,
  deleteNotification: mocks.deleteNotification,
}));

vi.mock("@/lib/appwrite/realtime", () => ({
  realtimeClient: { subscribe: mocks.subscribe },
  tableChannels: (table: string) => [`databases.db.tables.${table}.rows`],
}));

vi.mock("@/config/data-source.config", () => ({
  DATA_SOURCE_CONFIG: { useMockData: false },
}));

import {
  NotificationProvider,
  formatUnreadBadge,
  useNotifications,
  useUnreadNotificationCount,
} from "../NotificationProvider";

function notif(id: string, isRead: boolean): AppNotification {
  return {
    id,
    type: "sistem",
    title: id,
    message: "m",
    timestamp: new Date().toISOString(),
    isRead,
  };
}

function Probe() {
  const state = useNotifications();
  const count = useUnreadNotificationCount();
  return (
    <div>
      <span data-testid="count">{count}</span>
      <span data-testid="loading">{String(state.loading)}</span>
      <span data-testid="error">{state.error ?? ""}</span>
      <span data-testid="len">{state.notifs.length}</span>
      <button
        data-testid="mark-one"
        type="button"
        onClick={() => void state.markAsRead("n1")}
      >
        one
      </button>
      <button
        data-testid="mark-all"
        type="button"
        onClick={() => void state.markAllRead()}
      >
        all
      </button>
      <button
        data-testid="delete"
        type="button"
        onClick={() => void state.deleteNotif("n1")}
      >
        del
      </button>
      <button data-testid="reload" type="button" onClick={() => void state.reload()}>
        reload
      </button>
    </div>
  );
}

describe("formatUnreadBadge", () => {
  it("returns null for 0 and negatives", () => {
    expect(formatUnreadBadge(0)).toBeNull();
    expect(formatUnreadBadge(-1)).toBeNull();
  });

  it("returns exact number for 1-9", () => {
    expect(formatUnreadBadge(1)).toBe("1");
    expect(formatUnreadBadge(9)).toBe("9");
  });

  it("caps at 9+ for 10 and above", () => {
    expect(formatUnreadBadge(10)).toBe("9+");
    expect(formatUnreadBadge(100)).toBe("9+");
  });
});

describe("NotificationProvider", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.getNotifications.mockReset();
    mocks.markNotificationRead.mockReset();
    mocks.markAllNotificationsRead.mockReset();
    mocks.deleteNotification.mockReset();
    mocks.subscribe.mockClear();
    mocks.getNotifications.mockResolvedValue({
      success: true,
      data: [notif("n1", false), notif("n2", false), notif("n3", true)],
    });
    mocks.markNotificationRead.mockResolvedValue({ success: true, data: null });
    mocks.markAllNotificationsRead.mockResolvedValue({ success: true, data: null });
    mocks.deleteNotification.mockResolvedValue({ success: true, data: null });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  async function renderProvider() {
    act(() => {
      root.render(
        <NotificationProvider role="umkm">
          <Probe />
        </NotificationProvider>,
      );
    });
    await act(async () => {});
  }

  it("loads notifs, derives unreadCount, opens one realtime subscription", async () => {
    await renderProvider();
    expect(mocks.getNotifications).toHaveBeenCalledWith("umkm");
    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe("2");
    expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe("false");
    expect(mocks.subscribe).toHaveBeenCalledTimes(1);
  });

  it("optimistically marks one read and updates count", async () => {
    await renderProvider();
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="mark-one"]')?.click();
    });
    expect(mocks.markNotificationRead).toHaveBeenCalledWith("n1");
    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe("1");
  });

  it("optimistically marks all read using current unread ids", async () => {
    await renderProvider();
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="mark-all"]')?.click();
    });
    expect(mocks.markAllNotificationsRead).toHaveBeenCalledWith(["n1", "n2"]);
    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe("0");
  });

  it("optimistically deletes and recomputes count", async () => {
    await renderProvider();
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="delete"]')?.click();
    });
    expect(mocks.deleteNotification).toHaveBeenCalledWith("n1");
    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe("1");
    expect(container.querySelector('[data-testid="len"]')?.textContent).toBe("2");
  });

  it("rolls back via reload when mark-as-read fails", async () => {
    mocks.markNotificationRead.mockResolvedValue({ success: false, error: "x" });
    await renderProvider();
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="mark-one"]')?.click();
    });
    expect(mocks.getNotifications.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe("2");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/features/shared/__tests__/NotificationProvider.test.tsx`
Expected: FAIL — module `../NotificationProvider` not found.

- [ ] **Step 3: Implement NotificationProvider**

Create `src/components/features/shared/NotificationProvider.tsx`:

```tsx
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
  reload: () => Promise<void>;
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

  const reload = useCallback(async () => {
    const res = await getNotifications(role);
    if (res.success && res.data) {
      setNotifs(res.data);
      setError(null);
    } else {
      setNotifs([]);
      setError(res.error ?? "Gagal memuat notifikasi.");
    }
    setLoading(false);
  }, [role]);

  useEffect(() => {
    setLoading(true);
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/features/shared/__tests__/NotificationProvider.test.tsx`
Expected: PASS (all cases).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit (only if human approves)**

```bash
git add src/components/features/shared/NotificationProvider.tsx src/components/features/shared/__tests__/NotificationProvider.test.tsx
git commit -m "feat(notification): add role-scoped NotificationProvider with unread badge helper"
```

---

### Task 2: Mount provider in UMKM + Creator layouts

**Files:**
- Modify: `src/app/dashboard/umkm/layout.tsx`
- Modify: `src/app/dashboard/kreator/layout.tsx`

**Interfaces:**
- Consumes: `NotificationProvider`, `NotificationRole` from Task 1.
- Produces: provider tree for all dashboard consumers (Tasks 3–6). Mount sites only — no other file may mount `NotificationProvider`.

- [ ] **Step 1: Wrap UMKM layout children**

Replace `src/app/dashboard/umkm/layout.tsx` with:

```tsx
import { ReactNode } from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { UmkmIdentityProvider } from "@/components/features/dashboard/UmkmIdentityContext";
import { NotificationProvider } from "@/components/features/shared/NotificationProvider";

/**
 * Boundary guard segment UMKM.
 * Chrome dashboard tetap dirender per-page; layout ini menegakkan role dan menyediakan UmkmIdentityProvider + NotificationProvider (satu instance lintas navigasi).
 */
export default function UmkmDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="umkm">
      <UmkmIdentityProvider>
        <NotificationProvider role="umkm">{children}</NotificationProvider>
      </UmkmIdentityProvider>
    </RoleGuard>
  );
}
```

- [ ] **Step 2: Wrap Creator layout chrome**

Replace `src/app/dashboard/kreator/layout.tsx` with:

```tsx
import { ReactNode } from "react";
import { CreatorDashboardChrome } from "@/components/features/creator-dashboard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { NotificationProvider } from "@/components/features/shared/NotificationProvider";

interface CreatorLayoutProps {
  children: ReactNode;
}

export default function CreatorLayout({ children }: CreatorLayoutProps) {
  return (
    <RoleGuard role="creator">
      <NotificationProvider role="creator">
        <CreatorDashboardChrome>{children}</CreatorDashboardChrome>
      </NotificationProvider>
    </RoleGuard>
  );
}
```

- [ ] **Step 3: Grep mount invariant**

Run: `rg -n "NotificationProvider" src`
Expected: definition in `NotificationProvider.tsx` + imports/mounts only in the two layout files (consumers come later as imports of hooks, not mounts).

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 5: Commit (only if human approves)**

```bash
git add src/app/dashboard/umkm/layout.tsx src/app/dashboard/kreator/layout.tsx
git commit -m "feat(notification): mount NotificationProvider at role layouts"
```

---

### Task 3: NotificationHeaderDropdown consumes provider + numeric bell badge

**Files:**
- Modify: `src/components/features/shared/NotificationHeaderDropdown.tsx`

**Interfaces:**
- Consumes: `useNotifications`, `formatUnreadBadge` from Task 1; provider tree from Task 2.
- Produces: bell numeric badge UI; no local fetch/realtime/service mutations in this file.

- [ ] **Step 1: Replace data ownership with provider**

In `NotificationHeaderDropdown.tsx`:

1. Remove imports: `useCallback`, `useEffect` (keep `useState`), `getNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `deleteNotification`, `DATA_SOURCE_CONFIG`, `realtimeClient`, `tableChannels`.
2. Add import:

```ts
import {
  useNotifications,
  formatUnreadBadge,
} from "./NotificationProvider";
```

3. Replace state/effects block (from `const [notifs, setNotifs] = useState...` through `const unreadCount = notifs.filter...` and the three mutation handlers) with:

```ts
const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);
const [isDetailOpen, setIsDetailOpen] = useState(false);
const [isDropdownOpen, setIsDropdownOpen] = useState(false);

const {
  notifs,
  unreadCount,
  markAsRead,
  markAllRead,
  deleteNotif,
} = useNotifications();

const isKreator = theme === "kreator";
const viewAllHref = isKreator ? "/dashboard/kreator/notifikasi" : "/dashboard/umkm/notifikasi";
const badgeBg = isKreator ? "bg-violet-600" : "bg-orange-500";
const textAccent = isKreator ? "text-violet-600 hover:text-violet-700" : "text-orange-600 hover:text-orange-700";

const recentNotifs = notifs.slice(0, 6);

const handleOpenDetail = (notif: AppNotification) => {
  setIsDropdownOpen(false);
  setSelectedNotif(notif);
  setIsDetailOpen(true);
  if (!notif.isRead) {
    void markAsRead(notif.id);
  }
};
```

4. Update JSX call sites:
   - Mark-all button: `onClick={() => void markAllRead()}`
   - Detail dialog: `onDelete={(id) => void deleteNotif(id)}`
   - Remove `loadNotifs` references entirely.

- [ ] **Step 2: Replace ping dot with numeric badge**

Replace the unread indicator inside the trigger button:

```tsx
<Bell size={20} strokeWidth={2} />
{unreadCount > 0 && (
  <span
    className={cn(
      "absolute -top-1 -right-1 z-10 flex h-4 min-w-[16px] max-w-[28px] items-center justify-center rounded-full border-2 border-white px-0.5 text-[10px] font-black leading-none text-white",
      badgeBg,
    )}
  >
    {formatUnreadBadge(unreadCount)}
  </span>
)}
```

Keep existing `aria-label={unreadCount > 0 ? \`Notifikasi, ${unreadCount} belum dibaca\` : "Notifikasi"}` unchanged.

- [ ] **Step 3: Typecheck + lint file**

Run: `npm run typecheck && npx eslint src/components/features/shared/NotificationHeaderDropdown.tsx`
Expected: exit 0.

- [ ] **Step 4: Commit (only if human approves)**

```bash
git add src/components/features/shared/NotificationHeaderDropdown.tsx
git commit -m "feat(notification): numeric bell badge from shared provider"
```

---

### Task 4: NotificationView consumes provider (drop local realtime + service mutations)

**Files:**
- Modify: `src/components/features/shared/NotificationView.tsx`

**Interfaces:**
- Consumes: `useNotifications` from Task 1 (list, count, loading, error, reload, mutations).
- Produces: page mutations that update provider state in the same session (badge sync requirement from spec).

- [ ] **Step 1: Swap data layer to provider**

1. Remove imports: `useEffect` only if unused after edit — keep `useState`, `useRef`, `useCallback` for tabs/pagination; remove `getNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `deleteNotification`, `DATA_SOURCE_CONFIG`, `realtimeClient`, `tableChannels`.
2. Add:

```ts
import { useNotifications } from "./NotificationProvider";
```

3. Replace local notifs/load/realtime/mutations with:

```ts
const {
  notifs,
  unreadCount,
  loading: isLoading,
  error: loadError,
  reload,
  markAsRead,
  markAllRead,
  deleteNotif,
} = useNotifications();
```

4. Delete: `load` callback, mount `useEffect` load, realtime `useEffect`, `retry` body becomes `() => { void reload(); }`, local `markAsRead` / `markAllAsRead` / `handleDeleteNotif` function bodies that call services.
5. Update JSX:
   - Mark-all button: `onClick={() => void markAllRead()}`
   - “Tandai Dibaca”: `onClick={() => { e.stopPropagation(); void markAsRead(notif.id); }}`
   - Quick delete: `onClick={() => { e.stopPropagation(); void deleteNotif(notif.id); }}`
   - Detail dialog: `onDelete={(id) => void deleteNotif(id)}`
   - Delete local `const unreadCount = notifs.filter...` (use provider value).
   - Keep `role` only if still needed for types; prefer removing unused `UserRole` import if `role` local is removed.

6. Keep: tabs, pagination, IntersectionObserver, selectedNotif, isDetailOpen, THEME, loading/error/empty UI branches.

- [ ] **Step 2: Grep — no second notifications subscription**

Run: `rg -n 'tableChannels\\("notifications"\\)' src`
Expected: only `src/components/features/shared/NotificationProvider.tsx`.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npx eslint src/components/features/shared/NotificationView.tsx`
Expected: exit 0.

- [ ] **Step 4: Commit (only if human approves)**

```bash
git add src/components/features/shared/NotificationView.tsx
git commit -m "refactor(notification): NotificationView reads provider state"
```

---

### Task 5: UMKM sidebar Notifikasi item + unread badge

**Files:**
- Modify: `src/components/features/dashboard/DashboardSidebar.tsx`

**Interfaces:**
- Consumes: `useUnreadNotificationCount`, `formatUnreadBadge` from Task 1.
- Produces: nav entry `href: "/dashboard/umkm/notifikasi"`; badge in expanded label + collapsed icon.

- [ ] **Step 1: Add Bell import + nav item**

1. Add `Bell` to the lucide-react import list.
2. Append to `SIDEBAR_NAV_ITEMS` **after Analitik**:

```ts
{ label: "Notifikasi", href: "/dashboard/umkm/notifikasi", icon: Bell },
```

- [ ] **Step 2: Read count inside component**

After `const isCollapsed = state === "collapsed";` add:

```ts
const unreadNotifCount = useUnreadNotificationCount();
const notifBadge = formatUnreadBadge(unreadNotifCount);
```

Import:

```ts
import {
  useUnreadNotificationCount,
  formatUnreadBadge,
} from "@/components/features/shared/NotificationProvider";
```

- [ ] **Step 3: Render badge expanded + collapsed**

Inside the nav map, compute:

```ts
const badge =
  item.href === "/dashboard/umkm/notifikasi" ? notifBadge : null;
```

**Icon wrapper** — replace the bare `<item.icon ... />` with:

```tsx
<span className="relative shrink-0">
  <item.icon
    size={22}
    className={cn(
      "shrink-0 transition-all duration-200",
      isActive
        ? "text-orange-400 group-hover:text-orange-400"
        : "text-white/30 group-hover:text-white/70",
    )}
  />
  {badge && (
    <span
      className={cn(
        "hidden group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-top-1 group-data-[collapsible=icon]:-right-1.5",
        "group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:min-w-[16px] group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center",
        "group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:px-0.5 group-data-[collapsible=icon]:text-[9px] group-data-[collapsible=icon]:font-black group-data-[collapsible=icon]:leading-none",
        "bg-orange-500 text-white border border-[#0d1b2e]",
      )}
    >
      {badge}
    </span>
  )}
</span>
```

**Label** — replace label `<span>` content so expanded badge sits at end without breaking collapsed hide:

```tsx
<span
  className={cn(
    "text-[0.95rem] tracking-[-0.015em] group-data-[collapsible=icon]:hidden transition-colors duration-200 flex-1 flex items-center justify-between gap-2 min-w-0",
    isActive
      ? "font-[760] text-white group-hover:text-white"
      : "font-[640] text-white/45 group-hover:text-white/80",
  )}
>
  <span className="truncate">{item.label}</span>
  {badge && (
    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-black leading-none text-white shrink-0">
      {badge}
    </span>
  )}
</span>
```

- [ ] **Step 4: Keep navigation test green**

Run: `npx vitest run src/components/features/dashboard/__tests__/umkm-review-navigation.test.tsx`
Expected: PASS (Notifikasi added after Analitik; Negosiasi → Review Pekerjaan order unchanged).

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npx eslint src/components/features/dashboard/DashboardSidebar.tsx`
Expected: exit 0.

- [ ] **Step 6: Commit (only if human approves)**

```bash
git add src/components/features/dashboard/DashboardSidebar.tsx
git commit -m "feat(notification): UMKM sidebar Notifikasi badge"
```

---

### Task 6: Creator sidebar Notifikasi item + unread badge

**Files:**
- Modify: `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx`

**Interfaces:**
- Consumes: `useUnreadNotificationCount`, `formatUnreadBadge` from Task 1.
- Produces: nav entry `href: "/dashboard/kreator/notifikasi"`; badge expanded + collapsed (violet).

- [ ] **Step 1: Add Bell import + nav item**

1. Add `Bell` to lucide-react imports.
2. Append to `SIDEBAR_ITEMS` **after Keuangan**:

```ts
{ label: "Notifikasi", href: "/dashboard/kreator/notifikasi", icon: Bell },
```

- [ ] **Step 2: Read count**

```ts
const unreadNotifCount = useUnreadNotificationCount();
const notifBadge = formatUnreadBadge(unreadNotifCount);
```

Import from `@/components/features/shared/NotificationProvider`.

- [ ] **Step 3: Render badge (mirror Task 5, violet)**

In the map:

```ts
const badge =
  item.href === "/dashboard/kreator/notifikasi" ? notifBadge : null;
```

**Icon wrapper** (violet pill, collapsed only):

```tsx
<span className="relative shrink-0">
  <item.icon
    className={cn(
      "h-5 w-5 shrink-0 transition-all duration-200",
      isActive
        ? "text-violet-400 group-hover:text-violet-400"
        : "text-white/30 group-hover:text-white/70",
    )}
  />
  {badge && (
    <span
      className={cn(
        "hidden group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-top-1 group-data-[collapsible=icon]:-right-1.5",
        "group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:min-w-[16px] group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center",
        "group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:px-0.5 group-data-[collapsible=icon]:text-[9px] group-data-[collapsible=icon]:font-black group-data-[collapsible=icon]:leading-none",
        "bg-violet-500 text-white border border-[#0d1b2e]",
      )}
    >
      {badge}
    </span>
  )}
</span>
```

**Label** — extend existing label span (already `flex-1 justify-between`):

```tsx
<span className="truncate">{item.label}</span>
{badge && (
  <span className="ml-2 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-500 px-1 text-[9px] font-black leading-none text-white shrink-0">
    {badge}
  </span>
)}
{item.href === "/dashboard/kreator/pekerjaan-aktif" && activeJobsCount > 0 && (
  <span className="ml-2 inline-flex items-center justify-center h-5 px-1.5 rounded-full text-[0.68rem] font-extrabold bg-violet-500/25 text-violet-300 border border-violet-500/30">
    {activeJobsCount}
  </span>
)}
```

(Keep existing pekerjaan-aktif count badge unchanged.)

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npx eslint src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx`
Expected: exit 0.

- [ ] **Step 5: Commit (only if human approves)**

```bash
git add src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx
git commit -m "feat(notification): Creator sidebar Notifikasi badge"
```

---

### Task 7: Remove dead topbar notification logic

**Files:**
- Modify: `src/components/features/dashboard/DashboardTopbar.tsx`
- Modify: `src/components/features/creator-dashboard/CreatorDashboardTopbar.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: topbars without notification fetch/realtime/state; dropdown mount unchanged.

- [ ] **Step 1: Clean DashboardTopbar**

Remove:

- `useCallback, useEffect, useState` import — delete entire React state import line if no remaining hooks from it (`useState`/`useEffect`/`useCallback` all unused after cleanup → remove `import { useCallback, useEffect, useState } from "react";`).
- `Bell` from lucide (keep `Menu`).
- `getNotifications`, `DATA_SOURCE_CONFIG`, `realtimeClient`, `tableChannels` imports.
- `const [unreadCount, setUnreadCount] = useState(0);`
- `loadUnreadCount` function and both `useEffect` blocks that call it / subscribe.

Keep `NotificationHeaderDropdown` import and `<NotificationHeaderDropdown theme="umkm" />`.

- [ ] **Step 2: Clean CreatorDashboardTopbar**

Same removals:

- React hook imports if fully unused.
- `Bell` (keep `Menu`).
- `getNotifications`, `DATA_SOURCE_CONFIG`, `realtimeClient`, `tableChannels`.
- `unreadCount` state, `loadUnreadCount`, both effects.

Keep `<NotificationHeaderDropdown theme="kreator" />`.

- [ ] **Step 3: Grep subscriptions + typecheck**

Run:

```bash
rg -n 'tableChannels\\("notifications"\\)' src
npm run typecheck
```

Expected:

- `tableChannels("notifications")` → **only** `NotificationProvider.tsx`.
- typecheck exit 0.

- [ ] **Step 4: Lint both files**

Run: `npx eslint src/components/features/dashboard/DashboardTopbar.tsx src/components/features/creator-dashboard/CreatorDashboardTopbar.tsx`
Expected: exit 0.

- [ ] **Step 5: Commit (only if human approves)**

```bash
git add src/components/features/dashboard/DashboardTopbar.tsx src/components/features/creator-dashboard/CreatorDashboardTopbar.tsx
git commit -m "chore(notification): drop dead topbar unread logic"
```

---

### Task 8: Full verification (commands + architecture gates)

**Files:**
- No production code changes unless a gate fails (then fix in the owning task’s files only).

**Interfaces:**
- Consumes: Tasks 1–7.
- Produces: green typecheck/lint/tests/build + architecture invariants report for the human.

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 3: Unit/integration tests**

Run: `npx vitest run`
Expected: PASS. Must include `NotificationProvider.test.tsx` and `umkm-review-navigation.test.tsx`.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: exit 0 (if environment allows Next build).

- [ ] **Step 5: Architecture greps**

Run:

```bash
rg -n "NotificationProvider" src
rg -n 'tableChannels\\("notifications"\\)' src
rg -n "useUnreadNotificationCount|useNotifications" src
```

Expected:

1. `NotificationProvider` **JSX mount** only in `src/app/dashboard/umkm/layout.tsx` and `src/app/dashboard/kreator/layout.tsx` (other hits = import of hooks/module only).
2. `tableChannels("notifications")` **only** in `NotificationProvider.tsx`.
3. Hook consumers: `NotificationHeaderDropdown`, `NotificationView`, `DashboardSidebar`, `CreatorDashboardSidebar` (and provider definition).

- [ ] **Step 6: Manual QA checklist (report results to human)**

- Bell: `1–9` exact, `10+` → `9+`, `0` → hidden; `aria-label` includes count when >0.
- Sidebar Notifikasi badge equals bell count; expanded pill on label; collapsed pill on icon; layout intact at collapsed width.
- `/dashboard/umkm/notifikasi` + `/dashboard/kreator/notifikasi`: open unread detail, mark one, mark all → bell + sidebar update **immediately**.
- Dropdown mark one/all/delete → sidebar follows.
- Mock mode (`NEXT_PUBLIC_USE_MOCK_DATA=true`): list + optimistic mutations; no realtime errors.
- Active nav + orange/violet theme intact.

- [ ] **Step 7: Report**

Provide human with: changed files, architecture/data-flow summary, typecheck/lint/test/build results (only if executed), remaining risks.

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
|--------------|------|
| Provider API + formatUnreadBadge | 1 |
| Mount UMKM/Creator layouts, one per role | 2 |
| Dropdown + numeric bell badge | 3 |
| NotificationView provider consumption + no 2nd subscription | 4 |
| UMKM sidebar item/badge expanded/collapsed | 5 |
| Creator sidebar item/badge expanded/collapsed | 6 |
| Dead topbar removal | 7 |
| Realtime only in provider; verification gates; commands | 7–8 |
| Read-state sync matrix (optimistic + rollback) | 1 tests + 3/4 call sites |
| Mock mode (service + subscribe guard) | 1 (provider), preserved service |
| Out of scope (service/schema/no poll) | Global Constraints |

**2. Placeholder scan:** No TBD/TODO; all code steps include full snippets; no “similar to Task N” for code blocks.

**3. Type consistency:** `NotificationRole`, `useNotifications` fields, `markAllRead()` no-arg, `formatUnreadBadge` used in Tasks 3/5/6 match Task 1 exports.
