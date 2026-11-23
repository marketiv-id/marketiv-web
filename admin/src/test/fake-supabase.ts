/**
 * Fake supabase-js in-memory untuk unit test service / Route Handler.
 *
 *   const db = createFakeSupabase({ campaigns: [{ id: "c1", umkm_id: "u1", status: "active" }] });
 *   db.rpc.mockImplementation(...)          // atau: db.setRpc("nama", (args) => data)
 *   await db.from("campaigns").select("*").eq("umkm_id", "u1").order("created_at", { ascending: false });
 *
 * Didukung: select (daftar kolom diabaikan — selalu baris utuh; embed relasi
 * TIDAK didukung), opsi `{ count: "exact", head: true }`, eq/neq/in/is/not
 * ("is"/"in"/"eq"), gt/gte/lt/lte, like/ilike, contains (array), or()
 * sederhana (`a.eq.1,b.is.null`, tanpa and() bersarang), order (berantai),
 * limit, range, single, maybeSingle, rpc, auth.getUser/getSession.
 *
 * Setiap query dicatat di `db.calls` (tabel + filter) supaya test bisa
 * memastikan filter keamanan (mis. `.eq("umkm_id", userId)`) benar dipasang.
 */
import { vi } from "vitest";

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

export interface FakeCall {
  table: string;
  filters: string[];
  count?: string;
}

interface FakeError {
  code: string;
  message: string;
}

function cmp(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : 1;
}

