// In-memory stand-in for the parts of the Supabase query builder the checkout
// routes use (from/select/insert/update/delete, eq/in/lt, single/maybeSingle,
// rpc). Lets route handlers run in unit tests with no database at all.
// Unique keys are enforced per table and reported as Postgres code 23505,
// which is what the webhook's dedupe and the intent route's race handling
// rely on.

export type Row = Record<string, unknown>;
type Result = { data: unknown; error: { code?: string; message: string } | null };

export class FakeSupabase {
  tables: Record<string, Row[]> = {};
  rpcCalls: Array<{ name: string; args: Row }> = [];
  rpcImpl: (name: string, args: Row) => Result = () => ({ data: "order-1", error: null });

  constructor(private uniqueKeys: Record<string, string[]> = {}) {}

  table(name: string): Row[] {
    return (this.tables[name] ??= []);
  }

  from(name: string): FakeQuery {
    return new FakeQuery(this, name);
  }

  rpc(name: string, args: Row): Promise<Result> {
    this.rpcCalls.push({ name, args });
    return Promise.resolve(this.rpcImpl(name, args));
  }

  insertRow(name: string, row: Row): Result {
    const rows = this.table(name);
    for (const key of this.uniqueKeys[name] ?? []) {
      if (row[key] != null && rows.some((r) => r[key] === row[key])) {
        return { data: null, error: { code: "23505", message: `duplicate key ${key}` } };
      }
    }
    const stored = name === "stripe_webhook_events"
      ? { status: "processing", updated_at: new Date().toISOString(), ...row }
      : { ...row };
    rows.push(stored);
    return { data: [stored], error: null };
  }
}

class FakeQuery implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row = {};
  private filters: Array<(row: Row) => boolean> = [];
  private mode: "many" | "single" | "maybeSingle" = "many";

  constructor(private db: FakeSupabase, private name: string) {}

  select(): this { return this; }
  insert(row: Row): this { this.op = "insert"; this.payload = row; return this; }
  update(patch: Row): this { this.op = "update"; this.payload = patch; return this; }
  delete(): this { this.op = "delete"; return this; }
  upsert(row: Row): this { this.op = "insert"; this.payload = row; return this; }
  eq(column: string, value: unknown): this { this.filters.push((r) => r[column] === value); return this; }
  in(column: string, values: unknown[]): this { this.filters.push((r) => values.includes(r[column])); return this; }
  lt(column: string, value: string): this { this.filters.push((r) => String(r[column]) < value); return this; }
  single(): this { this.mode = "single"; return this; }
  maybeSingle(): this { this.mode = "maybeSingle"; return this; }

  then<T1 = Result, T2 = never>(
    onFulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onRejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.run()).then(onFulfilled, onRejected);
  }

  private run(): Result {
    if (this.op === "insert") {
      const result = this.db.insertRow(this.name, this.payload);
      if (result.error || this.mode === "many") return result;
      return { data: (result.data as Row[])[0], error: null };
    }
    const rows = this.db.table(this.name);
    const matched = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === "update") {
      for (const r of matched) Object.assign(r, this.payload);
    } else if (this.op === "delete") {
      this.db.tables[this.name] = rows.filter((r) => !matched.includes(r));
    }
    if (this.mode === "many") return { data: matched, error: null };
    if (matched.length === 0) {
      return this.mode === "single"
        ? { data: null, error: { code: "PGRST116", message: "no rows" } }
        : { data: null, error: null };
    }
    return { data: matched[0], error: null };
  }
}
