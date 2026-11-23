/**
 * Perluasan `createFakeSupabase` dengan insert/update/delete/upsert (hanya filter
 * `.eq`) untuk test modul tulis Fase 6. Fake bersama di `src/test/` hanya
 * mendukung baca; bila fork lain butuh hal serupa, pindahkan ke sana.
 */
import { createFakeSupabase, type FakeSupabase } from "@/test/fake-supabase";

type Row = Record<string, unknown>;
type Op = "insert" | "update" | "delete" | "upsert";

export interface WriteCall {
  table: string;
  op: Op;
  values?: unknown;
  filters: [string, unknown][];
}

class WriteQuery implements PromiseLike<{ data: unknown; error: { code: string; message: string } | null }> {
  private filters: [string, unknown][] = [];
  private mode: "many" | "single" | "maybeSingle" = "many";
  private selected = false;

  constructor(
    private readonly table: string,
    private readonly rows: Row[],
    private readonly op: Op,
    private readonly values: unknown,
    private readonly options: { onConflict?: string } | undefined,
    private readonly log: WriteCall[],
    private readonly nextId: () => string,
  ) {}

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }
  select() {
    this.selected = true;
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

  private matches = (row: Row) => this.filters.every(([c, v]) => row[c] !== undefined && String(row[c]) === String(v));

  private execute() {
    this.log.push({ table: this.table, op: this.op, values: this.values, filters: this.filters });
    let affected: Row[] = [];
    const now = new Date("2026-11-23T00:00:00Z").toISOString();
    if (this.op === "insert") {
      const list = (Array.isArray(this.values) ? this.values : [this.values]) as Row[];
      affected = list.map((v) => ({ id: this.nextId(), created_at: now, updated_at: now, ...v }));
      this.rows.push(...affected);
    } else if (this.op === "update") {
      affected = this.rows.filter(this.matches);
      for (const row of affected) Object.assign(row, this.values as Row);
    } else if (this.op === "delete") {
      affected = this.rows.filter(this.matches);
      for (const row of affected) this.rows.splice(this.rows.indexOf(row), 1);
    } else {
      const v = this.values as Row;
      const keys = (this.options?.onConflict ?? "id").split(",").map((k) => k.trim());
      const existing = this.rows.find((r) => keys.every((k) => String(r[k]) === String(v[k])));
      if (existing) {
        Object.assign(existing, v);
        affected = [existing];
      } else {
        const row = { id: this.nextId(), created_at: now, updated_at: now, ...v };
        this.rows.push(row);
        affected = [row];
      }
    }
    const copy = affected.map((r) => structuredClone(r));
    if (this.mode === "single") {
      return copy.length === 1
        ? { data: copy[0], error: null }
        : { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } };
    }
    if (this.mode === "maybeSingle") return { data: copy[0] ?? null, error: null };
    return { data: this.selected ? copy : null, error: null };
  }

  then<R1 = { data: unknown; error: { code: string; message: string } | null }, R2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { code: string; message: string } | null }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export interface WriteFake {
  base: FakeSupabase;
  tables: Record<string, Row[]>;
  writes: WriteCall[];
  /** Objek yang diteruskan ke modul (`db`). */
  db: never;
}

export function createWriteFake(seed: Record<string, Row[]> = {}): WriteFake {
  const base = createFakeSupabase(seed);
  const writes: WriteCall[] = [];
  let seq = 0;
  const nextId = () => `gen_${++seq}`;
  const rowsOf = (table: string) => (base.tables[table] ??= []);

  const db = {
    from(table: string) {
      const read = base.from(table);
      return Object.assign(read, {
        insert: (values: unknown) => new WriteQuery(table, rowsOf(table), "insert", values, undefined, writes, nextId),
        update: (values: unknown) => new WriteQuery(table, rowsOf(table), "update", values, undefined, writes, nextId),
        delete: () => new WriteQuery(table, rowsOf(table), "delete", undefined, undefined, writes, nextId),
        upsert: (values: unknown, options?: { onConflict?: string }) =>
          new WriteQuery(table, rowsOf(table), "upsert", values, options, writes, nextId),
      });
    },
    rpc: base.rpc.bind(base),
  };
  return { base, tables: base.tables, writes, db: db as never };
}
