# Notification Unread-Count Badge Design

## Goal

Show a numeric unread notification badge on the header bell and on a new “Notifikasi” sidebar item for UMKM and Creator dashboards, with one shared unread-count source per role dashboard (single fetch + single realtime subscription).

## Constraints

- Current repository implementation is source of truth.
- No backend, database schema, or Appwrite Functions changes.
- No notification business-logic changes.
- No polling. Keep the existing Appwrite realtime mechanism.
- No unrelated refactors. No new state-management library.
- Preserve: notification dropdown, mark read, mark all read, delete, detail dialog, **full-page NotificationView list UX (tabs/pagination/skeleton/retry)**, mock-data mode, UMKM/Creator themes, responsive sidebar, active nav styling.
- NotificationView read-state changes must update the shared provider badge in the same session without a second realtime subscription.

## Architecture

### Approach (approved)

Role-scoped React context provider (Approach A), following existing patterns (`UmkmIdentityContext`, `CreatorIdentityContext`, `AuthProvider`).

### New file

`src/components/features/shared/NotificationProvider.tsx`

- `"use client"` context + provider + hooks.
- Sits beside notification UI consumers; not a global app provider.

### Provider mount points

| Role | Mount file | Placement |
|------|------------|-----------|
| UMKM | `src/app/dashboard/umkm/layout.tsx` | Inside `RoleGuard` / `UmkmIdentityProvider`, wrapping `children` |
| Creator | `src/app/dashboard/kreator/layout.tsx` | Inside `RoleGuard`, wrapping `CreatorDashboardChrome` |

**Why layout-level for UMKM:** each UMKM page remounts `UmkmDashboardChrome` independently. Mounting the provider on chrome would refetch + resubscribe on every navigation. Layout mount keeps one provider instance across UMKM route changes.

**Why layout-level for Creator:** single `CreatorDashboardChrome` already lives in the layout; wrapping at layout keeps symmetric mount rules and avoids editing chrome internals beyond what topbar cleanup needs.

Mount sites pass role once:

- UMKM: `<NotificationProvider role="umkm">`
- Creator: `<NotificationProvider role="creator">`

### Single source of truth

Provider owns:

1. `notifs: AppNotification[]` — full list for the role.
2. `unreadCount` — derived: `notifs.filter((n) => !n.isRead).length`.
3. `loading` / `error` — first-load and failed-load state (needed by full-page NotificationView skeleton + retry).
4. Initial `getNotifications(role)` load / `reload`.
5. One Appwrite realtime subscription on `tableChannels("notifications")`.
6. Mutations with optimistic UI + failure reload: `markAsRead`, `markAllRead`, `deleteNotif`.

Consumers under the same provider instance: `NotificationHeaderDropdown` (bell + list actions), both sidebars (count), **and `NotificationView` (full `/notifikasi` page list + mutations)**. No consumer keeps a second list source, second fetch loop, or second notifications realtime subscription. No polling.

**Exactly one `NotificationProvider` per dashboard role tree** (layout mounts only). Chrome, topbar, sidebar, dropdown, and NotificationView must not mount another provider.

## Context API

```ts
type NotificationRole = "umkm" | "creator";

interface NotificationContextValue {
  notifs: AppNotification[];
  unreadCount: number;
  /** true until the first getNotifications/reload settles */
  loading: boolean;
  /** last load failure message; null when OK */
  error: string | null;
  reload: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>; // marks all currently unread
  deleteNotif: (id: string) => Promise<void>;
}

function NotificationProvider(props: {
  role: NotificationRole;
  children: React.ReactNode;
}): JSX.Element;

/** Full context; used by NotificationHeaderDropdown and NotificationView. */
function useNotifications(): NotificationContextValue;

/** unreadCount only; used by sidebars. */
function useUnreadNotificationCount(): number;
```

Shared badge label helper — export from `NotificationProvider.tsx` (single module, no extra file):

```ts
function formatUnreadBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}
```

Rules: `0` → no badge; `1–9` → exact; `10+` → `"9+"`. Bell and both sidebars must call this same helper (no per-component copies of the capping rule).

`useNotifications` throws if used outside provider (same style as `useUmkmIdentity`). Sidebars use `useUnreadNotificationCount` so they only depend on the count selector.

## Data flow

