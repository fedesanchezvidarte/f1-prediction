/**
 * Shared helpers for API route handler tests.
 *
 * Provides:
 *  - `createMockRequest(body)` — builds a NextRequest with JSON body
 *  - `parseResponse(res)` — extracts status + JSON from a NextResponse
 *  - Pre-configured mock factories for `createClient` and `isAdminUser`
 */

import { NextRequest } from "next/server";

/* ── Request builder ─────────────────────────────────────────────────── */

export function createMockRequest(
  body?: unknown,
  url = "http://localhost/api/test"
): NextRequest {
  if (body === undefined) {
    return new NextRequest(url, { method: "POST" });
  }
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Create a request with an invalid (non-JSON) body to test parse-error paths.
 */
export function createBadJsonRequest(
  url = "http://localhost/api/test"
): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    body: "not-json{{{",
    headers: { "Content-Type": "application/json" },
  });
}

/* ── Response parser ─────────────────────────────────────────────────── */

export async function parseResponse(res: Response) {
  const status = res.status;
  const json = await res.json();
  return { status, json };
}

/* ── Supabase auth mock factory ──────────────────────────────────────── */

export interface MockUser {
  id: string;
  app_metadata?: Record<string, unknown>;
}

/**
 * Returns a mock `createClient` that provides:
 * - `supabase.auth.getUser()` → resolves to the given user (or null)
 * - `supabase.from(table)` → a chainable mock supporting select/update/insert/delete
 *
 * This is intentionally lightweight — for tests that only exercise
 * the auth guard and early returns. Tests that need deep Supabase interactions
 * should use the full `createMockSupabase` from `./mockSupabase.ts`.
 */
export function buildMockCreateClient(user: MockUser | null = null) {
  const mockSupabase = buildMockSupabaseForApi();

  // Auth layer
  mockSupabase.auth = {
    getUser: jest.fn().mockResolvedValue({
      data: { user },
      error: null,
    }),
  };

  const createClient = jest.fn().mockResolvedValue(mockSupabase);

  return { createClient, mockSupabase };
}

export interface MockSupabaseForApi {
  from: (table: string) => Record<string, unknown>;
  auth: {
    getUser: jest.Mock;
  };
  __mockTable: (table: string, ...responses: { data: unknown; error: unknown }[]) => void;
}

/**
 * Builds a light chainable Supabase mock for API route tests.
 * Every chain method returns itself and terminal calls return { data: null, error: null }.
 * Override specific table responses via `__mockTable(table, ...responses)`.
 */
export function buildMockSupabaseForApi(): MockSupabaseForApi {
  const tableOverrides = new Map<string, { data: unknown; error: unknown }[]>();

  function consume(table: string) {
    const queue = tableOverrides.get(table);
    if (!queue || queue.length === 0) return { data: null, error: null };
    if (queue.length === 1) return queue[0];
    return queue.shift()!;
  }

  function makeChain(table: string): Record<string, unknown> {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      not: () => chain,
      single: () => consume(table),
      update: () => chain,
      insert: () => {
        consume(table);
        return chain;
      },
      delete: () => chain,
      upsert: () => chain,
      then: (
        resolve: ((v: unknown) => unknown) | null | undefined,
        reject?: ((e: unknown) => unknown) | null | undefined,
      ) =>
        Promise.resolve(consume(table)).then(
          resolve ?? undefined,
          reject ?? undefined
        ),
    };
    return chain;
  }

  const supabase: Record<string, unknown> = {
    from: (table: string) => makeChain(table),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
    __mockTable: (table: string, ...responses: { data: unknown; error: unknown }[]) => {
      tableOverrides.set(table, [...responses]);
    },
  };

  return supabase as unknown as MockSupabaseForApi;
}
