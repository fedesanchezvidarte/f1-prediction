import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export async function createClient() {
  // The mobile app (Expo) has no cookies — it sends the Supabase access token
  // as `Authorization: Bearer <token>`. When present, build a cookie-less
  // client that forwards the JWT to PostgREST (RLS runs as the caller) and
  // wrap auth.getUser() to validate that token against Supabase Auth, so
  // route handlers work unchanged. Cookies remain the web path below.
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");
  const bearerMatch = authHeader?.match(/^Bearer (.+)$/i);

  if (bearerMatch) {
    const token = bearerMatch[1];

    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );

    // No cookie session exists, so getUser() with no argument would fail.
    // Default it to the bearer token; explicit jwt arguments still win.
    const originalGetUser = client.auth.getUser.bind(client.auth);
    client.auth.getUser = (jwt?: string) => originalGetUser(jwt ?? token);

    return client;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component where
            // cookies cannot be set. This can be safely ignored when the
            // middleware refreshes the session.
          }
        },
      },
    }
  );
}
