import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

import { useLanguage } from "@/providers/LanguageProvider";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  /** Small subtitle under the title, e.g. the race name. */
  subtitle?: string;
  body: string;
  confirmLabel: string;
  /** Label swapped in while the request is in flight. */
  confirmingLabel: string;
  /** Visual tone of the confirm button. */
  tone: "red" | "blue";
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Centered confirmation dialog used before destructive or overwriting
 * actions (reset prediction, update an already-submitted prediction).
 */
export function ConfirmModal({
  visible,
  title,
  subtitle,
  body,
  confirmLabel,
  confirmingLabel,
  tone,
  isSaving,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { t } = useLanguage();
  const confirmBg = tone === "red" ? "bg-f1-red active:bg-f1-red-hover" : "bg-f1-blue active:bg-f1-blue/80";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/60 p-6">
        <View className="w-full max-w-sm overflow-hidden rounded-2xl border border-f1-white/10 bg-f1-black">
          <View className="border-b border-f1-white/10 px-5 py-4">
            <Text className="text-base font-semibold text-f1-white">{title}</Text>
            {subtitle ? <Text className="mt-0.5 text-xs text-f1-white/50">{subtitle}</Text> : null}
          </View>
          <View className="px-5 py-4">
            <Text className="text-sm leading-5 text-f1-white/70">{body}</Text>
          </View>
          <View className="flex-row items-center justify-end gap-2 border-t border-f1-white/10 px-5 py-3">
            <Pressable
              onPress={onCancel}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel={t.navbar.cancel}
              className={`min-h-11 items-center justify-center rounded-lg border border-f1-white/10 px-4 active:bg-f1-white/10 ${
                isSaving ? "opacity-50" : ""
              }`}
            >
              <Text className="text-sm font-medium text-f1-white/70">{t.navbar.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              className={`min-h-11 flex-row items-center justify-center gap-2 rounded-lg px-4 ${confirmBg} ${
                isSaving ? "opacity-70" : ""
              }`}
            >
              {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text className="text-sm font-semibold text-white">
                {isSaving ? confirmingLabel : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
