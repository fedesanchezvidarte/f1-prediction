import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

// Mobile Supabase client: session persists in AsyncStorage instead of
// cookies (@supabase/ssr is web-only). detectSessionInUrl is off because
// OAuth redirects arrive via the f1prediction:// deep link, not the URL bar.
// PKCE keeps the OAuth exchange safe on a device: the browser returns only a
// one-time code, and supabase-js redeems it with a locally stored verifier.
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  }
);

// Standard supabase-js React Native wiring: refresh tokens only while the
// app is foregrounded (there is no reliable background timer on mobile).
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
