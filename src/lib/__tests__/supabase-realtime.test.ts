// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const handlers: ((payload: unknown) => void)[] = [];
  const channels: { name: string; on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> }[] = [];
  const client = {
    channel: vi.fn((name: string) => {
      const ch = {
        name,
        on: vi.fn((_type: string, _opts: unknown, cb: (payload: unknown) => void) => {
          handlers.push(cb);
          return ch;
        }),
        subscribe: vi.fn(() => ch),
      };
      channels.push(ch);
      return ch;
    }),
    removeChannel: vi.fn(async () => "ok"),
  };
  return { client, channels, handlers };
});

vi.mock("@/lib/supabase/client", () => ({ createClient: () => mocks.client }));

import { subscribeToTable, useRealtimeTable } from "@/lib/supabase/realtime";

beforeEach(() => {
  mocks.client.channel.mockClear();
  mocks.client.removeChannel.mockClear();
  mocks.channels.length = 0;
  mocks.handlers.length = 0;
});

describe("subscribeToTable", () => {
  it("postgres_changes dengan filter, channel unik, cleanup removeChannel", () => {
    const onChange = vi.fn();
    const stop1 = subscribeToTable("messages", "conversation_id=eq.c1", onChange);
    const stop2 = subscribeToTable("messages", "conversation_id=eq.c1", onChange);
    expect(mocks.channels).toHaveLength(2);
    expect(mocks.channels[0].name).not.toBe(mocks.channels[1].name);
    expect(mocks.channels[0].on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages", filter: "conversation_id=eq.c1" },
      expect.any(Function),
    );
    expect(mocks.channels[0].subscribe).toHaveBeenCalled();
    mocks.handlers[0]({ eventType: "INSERT", new: { id: "m1" } });
    expect(onChange).toHaveBeenCalledWith({ eventType: "INSERT", new: { id: "m1" } });
    stop1();
    expect(mocks.client.removeChannel).toHaveBeenCalledWith(mocks.channels[0]);
    stop2();
  });

  it("opsi event + tanpa filter", () => {
    subscribeToTable("notifications", null, vi.fn(), { event: "INSERT" });
    expect(mocks.channels[0].on.mock.calls[0][1]).toEqual({ event: "INSERT", schema: "public", table: "notifications" });
  });
});

describe("useRealtimeTable", () => {
  let container: HTMLDivElement;
  let root: Root;

  function Probe(props: { filter: string | null; enabled?: boolean; onChange: () => void }) {
    useRealtimeTable("notifications", props.filter, props.onChange, { enabled: props.enabled });
    return null;
  }

  beforeEach(() => {
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it("filter null / enabled false → tidak berlangganan", () => {
    act(() => root.render(createElement(Probe, { filter: null, onChange: vi.fn() })));
    act(() => root.render(createElement(Probe, { filter: "user_id=eq.u1", enabled: false, onChange: vi.fn() })));
    expect(mocks.client.channel).not.toHaveBeenCalled();
  });

  it("callback baru tidak membuat langganan ulang; filter baru membuat ulang; unmount membersihkan", () => {
    const first = vi.fn();
    const second = vi.fn();
    act(() => root.render(createElement(Probe, { filter: "user_id=eq.u1", onChange: first })));
    act(() => root.render(createElement(Probe, { filter: "user_id=eq.u1", onChange: second })));
    expect(mocks.client.channel).toHaveBeenCalledTimes(1);

    act(() => mocks.handlers[0]({ eventType: "UPDATE" }));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    act(() => root.render(createElement(Probe, { filter: "user_id=eq.u2", onChange: second })));
    expect(mocks.client.channel).toHaveBeenCalledTimes(2);
    expect(mocks.client.removeChannel).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    expect(mocks.client.removeChannel).toHaveBeenCalledTimes(2);
    root = createRoot(container);
  });
});
