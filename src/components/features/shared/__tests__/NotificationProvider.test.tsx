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
      <button
        data-testid="reload-show-loading"
        type="button"
        onClick={() => void state.reload({ showLoading: true })}
      >
        reload loading
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

  it("keeps previous list when reload fails with service error result", async () => {
    await renderProvider();
    mocks.getNotifications.mockResolvedValue({ success: false, error: "boom" });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="reload"]')?.click();
    });
    expect(container.querySelector('[data-testid="len"]')?.textContent).toBe("3");
    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe("2");
    expect(container.querySelector('[data-testid="error"]')?.textContent).toBe("boom");
    expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe("false");
  });

  it("keeps previous list and settles loading when getNotifications throws", async () => {
    await renderProvider();
    mocks.getNotifications.mockRejectedValue(new Error("net"));
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="reload"]')?.click();
    });
    expect(container.querySelector('[data-testid="len"]')?.textContent).toBe("3");
    expect(container.querySelector('[data-testid="error"]')?.textContent).toBe("net");
    expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe("false");
  });

  it("reload without showLoading does not set loading true", async () => {
    await renderProvider();
    let resolvePending!: (v: unknown) => void;
    mocks.getNotifications.mockReturnValue(
      new Promise((resolve) => {
        resolvePending = resolve;
      }),
    );
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="reload"]')?.click();
    });
    expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe("false");
    await act(async () => {
      resolvePending({ success: true, data: [notif("n1", false)] });
    });
    expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe("false");
  });

  it("reload with showLoading sets loading true while pending", async () => {
    await renderProvider();
    let resolvePending!: (v: unknown) => void;
    mocks.getNotifications.mockReturnValue(
      new Promise((resolve) => {
        resolvePending = resolve;
      }),
    );
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="reload-show-loading"]')?.click();
    });
    expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe("true");
    await act(async () => {
      resolvePending({ success: true, data: [notif("n1", false)] });
    });
    expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe("false");
  });
});