```
layout (role)  ← single NotificationProvider mount per role
  └─ NotificationProvider
       ├─ load/reload: getNotifications(role) → setNotifs (+ loading/error)
       ├─ realtime (ONLY notifications subscription in app UI):
       │    tableChannels("notifications") → reload()
       ├─ mutations: optimistic setNotifs → service call → reload() on failure
       ├─ unreadCount = derived from notifs
       │
       ├─ *Topbar → NotificationHeaderDropdown (useNotifications)
       │    ├─ bell numeric badge ← unreadCount
       │    ├─ list ← notifs
       │    └─ mark-read / mark-all / delete ← provider mutations
       │
       ├─ DashboardSidebar / CreatorDashboardSidebar
       │    └─ useUnreadNotificationCount → Notifikasi item badge
       │
       └─ NotificationView (/dashboard/*/notifikasi)
            ├─ list / tabs / unread header copy ← notifs + unreadCount
            ├─ loading skeleton / error retry ← loading / error / reload
            └─ mark-read / mark-all / delete / detail-open ← provider mutations
                 → shared notifs update → bell + sidebar badges update same tick
```

## NotificationHeaderDropdown consumption

Current local ownership moves to the provider.

Remove from dropdown:

- local `notifs` state
- `loadNotifs` callback
- mount-load effect
- realtime subscribe effect
- local `markAsRead` / `handleMarkAllRead` / `handleDeleteNotif` bodies that call services (delegate to provider)

Keep local (UI-only):

- `selectedNotif`, `isDetailOpen`, `isDropdownOpen`
- `handleOpenDetail` flow (still calls `markAsRead` when unread)
- list rendering, empty state, header “N baru” pill, mark-all button, footer “Lihat Semua”, detail dialog wiring
- `theme` prop and UMKM/Creator color distinction

Consume:

```ts
const { notifs, unreadCount, markAsRead, markAllRead, deleteNotif } = useNotifications();
```

`recentNotifs` still `notifs.slice(0, 6)`.

### Bell badge UI

Replace the current ping-only dot as the primary indicator with a numeric badge on the trigger button:

- Visible only when `unreadCount > 0`.
- Label: `formatUnreadBadge(unreadCount)`.
- Absolutely positioned on the bell (attached to trigger), theme background:
  - UMKM: `bg-orange-500`
  - Creator: `bg-violet-600`
- White text, white ring/border so it stays legible on the white bell button.
- Keep existing `aria-label` logic: `` `Notifikasi, ${unreadCount} belum dibaca` `` / `"Notifikasi"`.
- Drop the separate animated ping-only dot (redundant once the number is primary). Keep per-item unread dots in the list and the header “N baru” pill unchanged.

## NotificationView consumption (full `/notifikasi` page)

`NotificationView` is rendered only under the role layouts that already mount `NotificationProvider` (`umkm/notifikasi` via `UmkmDashboardChrome` inside UMKM layout; `kreator/notifikasi` as layout child). It **must consume the provider** so page mutations cannot leave bell/sidebar badges stale.

### Remove from NotificationView (ownership moves to provider)

- local `notifs` state as source of truth
- local `load` / initial `getNotifications` ownership
- local realtime effect (`tableChannels("notifications")` + `realtimeClient.subscribe`) — **second subscription today; delete it**
- local `markAsRead` / `markAllAsRead` / `handleDeleteNotif` bodies that call `notification.service` directly

### Keep local (UI-only)

- `activeTab`, `visibleCount`, filter/pagination (`filtered`, `visible`, `loadMore`, `selectTab`, IntersectionObserver)
- `selectedNotif`, `isDetailOpen`
- `theme` → THEME styles / tab labels / accent colors only (data role comes from provider `role`, not re-derived for fetch)
- list row markup, empty/error/skeleton presentation
- `AppNotificationDetailDialog` wiring (`onDelete` → provider `deleteNotif`; action click → `router.push`)

### Consume

```ts
const {
  notifs,
  unreadCount,
  loading,
  error,
  reload,
  markAsRead,
  markAllRead,
  deleteNotif,
} = useNotifications();
```

