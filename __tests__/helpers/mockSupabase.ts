/**
 * Chainable mock factory for Supabase client.
 *
 * Usage:
 *   const { supabase, mockTable } = createMockSupabase();
 *   mockTable("race_results", { data: {...}, error: null });         // single response
 *   mockTable("race_predictions", response1, response2, response3); // per-call queue
 *
 * Each distinct call that consumes a response (await, .single()) pops the next item
 * from the queue. Once the last item is reached it is returned for all subsequent calls
 * (sticky last response).
 *
 * KEY DESIGN DECISION: `then` is a plain method, not a getter.
 * If `then` were a getter, JavaScript's Promise machinery would trigger it twice —
 * once to check `typeof obj.then === 'function'` and once to actually call it —
 * consuming two queue entries per `await`. A plain method is read once but only
 * invoked when the Promise machinery explicitly calls `obj.then(resolve, reject)`.
 */

export interface MockResponse {
  data: unknown;
  error: { message: string } | null;
}

export interface CallRecord {
  table: string;
  data?: unknown;
  filters: Record<string, unknown>;
}

export function createMockSupabase() {
  // ── Response queues ─────────────────────────────────────────────────────────
  const queues = new Map<string, MockResponse[]>();

  function mockTable(table: string, ...responses: MockResponse[]): void {
    if (responses.length === 0) {
      queues.set(table, [{ data: null, error: null }]);
    } else {
      queues.set(table, [...responses]);
    }
  }

  /** Pop the next response. The last item is sticky (never removed). */
  function consume(table: string): MockResponse {
    const queue = queues.get(table);
    if (!queue || queue.length === 0) return { data: null, error: null };
    if (queue.length === 1) return queue[0];
    return queue.shift()!;
  }

  // ── Call tracking ────────────────────────────────────────────────────────────
  const updateCalls: CallRecord[] = [];
  const insertCalls: CallRecord[] = [];
  const deleteCalls: CallRecord[] = [];

  // ── Chain builders ───────────────────────────────────────────────────────────

  /** Generic read chain (select … eq … in … order … single / await) */
  function makeReadChain(table: string, filters: Record<string, unknown> = {}) {
    const chain = {
      select(_cols?: string) { return chain; },
      eq(col: string, val: unknown) { filters[col] = val; return chain; },
      in(col: string, vals: unknown[]) { filters[`${col}_in`] = vals; return chain; },
      order(_col: string, _opts?: unknown) { return chain; },
      not(_col: string, _op: string, _val: unknown) { return chain; },
      /** Terminal: resolves immediately (for .single() call style) */
      single(): MockResponse { return consume(table); },
      /** Thenable: called exactly once by `await` */
      then(
        resolve: ((v: MockResponse) => unknown) | null | undefined,
        reject?: ((e: unknown) => unknown) | null | undefined,
      ) {
        return Promise.resolve(consume(table)).then(resolve ?? undefined, reject ?? undefined);
      },
    };
    return chain;
  }

  /** Update chain — records data + filters on resolution */
  function makeUpdateChain(table: string, data: unknown) {
    const filters: Record<string, unknown> = {};
    const chain = {
      eq(col: string, val: unknown) { filters[col] = val; return chain; },
      in(col: string, vals: unknown[]) { filters[`${col}_in`] = vals; return chain; },
      single(): MockResponse {
        updateCalls.push({ table, data, filters: { ...filters } });
        return consume(table);
      },
      then(
        resolve: ((v: MockResponse) => unknown) | null | undefined,
        reject?: ((e: unknown) => unknown) | null | undefined,
      ) {
        updateCalls.push({ table, data, filters: { ...filters } });
        return Promise.resolve(consume(table)).then(resolve ?? undefined, reject ?? undefined);
      },
    };
    return chain;
  }

  /** Insert — records data, resolves immediately (no further chaining needed) */
  function makeInsertChain(table: string, data: unknown) {
    insertCalls.push({ table, data, filters: {} });
    const response = consume(table);
    // Return a minimal thenable so both `await insert(...)` and discard work
    return {
      then(
        resolve: ((v: MockResponse) => unknown) | null | undefined,
        reject?: ((e: unknown) => unknown) | null | undefined,
      ) {
        return Promise.resolve(response).then(resolve ?? undefined, reject ?? undefined);
      },
    };
  }

  /** Delete chain — records filters on resolution */
  function makeDeleteChain(table: string) {
    const filters: Record<string, unknown> = {};
    const chain = {
      eq(col: string, val: unknown) { filters[col] = val; return chain; },
      in(col: string, vals: unknown[]) {
        filters[`${col}_in`] = vals;
        deleteCalls.push({ table, filters: { ...filters } });
        return {
          then(
            resolve: ((v: MockResponse) => unknown) | null | undefined,
            reject?: ((e: unknown) => unknown) | null | undefined,
          ) {
            return Promise.resolve(consume(table)).then(resolve ?? undefined, reject ?? undefined);
          },
        };
      },
      then(
        resolve: ((v: MockResponse) => unknown) | null | undefined,
        reject?: ((e: unknown) => unknown) | null | undefined,
      ) {
        deleteCalls.push({ table, filters: { ...filters } });
        return Promise.resolve(consume(table)).then(resolve ?? undefined, reject ?? undefined);
      },
    };
    return chain;
  }

  // ── Supabase surface ─────────────────────────────────────────────────────────
  const supabase = {
    from(table: string) {
      return {
        select: (_cols?: string) => makeReadChain(table),
        update: (data: unknown) => makeUpdateChain(table, data),
        insert: (data: unknown) => makeInsertChain(table, data),
        delete: () => makeDeleteChain(table),
        upsert: (data: unknown) => makeInsertChain(table, data),
      };
    },
  };

  return {
    supabase: supabase as unknown as Awaited<
      ReturnType<typeof import("@/lib/supabase/server").createClient>
    >,
    mockTable,
    getUpdateCalls: () => updateCalls,
    getInsertCalls: () => insertCalls,
    getDeleteCalls: () => deleteCalls,
  };
}

