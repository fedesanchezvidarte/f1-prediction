import { Ionicons } from "@expo/vector-icons";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher";
import { ConfirmModal } from "@/components/predictions/ConfirmModal";
import { AccountRow } from "@/components/profile/AccountRow";
import { Avatar } from "@/components/profile/Avatar";
import { ChangePasswordModal } from "@/components/profile/ChangePasswordModal";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * Compact profile/settings panel rendered as the right-side drawer's
 * content — a condensed version of the full /profile screen. Avatar
 * editing, inline name edit and account deletion stay on that screen,
 * reachable via the "Profile" row; the drawer hosts the quick settings
 * (language, theme, password, sign out).
 */
export function ProfileDrawerContent({ navigation }: DrawerContentComponentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { user, signOut } = useAuth();
  const profileQuery = useProfileQuery();

  const authProvider = user?.app_metadata?.provider ?? "email";

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    // On success onAuthStateChange clears the session and the root layout's
    // Stack.Protected swaps to the (auth) group — no manual navigation.
    await signOut().catch(() => setIsSigningOut(false));
  }

  if (profileQuery.isPending || !profileQuery.data) {
    return (
      <View className="flex-1 items-center justify-center bg-f1-black">
        <ActivityIndicator color="#CF2637" />
      </View>
    );
  }

  const { profile, stats } = profileQuery.data;

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <View
      className="flex-1 bg-f1-black"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <ScrollView className="flex-1" contentContainerClassName="pb-4">
        {/* ── Identity header ── */}
        <View className="items-center gap-2 border-b border-f1-white/10 px-5 pb-5 pt-6">
          <Avatar avatarUrl={profile.avatarUrl} displayName={profile.displayName} size={72} />
          <Text className="text-base font-bold text-f1-white" numberOfLines={1}>
            {profile.displayName}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="mail-outline" size={12} color="rgba(247,247,247,0.5)" />
            <Text className="shrink text-xs text-f1-white/50" numberOfLines={1}>
              {profile.email}
            </Text>
          </View>
          {memberSince ? (
            <Text className="text-[11px] text-f1-white/30">
              {t.profilePage.memberSince} {memberSince}
            </Text>
          ) : null}
        </View>

        {/* ── Compact 2×2 stats grid (drawer is too narrow for the 4-cell row) ── */}
        <View className="flex-row flex-wrap border-b border-f1-white/10">
          <StatCell icon="trophy" color="#FFB100" label={t.profilePage.points} value={String(stats.totalPoints)} />
          <StatCell
            icon="medal"
            color="#A06CD5"
            label={t.profilePage.rank}
            value={stats.rank ? `#${stats.rank}` : "—"}
            divider
          />
          <StatCell
            icon="star"
            color="#44AF69"
            label={t.profilePage.predictions}
            value={String(stats.predictionsCount)}
          />
          <StatCell
            icon="ribbon"
            color="#3C91E6"
            label={t.profilePage.achievements}
            value={String(stats.achievementsCount)}
            divider
          />
        </View>

        {/* Full profile screen (avatar upload, name edit and account deletion live there) */}
        <AccountRow
          icon="person-outline"
          label={t.profilePage.title}
          chevron
          onPress={() => {
            navigation.closeDrawer();
            router.push("/profile");
          }}
        />

        {/* ── Settings section ── */}
        <View className="border-b border-f1-white/10 px-5 py-2.5">
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-white/40">
            {t.navbar.settings}
          </Text>
        </View>

        {/* Language toggle */}
        <View className="flex-row items-center gap-3 border-b border-f1-white/10 px-5 py-3">
          <Ionicons name="language" size={15} color="rgba(247,247,247,0.5)" />
          <Text className="flex-1 text-sm text-f1-white">{t.navbar.language}</Text>
          <AuthLanguageSwitcher />
        </View>

        {/* Theme (dark-only today; real switching arrives in a future iteration) */}
        <View
          accessible
          accessibilityLabel={`${t.profilePage.theme}: ${t.profilePage.themeDark}`}
          accessibilityState={{ disabled: true }}
          className="flex-row items-center gap-3 border-b border-f1-white/10 px-5 py-3"
        >
          <Ionicons name="moon-outline" size={15} color="rgba(247,247,247,0.5)" />
          <Text className="flex-1 text-sm text-f1-white">{t.profilePage.theme}</Text>
          <Text className="text-sm text-f1-white/40">{t.profilePage.themeDark}</Text>
        </View>

        {/* ── Account section ── */}
        <View className="border-b border-f1-white/10 px-5 py-2.5">
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-white/40">
            {t.profilePage.account}
          </Text>
        </View>

        {authProvider === "email" ? (
          <AccountRow
            icon="key-outline"
            label={t.profilePage.changePassword}
            chevron
            onPress={() => setShowChangePassword(true)}
          />
        ) : null}

        <AccountRow
          icon="log-out-outline"
          label={t.profilePage.signOut}
          last
          onPress={() => setShowSignOutModal(true)}
        />
      </ScrollView>

      {/* ── Modals (RN Modal renders above the drawer) ── */}
      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={() => setShowChangePassword(false)}
      />

      <ConfirmModal
        visible={showSignOutModal}
        title={t.profilePage.signOutTitle}
        subtitle={`${t.profilePage.signedInAs} ${profile.displayName}`}
        body={t.profilePage.signOutBody}
        confirmLabel={t.profilePage.signOut}
        confirmingLabel={t.profilePage.signingOut}
        tone="red"
        isSaving={isSigningOut}
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutModal(false)}
      />
    </View>
  );
}

/** Half-width stat cell for the drawer's 2×2 grid. */
function StatCell({
  icon,
  color,
  label,
  value,
  divider = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      className={`w-1/2 items-center gap-1 border-b border-f1-white/10 px-2 py-3.5 ${
        divider ? "border-l" : ""
      }`}
    >
      <Ionicons name={icon} size={15} color={color} />
      <Text className="text-base font-bold tabular-nums text-f1-white">{value}</Text>
      <Text className="text-[10px] text-f1-white/50" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