- Skeleton when `loading`.
- Error panel + “Coba lagi” → `reload()` when `error`.
- Header copy / unread tab chip ← `unreadCount`.
- `handleOpenDetail` on unread → `markAsRead(notif.id)` (provider).
- “Tandai Dibaca” → `markAsRead`; “Tandai Semua Dibaca” → `markAllRead()` (provider computes unread ids from shared `notifs`).

`theme` prop remains for presentation; it does **not** start a second data pipeline.

## Sidebar “Notifikasi” item

### Nav entries

UMKM (`DashboardSidebar.tsx` → `SIDEBAR_NAV_ITEMS`):

- `label: "Notifikasi"`
- `href: "/dashboard/umkm/notifikasi"`
- `icon: Bell` (lucide-react)

Creator (`CreatorDashboardSidebar.tsx` → `SIDEBAR_ITEMS`):

- `label: "Notifikasi"`
- `href: "/dashboard/kreator/notifikasi"`
- `icon: Bell`

Placement: after existing primary nav items (UMKM: after Analitik; Creator: after Keuangan). Active state uses existing `pathname.startsWith(href)` rules — no special-casing required.

Routes already exist:

- `src/app/dashboard/umkm/notifikasi/page.tsx`
- `src/app/dashboard/kreator/notifikasi/page.tsx`

### Badge consumption

Each sidebar calls `useUnreadNotificationCount()` and renders `formatUnreadBadge(count)` only when non-null.

### Expanded vs collapsed

Sidebars use `collapsible="icon"` (`group-data-[collapsible=icon]`).

| State | Badge placement |
|-------|-----------------|
| Expanded | Inline pill beside the “Notifikasi” label (same pattern as Creator “Pekerjaan Aktif” count). Label row gets `flex-1` + end alignment where needed. |
| Collapsed | Small numeric pill absolutely positioned on the Bell icon (top-right). Label is hidden when collapsed; icon badge is shown only in collapsed mode (`group-data-[collapsible=icon]:…`). |

Constraints:

- `0` → no badge in either state.
- Badge must not change row height or break icon centering in collapsed mode.
- Tooltip still `Notifikasi` via existing `tooltip={item.label}`.
- Theme accents stay consistent with each sidebar (UMKM orange-tinted accents already on active items; Creator violet accents). Badge can use a neutral/red-style pill or theme accent — prefer high-contrast pill on dark sidebar (e.g. `bg-orange-500` UMKM / `bg-violet-500` Creator) with white number so it reads on `#0d1b2e`.

UMKM label span today lacks the creator’s `flex-1 … justify-between` structure; add minimal classes needed for the inline badge only — no broader nav markup rewrite.

## Realtime subscription lifecycle

Owned exclusively by `NotificationProvider`. **After this change, the only `realtimeClient.subscribe` + `tableChannels("notifications")` in dashboard UI code is inside the provider.**

Removed subscription sites (must not remain):

| File | Today | After |
|------|-------|-------|
| `NotificationHeaderDropdown.tsx` | subscribes | remove (use provider) |
| `NotificationView.tsx` | subscribes | remove (use provider) |
| `DashboardTopbar.tsx` | subscribes (dead count) | remove with dead logic |
| `CreatorDashboardTopbar.tsx` | subscribes (dead count) | remove with dead logic |

Negotiation room subscriptions use different channels — untouched, not “notification count” subscriptions.

```ts
useEffect(() => {
  void reload(); // initial getNotifications(role); sets loading/error
}, [reload]);

useEffect(() => {
  if (DATA_SOURCE_CONFIG.useMockData) return;
  const channels = tableChannels("notifications");
  if (channels.length === 0) return;
  return realtimeClient.subscribe(channels, () => {
    void reload();
  });
}, [reload]);
```

- Cleanup: rely on `realtimeClient.subscribe` return value (existing unsubscribe).
- No polling anywhere.
- Event → full `reload()` of the role list → derived `unreadCount` → bell + sidebar update. This is the path for **other-session / server-created** changes and a secondary confirmation after mutations.
- `role` change → stable `reload` identity via `useCallback([role])` → effects re-run; layouts fix role per dashboard tree.

## Read-state synchronization

### Same-session mutations (guaranteed, no realtime dependency)

Badge correctness for actions in the **same tab** does **not** wait for realtime. Every mutation runs **inside the provider**, updates shared `notifs` optimistically, and derived `unreadCount` re-renders bell + sidebar + page together.

