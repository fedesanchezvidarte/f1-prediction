import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { buildPointSystem } from "@f1/shared/lib/point-system";

import { useLanguage } from "@/providers/LanguageProvider";
import { PointSystemModal } from "./PointSystemModal";

/** Ports the web PointSystemCard: tap to open the scoring rules bottom sheet. */
export function PointSystemCard() {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const sections = buildPointSystem(t.pointSystem.sections);

  return (
    <>
      <Pressable
        onPress={() => setModalOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t.pointSystem.title} — ${t.pointSystem.tapToView}`}
        className="flex-1 items-center justify-center gap-3 rounded-2xl border border-f1-white/10 bg-f1-white/5 p-5 active:bg-f1-white/10"
      >
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-f1-purple/10">
          <Ionicons name="help-circle-outline" size={20} color="#A06CD5" />
        </View>
        <View>
          <Text className="text-center text-xs font-medium text-f1-white">
            {t.pointSystem.title}
          </Text>
          <Text className="mt-0.5 text-center text-[10px] text-f1-white/50">
            {t.pointSystem.tapToView}
          </Text>
        </View>
      </Pressable>

      <PointSystemModal
        visible={modalOpen}
        sections={sections}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
