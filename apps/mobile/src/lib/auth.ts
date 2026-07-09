import { parseAuthRedirectParams } from "@f1/shared/lib/auth-redirect";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase";

/**
 * Deep link the OAuth browser session redirects back to.
 * - Dev in Expo Go:   exp://<host>:<port>/--/auth/callback
 * - Standalone build: f1prediction://auth/callback
 * Both shapes must be allow-listed in Supabase Auth -> URL Configuration.
 */
export const authRedirectUri = Linking.createURL("auth/callback");

/**
 * Turns a Supabase redirect URL (deep link) into a stored session.
 * Handles both PKCE (`?code=`) and implicit/email-link (`#access_token=`)
 * payloads. Returns true when a session was established, false when the URL
 * carried no auth payload. Throws on provider errors.
 */
export async function createSessionFromUrl(url: string): Promise<boolean> {
  const { code, accessToken, refreshToken, errorDescription } =
    parseAuthRedirectParams(url);

  if (errorDescription) throw new Error(errorDescription);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return true;
  }

  return false;
}

/**
 * Native Google OAuth: get the provider URL from Supabase without
 * redirecting, run it in the system browser (`openAuthSessionAsync`), then
 * exchange the deep-link result for a session. Works in Expo Go — no native
 * auth module involved. Returns true on success, false if the user backed
 * out of the browser sheet.
 */
export async function signInWithGoogle(): Promise<boolean> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: authRedirectUri,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    authRedirectUri
  );

  if (result.type !== "success") {
    // "cancel" / "dismiss": the user closed the sheet — not an error.
    // (On some Android browsers the redirect can still arrive as a plain
    // deep link; the useURL() listener in the root layout catches that.)
    return false;
  }

  return createSessionFromUrl(result.url);
}