function parseLiteral(raw: string): unknown {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

function likeToRegex(pattern: string, insensitive: boolean): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${escaped}$`, insensitive ? "i" : "");
}

function opFilter(column: string, op: string, value: unknown): Filter {
  switch (op) {
    case "eq":
      return (r) => String(r[column]) === String(value) && r[column] !== null && r[column] !== undefined;
    case "neq":
      return (r) => String(r[column]) !== String(value);
    case "is":
      return (r) => (value === null ? r[column] === null || r[column] === undefined : r[column] === value);
    case "in": {
      const list = (Array.isArray(value) ? value : String(value).replace(/^\(|\)$/g, "").split(",")).map(String);
      return (r) => list.includes(String(r[column]));
    }
    case "gt":
      return (r) => r[column] != null && cmp(r[column], value) > 0;
    case "gte":
      return (r) => r[column] != null && cmp(r[column], value) >= 0;
    case "lt":
      return (r) => r[column] != null && cmp(r[column], value) < 0;
    case "lte":
      return (r) => r[column] != null && cmp(r[column], value) <= 0;
    case "like":
      return (r) => likeToRegex(String(value), false).test(String(r[column] ?? ""));
    case "ilike":
      return (r) => likeToRegex(String(value), true).test(String(r[column] ?? ""));
    case "cs":
    case "contains": {
      const needles = Array.isArray(value) ? value : [value];
      return (r) => Array.isArray(r[column]) && needles.every((n) => (r[column] as unknown[]).includes(n));
    }
    default:
      throw new Error(`fake-supabase: operator "${op}" belum didukung`);
  }
}

function parseOr(expr: string): Filter {
  const parts = expr.split(",").map((p) => p.trim()).filter(Boolean);
  const filters = parts.map((part) => {
    const [column, op, ...rest] = part.split(".");
    let raw = rest.join(".");
    let negate = false;
    let realOp = op;
    if (op === "not") {
      negate = true;
      realOp = rest[0];
      raw = rest.slice(1).join(".");
    }
    const f = opFilter(column, realOp, realOp === "in" ? raw : parseLiteral(raw));
    return negate ? (r: Row) => !f(r) : f;
  });
  return (row) => filters.some((f) => f(row));
}

class FakeQuery implements PromiseLike<{ data: unknown; error: FakeError | null; count: number | null }> {
  private filters: Filter[] = [];
  private filterLog: string[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private countMode: string | undefined;
  private head = false;

  constructor(
    private readonly table: string,
    private readonly rows: () => Row[],
    private readonly onCall: (call: FakeCall) => void,
    private readonly failWith: FakeError | null,
  ) {}

  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    this.countMode = options?.count;
    this.head = options?.head === true;
    return this;
  }

  private add(column: string, op: string, value: unknown) {
    this.filters.push(opFilter(column, op, value));
    this.filterLog.push(`${column}.${op}.${Array.isArray(value) ? `(${value.join(",")})` : String(value)}`);
    return this;
  }

  eq(column: string, value: unknown) { return this.add(column, "eq", value); }
  neq(column: string, value: unknown) { return this.add(column, "neq", value); }
  in(column: string, values: unknown[]) { return this.add(column, "in", values); }
  is(column: string, value: unknown) { return this.add(column, "is", value); }
  gt(column: string, value: unknown) { return this.add(column, "gt", value); }
  gte(column: string, value: unknown) { return this.add(column, "gte", value); }
  lt(column: string, value: unknown) { return this.add(column, "lt", value); }
  lte(column: string, value: unknown) { return this.add(column, "lte", value); }
  like(column: string, value: string) { return this.add(column, "like", value); }
  ilike(column: string, value: string) { return this.add(column, "ilike", value); }
  contains(column: string, value: unknown) { return this.add(column, "contains", value); }

  not(column: string, op: string, value: unknown) {
    const f = opFilter(column, op, value);
    this.filters.push((r) => !f(r));
    this.filterLog.push(`${column}.not.${op}.${String(value)}`);
    return this;
  }

  or(expr: string) {
    this.filters.push(parseOr(expr));
    this.filterLog.push(`or(${expr})`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(n: number) {
    this.rangeFrom = this.rangeFrom ?? 0;
    this.rangeTo = this.rangeFrom + n - 1;
    return this;
  }

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  single() {
    this.mode = "single";
    return this;
  }

  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }

  private execute(): { data: unknown; error: FakeError | null; count: number | null } {
    this.onCall({ table: this.table, filters: this.filterLog, count: this.countMode });
    if (this.failWith) return { data: null, error: this.failWith, count: null };

    let result = this.rows().filter((row) => this.filters.every((f) => f(row)));
    const count = result.length;
    if (this.orders.length) {
      result = [...result].sort((a, b) => {
        for (const { column, ascending } of this.orders) {
          const d = cmp(a[column], b[column]);
          if (d !== 0) return ascending ? d : -d;
        }
        return 0;
      });
    }
    if (this.rangeFrom !== null && this.rangeTo !== null) {
      result = result.slice(this.rangeFrom, this.rangeTo + 1);
    }
    const copy = result.map((r) => structuredClone(r));

    if (this.head) return { data: null, error: null, count };
    if (this.mode === "single") {
      if (copy.length !== 1) {
        return { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }, count: null };
      }
      return { data: copy[0], error: null, count: this.countMode ? count : null };
    }
    if (this.mode === "maybeSingle") {
      if (copy.length > 1) {
        return { data: null, error: { code: "PGRST116", message: "multiple rows returned" }, count: null };
      }
      return { data: copy[0] ?? null, error: null, count: this.countMode ? count : null };
    }
    return { data: copy, error: null, count: this.countMode ? count : null };
  }

  then<R1 = { data: unknown; error: FakeError | null; count: number | null }, R2 = never>(
    onfulfilled?: ((value: { data: unknown; error: FakeError | null; count: number | null }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export interface FakeSupabase {
  tables: Record<string, Row[]>;
  calls: FakeCall[];
  /** Paksa tabel tertentu gagal (mis. `{ code: "42501", message: "denied" }`). */
  failTable(table: string, error: FakeError): void;
  setRpc(name: string, impl: (args: Record<string, unknown>) => unknown): void;
  from(table: string): FakeQuery;
  rpc: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
  };
  /** Setel user Auth yang "login". `null` = tanpa sesi. */
  setAuthUser(user: { id: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null): void;
}

export function createFakeSupabase(seed: Record<string, Row[]> = {}): FakeSupabase {
  const tables: Record<string, Row[]> = structuredClone(seed);
  const calls: FakeCall[] = [];
  const failures = new Map<string, FakeError>();
  const rpcs = new Map<string, (args: Record<string, unknown>) => unknown>();
  let authUser: Record<string, unknown> | null = null;

  // `function` (bukan arrow) supaya pemanggilan tanpa receiver ketahuan: supabase-js
  // asli butuh `this` di rpc(), jadi `const rpc = db.rpc; rpc(...)` crash di runtime.
  const rpc = vi.fn(async function (this: unknown, name: string, args: Record<string, unknown> = {}) {
    if (this !== fake) {
      throw new TypeError("fake-supabase: rpc() dipanggil tanpa receiver (lupa .bind(db)?)");
    }
    const impl = rpcs.get(name);
    if (!impl) return { data: null, error: { code: "PGRST202", message: `fake-supabase: rpc ${name} tidak terdaftar` } };
    try {
      return { data: await impl(args), error: null };
    } catch (err) {
      const e = err as { code?: string; message?: string };
      return { data: null, error: { code: e.code ?? "P0001", message: e.message ?? String(err) } };
    }
  });

  const fake: FakeSupabase = {
    tables,
    calls,
    failTable(table, error) {
      failures.set(table, error);
    },
    setRpc(name, impl) {
      rpcs.set(name, impl);
    },
    from(table: string) {
      return new FakeQuery(table, () => tables[table] ?? [], (c) => calls.push(c), failures.get(table) ?? null);
    },
    rpc,
    auth: {
      getUser: vi.fn(async () =>
        authUser
          ? { data: { user: authUser }, error: null }
          : { data: { user: null }, error: { name: "AuthSessionMissingError", message: "Auth session missing!", status: 400 } },
      ),
      getSession: vi.fn(async () => ({ data: { session: authUser ? { user: authUser } : null }, error: null })),
    },
    setAuthUser(user) {
      authUser = user ? { app_metadata: {}, user_metadata: {}, ...user } : null;
    },
  };
  return fake;
}
