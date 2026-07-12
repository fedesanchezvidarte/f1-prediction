import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmModal } from "@/components/predictions/ConfirmModal";
import { AccountRow } from "@/components/profile/AccountRow";
import { Avatar } from "@/components/profile/Avatar";
import { ChangePasswordModal } from "@/components/profile/ChangePasswordModal";
import { DeleteAccountModal } from "@/components/profile/DeleteAccountModal";
import { ProfileStatsRow } from "@/components/profile/ProfileStatsRow";
import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * Full Profile screen (opened from the drawer's Profile row). Ports the
 * web ProfileContent minus the Navigate quick links: avatar upload, inline
 * display-name edit, stats row, language toggle, and the account flows
 * (change password, sign out, delete account — deletion lives only here,
 * not in the drawer).
 */
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const profileQuery = useProfileQuery();

  const userId = user?.id;
  const authProvider = user?.app_metadata?.provider ?? "email";

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  function flashSuccess(message: string) {
    setSuccess(message);
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setSuccess(null), 3000);
  }

  async function invalidateProfileQueries() {
    // Refresh everything that shows the avatar or display name: the header
    // avatar + this screen (["profile"]) and the Home dashboard cards.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["profile", userId] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] }),
      queryClient.invalidateQueries({ queryKey: ["detailedLeaderboard"] }),
    ]);
  }

  async function handleChangeAvatar() {
    if (uploadingAvatar || !userId) return;
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t.profilePage.photoPermissionDenied);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    if (!asset.base64 || !mimeType.startsWith("image/")) {
      setError(t.profilePage.invalidImageFile);
      return;
    }

    // On React Native, upload raw bytes (ArrayBuffer) with an explicit
    // contentType — Blob/File from fetch(uri) is unreliable here.
    const bytes = decode(asset.base64);
    if (bytes.byteLength > MAX_AVATAR_BYTES) {
      setError(t.profilePage.imageTooLarge);
      return;
    }

    setUploadingAvatar(true);
    const ext = mimeType.split("/")[1] ?? "jpg";
    const filePath = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, bytes, { contentType: mimeType, upsert: true });

    if (uploadError) {
      setError(t.profilePage.failedToUploadAvatar);
      setUploadingAvatar(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    if (updateError) {
      setError(t.profilePage.failedToUploadAvatar);
      setUploadingAvatar(false);
      return;
    }

    await invalidateProfileQueries();
    setUploadingAvatar(false);
    flashSuccess(t.profilePage.profilePictureUpdated);
  }

  async function handleSaveName(currentName: string) {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === currentName) {
      setIsEditingName(false);
      return;
    }

    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", userId!);

    if (updateError) {
      setError(t.profilePage.failedToUpdateName);
      setSaving(false);
      return;
    }

    await invalidateProfileQueries();
    setIsEditingName(false);
    setSaving(false);
    flashSuccess(t.profilePage.displayNameUpdated);
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    // On success onAuthStateChange clears the session and the root layout's
    // Stack.Protected swaps to the (auth) group — no manual navigation.
    await signOut().catch(() => setIsSigningOut(false));
  }

  if (profileQuery.isPending || !profileQuery.data) {
    return (
      <View className="flex-1 items-center justify-center bg-f1-black" style={{ paddingTop: insets.top }}>
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
    <View className="flex-1 bg-f1-black" style={{ paddingTop: insets.top }}>
      {/* ── Modal header ── */}
      <View className="flex-row items-center justify-between border-b border-f1-white/10 px-5 py-4">
        <View className="flex-row items-center gap-2">
          <Ionicons name="person" size={16} color="#CF2637" />
          <Text className="text-base font-semibold text-f1-white">{t.profilePage.title}</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t.profilePage.close}
          className="h-8 w-8 items-center justify-center rounded-full bg-f1-white/10 active:bg-f1-white/20"
        >
          <Ionicons name="close" size={16} color="#F7F7F7" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Feedback banners */}
        {error ? (
          <View accessibilityLiveRegion="polite" className="rounded-lg border border-f1-red/20 bg-f1-red/10 px-4 py-3">
            <Text className="text-sm text-f1-red">{error}</Text>
          </View>
        ) : null}
        {success ? (
          <View accessibilityLiveRegion="polite" className="rounded-lg border border-f1-green/20 bg-f1-green/10 px-4 py-3">
            <Text className="text-sm text-f1-green">{success}</Text>
          </View>
        ) : null}

        {/* ── Main card ── */}
        <View className="overflow-hidden rounded-2xl border border-f1-white/10 bg-f1-white/5">
          {/* Avatar & name */}
          <View className="flex-row items-center gap-4 border-b border-f1-white/10 px-5 py-5">
            <Pressable
              onPress={handleChangeAvatar}
              disabled={uploadingAvatar}
              accessibilityRole="button"
              accessibilityLabel={t.profilePage.changeProfilePicture}
              className="relative"
            >
              <Avatar avatarUrl={profile.avatarUrl} displayName={profile.displayName} size={64} />
              <View
                className={`absolute inset-0 items-center justify-center rounded-full ${
                  uploadingAvatar ? "bg-black/50" : ""
                }`}
              >
                {uploadingAvatar ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              </View>
              {/* Camera badge signalling the avatar is tappable */}
              {!uploadingAvatar ? (
                <View className="absolute -bottom-0.5 -right-0.5 h-6 w-6 items-center justify-center rounded-full border border-f1-white/20 bg-f1-black">
                  <Ionicons name="camera" size={12} color="#F7F7F7" />
                </View>
              ) : null}
            </Pressable>

            <View className="flex-1 gap-1">
              {isEditingName ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    onSubmitEditing={() => handleSaveName(profile.displayName)}
                    maxLength={30}
                    autoFocus
                    editable={!saving}
                    placeholderTextColor="#8A8B8A"
                    accessibilityLabel={t.profilePage.editDisplayName}
                    className="flex-1 rounded-lg border border-f1-red bg-f1-white/5 px-3 py-1.5 text-base font-bold text-f1-white"
                  />
                  <Pressable
                    onPress={() => handleSaveName(profile.displayName)}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityLabel={t.profilePage.saveName}
                    className={`h-8 w-8 items-center justify-center rounded-lg bg-f1-green/20 active:bg-f1-green/30 ${
                      saving ? "opacity-50" : ""
                    }`}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#44AF69" />
                    ) : (
                      <Ionicons name="checkmark" size={14} color="#44AF69" />
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => setIsEditingName(false)}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityLabel={t.profilePage.cancelEdit}
                    className="h-8 w-8 items-center justify-center rounded-lg bg-f1-white/10 active:bg-f1-white/20"
                  >
                    <Ionicons name="close" size={14} color="rgba(247,247,247,0.5)" />
                  </Pressable>
                </View>
              ) : (
                <View className="flex-row items-center gap-2">
                  <Text className="shrink text-base font-bold text-f1-white" numberOfLines={1}>
                    {profile.displayName}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setNameInput(profile.displayName);
                      setIsEditingName(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t.profilePage.editDisplayName}
                    hitSlop={8}
                    className="rounded-md p-1 active:bg-f1-white/10"
                  >
                    <Ionicons name="pencil" size={13} color="rgba(247,247,247,0.5)" />
                  </Pressable>
                </View>
              )}
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="mail-outline" size={12} color="rgba(247,247,247,0.5)" />
                <Text className="shrink text-xs text-f1-white/50" numberOfLines={1}>
                  {profile.email}
                </Text>
              </View>
              {memberSince ? (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="calendar-outline" size={11} color="rgba(247,247,247,0.3)" />
                  <Text className="text-[11px] text-f1-white/30">
                    {t.profilePage.memberSince} {memberSince}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Stats */}
          <ProfileStatsRow stats={stats} />

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
              onPress={() => {
                setError(null);
                setShowChangePassword(true);
              }}
            />
          ) : null}

          <AccountRow
            icon="log-out-outline"
            label={t.profilePage.signOut}
            onPress={() => setShowSignOutModal(true)}
          />

          <AccountRow
            icon="trash-outline"
            label={t.profilePage.deleteAccount}
            tone="danger"
            last
            onPress={() => {
              setError(null);
              setShowDeleteConfirm(true);
            }}
          />
        </View>

        {/* Auth provider footer note */}
        <Text className="text-center text-[11px] text-f1-white/30">
          {t.profilePage.signedInWith}{" "}
          {authProvider === "google" ? t.profilePage.google : t.profilePage.emailAndPassword}
        </Text>
      </ScrollView>

      {/* ── Modals ── */}
      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={() => flashSuccess(t.profilePage.passwordUpdated)}
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

      <DeleteAccountModal
        visible={showDeleteConfirm}
        email={profile.email}
        authProvider={authProvider}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </View>
  );
}
