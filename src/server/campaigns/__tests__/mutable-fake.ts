/**
 * Fake supabase-js in-memory yang mendukung TULIS (insert/update/upsert/delete)
 * untuk test route campaign. `src/test/fake-supabase.ts` (infra bersama) baru
 * mendukung baca; helper lokal ini sengaja kecil: filter `eq`, `order`,
 * `limit`, `single`/`maybeSingle`, dan `.select()` setelah mutasi.
 *
 * `rpc()` wajib dipanggil dengan receiver (sama dengan supabase-js asli).
 */
import { vi } from "vitest";

type Row = Record<string, unknown>;
type DbError = { code: string; message: string };
type Result = { data: unknown; error: DbError | null };

export interface MutableFake {
  tables: Record<string, Row[]>;
  ops: { table: string; op: string; filters: Record<string, unknown>; values?: unknown }[];
  /** Error paksa untuk operasi tertentu: `${table}.${op}`. */
  failWith: Map<string, DbError>;
  rpc: ReturnType<typeof vi.fn>;
  /** Implementasi RPC per nama: hasil = `data`; lempar `{code,message}` = `error`. */
  rpcImpl: Record<string, (args: Record<string, unknown>) => unknown>;
  from(table: string): MutableQuery;
}

let seq = 0;

class MutableQuery implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private values: Row | Row[] | undefined;
  private onConflict: string | undefined;
  private filters: Record<string, unknown> = {};
  private orders: { column: string; ascending: boolean }[] = [];
  private max: number | undefined;
  private mode: "many" | "single" | "maybeSingle" = "many";

  constructor(
    private readonly fake: MutableFake,
    private readonly table: string,
  ) {}

  select() {
    return this;
  }
  insert(values: Row | Row[]) {
    this.op = "insert";
    this.values = values;
    return this;
  }
  update(values: Row) {
    this.op = "update";
    this.values = values;
    return this;
  }
  upsert(values: Row, options?: { onConflict?: string }) {
    this.op = "upsert";
    this.values = values;
    this.onConflict = options?.onConflict;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters[column] = value;
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.max = n;
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

  private matches(row: Row): boolean {
    return Object.entries(this.filters).every(([k, v]) => row[k] !== undefined && row[k] !== null && String(row[k]) === String(v));
  }

  private execute(): Result {
    this.fake.ops.push({ table: this.table, op: this.op, filters: { ...this.filters }, values: this.values });
    const forced = this.fake.failWith.get(`${this.table}.${this.op}`);
    if (forced) return { data: null, error: forced };
    const rows = (this.fake.tables[this.table] ??= []);
    let affected: Row[];

    if (this.op === "insert") {
      const list = Array.isArray(this.values) ? this.values : [this.values ?? {}];
      affected = list.map((v) => ({ id: `gen_${++seq}`, created_at: `2026-11-23T00:00:${String(seq).padStart(2, "0")}Z`, ...v }));
      rows.push(...affected);
    } else if (this.op === "upsert") {
      const value = this.values as Row;
      const key = this.onConflict ?? "id";
      const existing = rows.find((r) => r[key] === value[key]);
      if (existing) {
        Object.assign(existing, value);
        affected = [existing];
      } else {
        const created = { id: `gen_${++seq}`, ...value };
        rows.push(created);
        affected = [created];
      }
    } else if (this.op === "update") {
      affected = rows.filter((r) => this.matches(r));
      for (const r of affected) Object.assign(r, this.values);
    } else if (this.op === "delete") {
      affected = rows.filter((r) => this.matches(r));
      this.fake.tables[this.table] = rows.filter((r) => !affected.includes(r));
    } else {
      affected = rows.filter((r) => this.matches(r));
      if (this.orders.length) {
        affected = [...affected].sort((a, b) => {
          for (const { column, ascending } of this.orders) {
            if (a[column] === b[column]) continue;
            const d = String(a[column]) < String(b[column]) ? -1 : 1;
            return ascending ? d : -d;
          }
          return 0;
        });
      }
      if (this.max !== undefined) affected = affected.slice(0, this.max);
    }

    const copy = affected.map((r) => structuredClone(r));
    if (this.mode === "single") {
      return copy.length === 1
        ? { data: copy[0], error: null }
        : { data: null, error: { code: "PGRST116", message: "no rows" } };
    }
    if (this.mode === "maybeSingle") return { data: copy[0] ?? null, error: null };
    return { data: copy, error: null };
  }

  then<R1 = Result, R2 = never>(
    onfulfilled?: ((value: Result) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export function createMutableFake(seed: Record<string, Row[]> = {}): MutableFake {
  const fake: MutableFake = {
    tables: structuredClone(seed),
    ops: [],
    failWith: new Map(),
    rpc: vi.fn(),
    rpcImpl: {},
    from(table: string) {
      return new MutableQuery(fake, table);
    },
  };
  fake.rpc = vi.fn(async function (this: unknown, name: string, args: Record<string, unknown> = {}) {
    if (this !== fake) throw new TypeError("rpc() dipanggil tanpa receiver");
    const impl = fake.rpcImpl[name];
    if (!impl) return { data: null, error: { code: "PGRST202", message: `rpc ${name} tidak dimock` } };
    try {
      return { data: await impl(args), error: null };
    } catch (err) {
      return { data: null, error: err as DbError };
    }
  });
  return fake;
}
