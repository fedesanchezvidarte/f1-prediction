import { supabase } from "@/lib/supabase";

/**
 * Thin authenticated fetch helper for the shared Next.js backend
 * (the 11 API routes in apps/web/app/api).
 *
 * The mobile app has no auth cookies, so every request carries the
 * Supabase access token as a Bearer header instead. Callers receive the
 * raw Response and are responsible for checking `res.ok` and parsing the
 * `{ error }` body — the same contract the web components follow.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set. Add it to apps/mobile/.env — see apps/mobile/.env.example."
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init.headers,
    },
  });
}
