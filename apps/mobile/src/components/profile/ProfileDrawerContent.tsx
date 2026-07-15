import { Ionicons } from "@expo/vector-icons";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher";
import { AppLogo } from "@/components/layout/AppLogo";
import { ConfirmModal } from "@/components/predictions/ConfirmModal";
import { AccountRow } from "@/components/profile/AccountRow";
import { Avatar } from "@/components/profile/Avatar";
import { ChangePasswordModal } from "@/components/profile/ChangePasswordModal";
import { ThemeSwitcher } from "@/components/profile/ThemeSwitcher";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";

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
  const { colors } = useTheme();
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
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.red} />
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
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <ScrollView className="flex-1" contentContainerClassName="pb-4">
        {/* ── Identity header ── */}
        <View className="items-center gap-2 border-b border-border px-5 pb-5 pt-6">
          <Avatar avatarUrl={profile.avatarUrl} displayName={profile.displayName} size={72} />
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>
            {profile.displayName}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="mail-outline" size={12} color={colors.foregroundMuted} />
            <Text className="shrink text-xs text-foreground/50" numberOfLines={1}>
              {profile.email}
            </Text>
          </View>
          {memberSince ? (
            <Text className="text-[11px] text-foreground/40">
              {t.profilePage.memberSince} {memberSince}
            </Text>
          ) : null}
        </View>

        {/* ── Compact 2×2 stats grid (drawer is too narrow for the 4-cell row) ── */}
        <View className="flex-row flex-wrap border-b border-border">
          <StatCell icon="trophy" color={colors.amber} label={t.profilePage.points} value={String(stats.totalPoints)} />
          <StatCell
            icon="medal"
            color={colors.purple}
            label={t.profilePage.rank}
            value={stats.rank ? `#${stats.rank}` : "—"}
            divider
          />
          <StatCell
            icon="star"
            color={colors.green}
            label={t.profilePage.predictions}
            value={String(stats.predictionsCount)}
          />
          <StatCell
            icon="ribbon"
            color={colors.blue}
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
        <View className="border-b border-border px-5 py-2.5">
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
            {t.navbar.settings}
          </Text>
        </View>

        {/* Language toggle */}
        <View className="flex-row items-center gap-3 border-b border-border px-5 py-3">
          <Ionicons name="language" size={15} color={colors.foregroundMuted} />
          <Text className="flex-1 text-sm text-foreground">{t.navbar.language}</Text>
          <AuthLanguageSwitcher />
        </View>

        {/* Theme selector (dark / light / system, persisted in AsyncStorage) */}
        <View className="flex-row items-center gap-3 border-b border-border px-5 py-3">
          <Ionicons name="moon-outline" size={15} color={colors.foregroundMuted} />
          <Text className="flex-1 text-sm text-foreground">{t.profilePage.theme}</Text>
          <ThemeSwitcher />
        </View>

        {/* ── Account section ── */}
        <View className="border-b border-border px-5 py-2.5">
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
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

        <DrawerFooter />
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

/**
 * Foot of the drawer — the mobile counterpart of the web Footer: the app mark
 * and season, the "buy me a coffee" link, the project socials and the build
 * version. External links open in the in-app browser (expo-web-browser) rather
 * than kicking the user out to Safari/Chrome.
 */
function DrawerFooter() {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const version = Constants.expoConfig?.version;

  return (
    <View className="mt-6 items-center gap-3 border-t border-border px-5 pt-5">
      {/* App identity */}
      <View className="flex-row items-center gap-2">
        <AppLogo size={22} />
        <Text className="text-sm font-semibold text-foreground">F1 Prediction</Text>
        <Text className="text-xs text-foreground/50">{t.footer.season}</Text>
      </View>

      <FooterLink
        icon="cafe-outline"
        label={t.footer.buyMeCoffee}
        url="https://buymeacoffee.com/fedesanchezvidarte"
        tint={colors.amber}
      />

      {/* Socials + copyright */}
      <View className="flex-row items-center gap-4">
        <Text className="text-[11px] text-foreground/40">
          © {new Date().getFullYear()} F1 Prediction
        </Text>
        <SocialLink icon="logo-linkedin" label="LinkedIn" url="https://www.linkedin.com/in/fedesanchezvidarte/" />
        <SocialLink
          icon="logo-github"
          label="GitHub"
          url="https://github.com/fedesanchezvidarte/f1-prediction"
        />
      </View>

      {version ? <Text className="text-[11px] text-foreground/30">v{version}</Text> : null}
    </View>
  );
}

/** Pill link (amber-tinted, like the web footer's coffee button). */
function FooterLink({
  icon,
  label,
  url,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  url: string;
  tint: string;
}) {
  return (
    <Pressable
      onPress={() => WebBrowser.openBrowserAsync(url)}
      accessibilityRole="link"
      accessibilityLabel={label}
      className="min-h-9 flex-row items-center gap-1.5 rounded-lg border border-border px-3 active:border-f1-amber/50"
    >
      <Ionicons name={icon} size={14} color={tint} />
      <Text className="text-xs text-foreground/70">{label}</Text>
    </Pressable>
  );
}

function SocialLink({
  icon,
  label,
  url,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  url: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => WebBrowser.openBrowserAsync(url)}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <Ionicons name={icon} size={18} color={colors.foregroundMuted} />
    </Pressable>
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
      className={`w-1/2 items-center gap-1 border-b border-border px-2 py-3.5 ${
        divider ? "border-l" : ""
      }`}
    >
      <Ionicons name={icon} size={15} color={color} />
      <Text className="text-base font-bold tabular-nums text-foreground">{value}</Text>
      <Text className="text-[10px] text-foreground/50" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
