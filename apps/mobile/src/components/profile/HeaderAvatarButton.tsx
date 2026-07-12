import { useRouter } from "expo-router";
import { Pressable } from "react-native";

import { Avatar } from "@/components/profile/Avatar";
import { profileFallbacks, useProfileQuery } from "@/hooks/useProfileQuery";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * Avatar button rendered in the header of every tab; opens the Profile
 * modal. Falls back to auth-metadata initials until the profile row loads.
 */
export function HeaderAvatarButton() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const profileQuery = useProfileQuery();

  const fallbacks = profileFallbacks(user);
  const profile = profileQuery.data?.profile;
  const avatarUrl = profile?.avatarUrl ?? fallbacks.avatarUrl ?? null;
  const displayName = profile?.displayName ?? fallbacks.displayName ?? "Driver";

  return (
    <Pressable
      onPress={() => router.push("/profile")}
      accessibilityRole="button"
      accessibilityLabel={t.nav.profile}
      hitSlop={8}
      className="mr-4 overflow-hidden rounded-full border border-f1-white/20 active:opacity-70"
    >
      <Avatar avatarUrl={avatarUrl} displayName={displayName} size={30} />
    </Pressable>
  );
}
