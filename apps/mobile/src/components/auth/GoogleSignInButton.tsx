import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

interface GoogleSignInButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** "Continue with Google" button matching the web auth pages. */
export function GoogleSignInButton({
  label,
  onPress,
  disabled = false,
}: GoogleSignInButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`w-full flex-row items-center justify-center gap-3 rounded-lg border border-f1-white/10 bg-f1-white/5 px-4 py-3 active:bg-f1-white/10 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <Ionicons name="logo-google" size={18} color="#F7F7F7" />
      <Text className="text-sm font-medium text-f1-white">{label}</Text>
    </Pressable>
  );
}