| Source | Action | Mechanism (no second subscription) |
|--------|--------|-------------------------------------|
| Dropdown | open unread detail | `provider.markAsRead` → optimistic `notifs` → count drops |
| Dropdown | mark one / all read, delete | provider mutations → same |
| NotificationView | open `/notifikasi` detail on unread | `provider.markAsRead` → optimistic → **bell + sidebar update same tick** |
| NotificationView | “Tandai Dibaca” | `provider.markAsRead` → same |
| NotificationView | “Tandai Semua Dibaca” | `provider.markAllRead()` → all shared rows read → count `0`, badges clear |
| NotificationView / detail dialog | delete | `provider.deleteNotif` → row removed → count recomputed |
| Any consumer | mutation `res.success === false` | `reload()` rollback to server truth (existing pattern) |

### Role of existing Appwrite realtime (explicit)

1. **Client `updateDocument` (mark one read):** Appwrite emits a row/document update on `notifications` channels → provider handler runs `reload()` → list/count re-synced from server. Optimistic state already updated the badge first; realtime is confirmation + cross-client propagation.
2. **`markNotificationsRead` Function (mark all):** server-side writes may emit the same row events when the platform broadcasts them. **Badge must not depend on that emission** for the current tab: NotificationView and dropdown both call `provider.markAllRead()`, which optimistically marks shared `notifs` before/while the Function runs. If the Function path does not emit an event, same-session badge is already correct; other clients rely on the platform event when present (same as today).
3. **New notification created by backend/Function:** create event → provider `reload()` → count increases.
4. **Mock mode / no event / channels empty:** no realtime; same-session badge still correct via provider mutations; cross-session sync unavailable (same limitation as today, no new subscription added).

Mutations call existing `notification.service` functions only — no service edits.

Failure handling matches current dropdown behavior: optimistic first, `reload()` when `res.success` is false. No new toast/error UI in this change.

## Mock-data mode

- `getNotifications` already serves mock arrays when `DATA_SOURCE_CONFIG.useMockData`.
- Realtime effect no-ops when `useMockData` (existing guard).
- Optimistic mark-read/all/delete still apply locally; service mock paths return success (no reload needed on success).
- Provider must not introduce any extra network or Appwrite calls beyond current service usage.

## Dead/redundant topbar logic (remove)

Confirmed unused: both topbars compute `unreadCount` but never render it; bell UI lives only in `NotificationHeaderDropdown`.

### `DashboardTopbar.tsx`

Remove only:

- `unreadCount` state, `loadUnreadCount`, both notification effects
- imports: `getNotifications`, `DATA_SOURCE_CONFIG`, `realtimeClient`, `tableChannels`
- unused `Bell` import
- `useCallback` / `useEffect` / `useState` imports if nothing else needs them

Keep: breadcrumbs, page meta, hamburger, brand, profile link, `<NotificationHeaderDropdown theme="umkm" />`.

### `CreatorDashboardTopbar.tsx`

Same removals for creator role (`getNotifications("creator")` block).

Keep: breadcrumbs, CTA, profile, `<NotificationHeaderDropdown theme="kreator" />`.

No other topbar behavior changes.

## Out of scope

- NotificationView keeps its **own** fetch/realtime/mutation pipeline — **explicitly NOT out of scope to break**: it must switch to the provider (see NotificationView section). Tabs/pagination UI stay local.
- Negotiation unread chips (`NegotiationRoomCard`, negotiation list / `NegosiasiView`) untouched.
- Admin app notification UI untouched.
- Backend / Functions / schema / service layer untouched.
- No dependency or state-library additions.

## Files expected to change

| File | Change |
|------|--------|
| `src/components/features/shared/NotificationProvider.tsx` | **New** — context, load/reload, loading/error, realtime, mutations, badge helper, hooks |
| `src/app/dashboard/umkm/layout.tsx` | Wrap children with provider `role="umkm"` (only UMKM mount) |
| `src/app/dashboard/kreator/layout.tsx` | Wrap chrome with provider `role="creator"` (only Creator mount) |
| `src/components/features/shared/NotificationHeaderDropdown.tsx` | Consume provider; numeric bell badge; drop local fetch/realtime/mutation state |
| `src/components/features/shared/NotificationView.tsx` | Consume provider for list + mutations + loading/error; **remove local realtime subscription and service mutation ownership** |
| `src/components/features/dashboard/DashboardSidebar.tsx` | Notifikasi nav item + unread badge (expanded/collapsed) |
| `src/components/features/creator-dashboard/CreatorDashboardSidebar.tsx` | Notifikasi nav item + unread badge (expanded/collapsed) |
| `src/components/features/dashboard/DashboardTopbar.tsx` | Remove dead notification logic/imports only |
| `src/components/features/creator-dashboard/CreatorDashboardTopbar.tsx` | Remove dead notification logic/imports only |

