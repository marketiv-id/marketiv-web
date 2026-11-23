/**
 * Stub `fetch` global untuk test service admin yang memanggil `callAdminApi()`.
 *
 *   const api = stubFetch();
 *   api.respond(200, { items: [], total: 0 });
 *   ...
 *   api.calls[0].url  // "/api/admin/submission-queue?status=pending&limit=50"
 */
import { vi } from "vitest";

export interface FetchCall {
  url: string;
  method: string;
}

export function stubFetch() {
  const queue: (() => Response | Promise<Response>)[] = [];
  const calls: FetchCall[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method ?? "GET" });
    const next = queue.shift();
    if (!next) throw new Error(`fetch-mock: tidak ada respons untuk ${String(input)}`);
    return next();
  });
  vi.stubGlobal("fetch", fn);
  return {
    fn,
    calls,
    respond(status: number, body: unknown) {
      queue.push(() => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));
      return this;
    },
    networkError() {
      queue.push(() => {
        throw new TypeError("Failed to fetch");
      });
      return this;
    },
    reset() {
      queue.length = 0;
      calls.length = 0;
      fn.mockClear();
    },
  };
}
