/**
 * Tests for lib/admin.ts — isAdminUser function.
 *
 * Tests admin access via app_metadata.role and ADMIN_USER_IDS env variable.
 */
import { isAdminUser } from "@/lib/admin";
import type { User } from "@supabase/supabase-js";

/* ── Helper: minimal User object factory ── */
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    app_metadata: {},
    user_metadata: {},
    ...overrides,
  } as User;
}

const originalEnv = process.env;

beforeEach(() => {
  // Reset environment for each test
  process.env = { ...originalEnv };
  delete process.env.ADMIN_USER_IDS;
});

afterAll(() => {
  process.env = originalEnv;
});

describe("isAdminUser", () => {
  it("returns false for null user", () => {
    expect(isAdminUser(null)).toBe(false);
  });

  it("returns true when app_metadata.role is 'admin'", () => {
    const user = makeUser({ app_metadata: { role: "admin" } });
    expect(isAdminUser(user)).toBe(true);
  });

  it("returns true when user ID is in ADMIN_USER_IDS env", () => {
    process.env.ADMIN_USER_IDS = "user-123";
    const user = makeUser({ id: "user-123" });
    expect(isAdminUser(user)).toBe(true);
  });

  it("returns false when user has neither admin role nor is in ADMIN_USER_IDS", () => {
    process.env.ADMIN_USER_IDS = "other-user";
    const user = makeUser({ id: "user-123", app_metadata: { role: "user" } });
    expect(isAdminUser(user)).toBe(false);
  });

  it("handles multiple comma-separated IDs in ADMIN_USER_IDS", () => {
    process.env.ADMIN_USER_IDS = "user-a, user-123, user-b";
    const user = makeUser({ id: "user-123" });
    expect(isAdminUser(user)).toBe(true);
  });

  it("handles spaces around IDs in ADMIN_USER_IDS", () => {
    process.env.ADMIN_USER_IDS = "  user-a  ,  user-123  ,  user-b  ";
    const user = makeUser({ id: "user-123" });
    expect(isAdminUser(user)).toBe(true);
  });

  it("returns false when ADMIN_USER_IDS is empty string", () => {
    process.env.ADMIN_USER_IDS = "";
    const user = makeUser({ id: "user-123" });
    expect(isAdminUser(user)).toBe(false);
  });

  it("returns false when ADMIN_USER_IDS is not set", () => {
    delete process.env.ADMIN_USER_IDS;
    const user = makeUser({ id: "user-123", app_metadata: {} });
    expect(isAdminUser(user)).toBe(false);
  });

  it("prioritizes app_metadata.role over ADMIN_USER_IDS", () => {
    process.env.ADMIN_USER_IDS = "";
    const user = makeUser({ app_metadata: { role: "admin" } });
    expect(isAdminUser(user)).toBe(true);
  });
});
