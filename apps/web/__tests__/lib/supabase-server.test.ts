/**
 * Tests for apps/web/lib/supabase/server.ts — bearer-token vs cookie client creation.
 *
 * Mocks next/headers (cookies + headers) and @supabase/ssr's createServerClient
 * to verify which path createClient() takes and what options it passes.
 */
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";

const mockHeaders = headers as jest.Mock;
const mockCookies = cookies as jest.Mock;
const mockCreateServerClient = createServerClient as jest.Mock;

const SUPABASE_URL = "https://example.supabase.co";
const SUPABASE_ANON_KEY = "anon-key";

function makeHeaderStore(authValue: string | null) {
  return {
    get: jest.fn((name: string) => (name.toLowerCase() === "authorization" ? authValue : null)),
  };
}

function makeCookieStore() {
  return {
    getAll: jest.fn(() => [{ name: "sb-token", value: "cookie-value" }]),
    set: jest.fn(),
  };
}

/** A minimal client whose auth.getUser we can spy on. */
function makeSsrClient() {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
    },
  };
}

describe("createClient (apps/web/lib/supabase/server)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("bearer-token path", () => {
    it("builds a cookie-less client forwarding the Authorization header", async () => {
      mockHeaders.mockResolvedValue(makeHeaderStore("Bearer tok-123"));
      mockCreateServerClient.mockReturnValue(makeSsrClient());

      await createClient();

      expect(mockCreateServerClient).toHaveBeenCalledTimes(1);
      const [url, key, options] = mockCreateServerClient.mock.calls[0];
      expect(url).toBe(SUPABASE_URL);
      expect(key).toBe(SUPABASE_ANON_KEY);
      expect(options.global.headers).toEqual({ Authorization: "Bearer tok-123" });
      // Cookie-less: getAll returns [] and setAll is a no-op
      expect(options.cookies.getAll()).toEqual([]);
      expect(() => options.cookies.setAll([])).not.toThrow();
      // The web cookie store must not be touched on the bearer path
      expect(mockCookies).not.toHaveBeenCalled();
    });

    it("defaults auth.getUser() to the bearer token when called with no argument", async () => {
      mockHeaders.mockResolvedValue(makeHeaderStore("Bearer tok-123"));
      const ssrClient = makeSsrClient();
      const originalGetUser = ssrClient.auth.getUser;
      mockCreateServerClient.mockReturnValue(ssrClient);

      const client = await createClient();
      await client.auth.getUser();

      expect(originalGetUser).toHaveBeenCalledTimes(1);
      expect(originalGetUser).toHaveBeenCalledWith("tok-123");
    });

    it("lets an explicit jwt argument win over the bearer token", async () => {
      mockHeaders.mockResolvedValue(makeHeaderStore("Bearer tok-123"));
      const ssrClient = makeSsrClient();
      const originalGetUser = ssrClient.auth.getUser;
      mockCreateServerClient.mockReturnValue(ssrClient);

      const client = await createClient();
      await client.auth.getUser("explicit-jwt");

      expect(originalGetUser).toHaveBeenCalledWith("explicit-jwt");
    });

    it("matches the Bearer scheme case-insensitively", async () => {
      mockHeaders.mockResolvedValue(makeHeaderStore("bearer lower-tok"));
      const ssrClient = makeSsrClient();
      const originalGetUser = ssrClient.auth.getUser;
      mockCreateServerClient.mockReturnValue(ssrClient);

      const client = await createClient();
      await client.auth.getUser();

      const [, , options] = mockCreateServerClient.mock.calls[0];
      expect(options.global.headers).toEqual({ Authorization: "bearer lower-tok" });
      expect(originalGetUser).toHaveBeenCalledWith("lower-tok");
      expect(mockCookies).not.toHaveBeenCalled();
    });
  });

  describe("cookie path", () => {
    it("uses the cookie store when there is no Authorization header", async () => {
      mockHeaders.mockResolvedValue(makeHeaderStore(null));
      const cookieStore = makeCookieStore();
      mockCookies.mockResolvedValue(cookieStore);
      mockCreateServerClient.mockReturnValue(makeSsrClient());

      await createClient();

      expect(mockCookies).toHaveBeenCalledTimes(1);
      const [url, key, options] = mockCreateServerClient.mock.calls[0];
      expect(url).toBe(SUPABASE_URL);
      expect(key).toBe(SUPABASE_ANON_KEY);
      // No forwarded Authorization header on the cookie path
      expect(options.global).toBeUndefined();
      // getAll delegates to the Next.js cookie store
      expect(options.cookies.getAll()).toEqual([{ name: "sb-token", value: "cookie-value" }]);
      expect(cookieStore.getAll).toHaveBeenCalledTimes(1);
    });

    it("uses the cookie path when the Authorization header is not a Bearer scheme", async () => {
      mockHeaders.mockResolvedValue(makeHeaderStore("Basic dXNlcjpwYXNz"));
      mockCookies.mockResolvedValue(makeCookieStore());
      mockCreateServerClient.mockReturnValue(makeSsrClient());

      await createClient();

      const [, , options] = mockCreateServerClient.mock.calls[0];
      expect(options.global).toBeUndefined();
      expect(mockCookies).toHaveBeenCalledTimes(1);
    });

    it("setAll writes each cookie to the store", async () => {
      mockHeaders.mockResolvedValue(makeHeaderStore(null));
      const cookieStore = makeCookieStore();
      mockCookies.mockResolvedValue(cookieStore);
      mockCreateServerClient.mockReturnValue(makeSsrClient());

      await createClient();
      const [, , options] = mockCreateServerClient.mock.calls[0];

      options.cookies.setAll([
        { name: "a", value: "1", options: { path: "/" } },
        { name: "b", value: "2", options: { path: "/" } },
      ]);

      expect(cookieStore.set).toHaveBeenCalledTimes(2);
      expect(cookieStore.set).toHaveBeenNthCalledWith(1, "a", "1", { path: "/" });
      expect(cookieStore.set).toHaveBeenNthCalledWith(2, "b", "2", { path: "/" });
    });

    it("setAll swallows errors thrown by the cookie store (Server Component context)", async () => {
      mockHeaders.mockResolvedValue(makeHeaderStore(null));
      const cookieStore = makeCookieStore();
      cookieStore.set.mockImplementation(() => {
        throw new Error("Cookies can only be modified in a Server Action");
      });
      mockCookies.mockResolvedValue(cookieStore);
      mockCreateServerClient.mockReturnValue(makeSsrClient());

      await createClient();
      const [, , options] = mockCreateServerClient.mock.calls[0];

      expect(() =>
        options.cookies.setAll([{ name: "a", value: "1", options: {} }])
      ).not.toThrow();
    });
  });
});
