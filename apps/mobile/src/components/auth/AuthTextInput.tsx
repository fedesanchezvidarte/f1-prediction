import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

import { useLanguage } from "@/providers/LanguageProvider";

interface AuthTextInputProps extends TextInputProps {
  label: string;
  /** Rendered on the right of the label row (e.g. a "Forgot password?" link). */
  labelAccessory?: React.ReactNode;
  /** Password field: masks input and adds a show/hide toggle. */
  secure?: boolean;
}

/** Labeled text input matching the web auth forms (dark card, red focus ring). */
export function AuthTextInput({
  label,
  labelAccessory,
  secure = false,
  ...inputProps
}: AuthTextInputProps) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-f1-white">{label}</Text>
        {labelAccessory}
      </View>
      <View className="relative">
        <TextInput
          {...inputProps}
          secureTextEntry={secure && !showPassword}
          placeholderTextColor="#8A8B8A"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full rounded-lg border bg-f1-white/5 px-4 py-3 text-sm text-f1-white ${
            secure ? "pr-11" : ""
          } ${focused ? "border-f1-red" : "border-f1-white/10"}`}
        />
        {secure ? (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? t.login.hidePassword : t.login.showPassword
            }
            className="absolute right-3 top-0 bottom-0 justify-center"
            hitSlop={8}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color="#8A8B8A"
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