## Verification

### Commands

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build` (if practical)
4. `npm run test` / `npm run test:unit` (affected unit/integration tests)

### Architecture invariants (must hold after implementation)

1. **One provider per role tree**
   - Grep `NotificationProvider` mounts: **only** `src/app/dashboard/umkm/layout.tsx` and `src/app/dashboard/kreator/layout.tsx`.
   - No provider inside `UmkmDashboardChrome`, `CreatorDashboardChrome`, topbars, sidebars, dropdown, or NotificationView.

2. **All count consumers under provider**
   - Every `NotificationHeaderDropdown` mount (both topbars) is under the role layout → provider.
   - `DashboardSidebar` + `CreatorDashboardSidebar` render under chrome under layout → provider.
   - `NotificationView` on both `/notifikasi` pages under layout → provider.
   - No consumer of `useNotifications` / `useUnreadNotificationCount` outside those trees (or a test wrapper).

3. **Single notifications realtime subscription**
   - Grep `tableChannels("notifications")` and notification-related `realtimeClient.subscribe`: **only** `NotificationProvider.tsx`.
   - Topbars, dropdown, NotificationView: zero notifications subscriptions remaining.
   - No polling introduced (`setInterval` / refetch loops for unread count: none).

4. **Tests**
   - Existing: `umkm-review-navigation.test.tsx` imports static `SIDEBAR_NAV_ITEMS` only — no provider required; keep assertion for Negosiasi → Review Pekerjaan; confirm adding Notifikasi (after Analitik) does not break order assertions.
   - No current unit test renders `NotificationHeaderDropdown` or full sidebars (verified at design time).
   - If any test/component render is added or found that mounts dropdown, sidebar, or NotificationView without provider: wrap with `NotificationProvider` (mock service as needed) **or** mock `useNotifications` / `useUnreadNotificationCount` — do not leave failing renders.
   - Prefer at least one test or static guard covering `formatUnreadBadge` (`0` → null, `9` → `"9"`, `10` → `"9+"`) if cheap; otherwise cover via typecheck/manual.

### Functional manual checks

- Bell shows `1–9` exact, `10+` → `9+`, `0` → hidden.
- Sidebar Notifikasi badge matches bell count (expanded and collapsed).
- From `/dashboard/*/notifikasi`: open unread detail, mark one read, mark all read → **badge on bell + sidebar updates immediately** (same session, no navigation).
- Dropdown mark one / all / delete → sidebar badge follows.
- Expanded + collapsed sidebar layouts intact; no clipped pill at icon width.
- Realtime new notification increments count (non-mock).
- Mock mode: list + optimistic mutations work; no realtime errors.
- Active nav styling for Notifikasi route.
- UMKM orange vs Creator violet distinctions preserved.

## Risks

1. **Duplicate provider mount** — layout-only mounts are the invariant; chrome-level remount on UMKM nav would refetch/resubscribe. Verification greps for single mount per role.
2. **NotificationView still on old pipeline if migration missed** — stale badge after `/notifikasi` mark-all. Mitigation: explicit remove of local subscribe + service mutations; manual check in Verification.
3. **Collapsed icon badge density** — `"9+"` on 20px icon is tight; compact min-width pill; verify at `SIDEBAR_WIDTH_ICON` (4.5rem).
4. **Provider throw outside tree** — tests/render trees without provider fail loudly; wrap or mock hooks (see Verification §Tests).
5. **Subscriptions today: 4 notifications UI subscriptions** (2 topbar dead + dropdown + NotificationView) → **must become 1** (provider only). Grep gate in Verification.
6. **mark-all Function may not emit row events to other clients** — same-session badge safe via provider optimistic shared state; cross-client depends on platform realtime (unchanged from today).
