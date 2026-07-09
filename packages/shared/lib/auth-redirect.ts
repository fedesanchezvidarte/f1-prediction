/**
 * Pure helpers for parsing Supabase auth redirect URLs.
 *
 * After an OAuth or email-link flow, Supabase redirects to the app with the
 * auth payload either in the query string (PKCE: `?code=...`) or in the URL
 * fragment (implicit / email links: `#access_token=...&refresh_token=...`).
 * Errors can arrive in either place as `error` / `error_description`.
 *
 * Framework-agnostic on purpose: the mobile app feeds it custom-scheme deep
 * links (`f1prediction://auth/callback?code=...`, `exp://.../--/auth/callback`),
 * which `new URL()` handles inconsistently across engines — so parsing is
 * done with plain string splitting + URLSearchParams.
 */

export interface AuthRedirectParams {
  /** PKCE authorization code (exchange via `exchangeCodeForSession`). */
  code: string | null;
  /** Implicit-flow / email-link access token (use with `setSession`). */
  accessToken: string | null;
  /** Implicit-flow / email-link refresh token (use with `setSession`). */
  refreshToken: string | null;
  /** Human-readable error, if the provider redirected with one. */
  errorDescription: string | null;
}

/**
 * Extracts Supabase auth parameters from a redirect URL, looking in both the
 * query string and the fragment. Fragment values win when both are present
 * (Supabase puts the authoritative payload there in implicit flows).
 */
export function parseAuthRedirectParams(url: string): AuthRedirectParams {
  const [withoutFragment, ...fragmentParts] = url.split("#");
  const fragment = fragmentParts.join("#");
  const [, ...queryParts] = withoutFragment.split("?");
  const query = queryParts.join("?");

  const params = new URLSearchParams(query);
  // Fragment params override query params.
  for (const [key, value] of new URLSearchParams(fragment)) {
    params.set(key, value);
  }

  const get = (key: string): string | null => {
    const value = params.get(key);
    return value ? value : null;
  };

  return {
    code: get("code"),
    accessToken: get("access_token"),
    refreshToken: get("refresh_token"),
    errorDescription: get("error_description") ?? get("error"),
  };
}
