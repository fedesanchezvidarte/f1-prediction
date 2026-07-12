import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PointSystemRule, PointSystemSection } from "@f1/shared/types";

import { useLanguage } from "@/providers/LanguageProvider";

interface PointSystemModalProps {
  visible: boolean;
  sections: PointSystemSection[];
  onClose: () => void;
}

/**
 * Ports the web PointSystemModal as a bottom sheet (TeamPickerModal pattern).
 * The web hover tooltips for worked examples become tap-to-expand rows.
 */
export function PointSystemModal({ visible, sections, onClose }: PointSystemModalProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.predictionsPage.dismiss}
        />
        <View
          className="max-h-[85%] rounded-t-3xl border-t border-f1-purple/30 bg-f1-black"
          style={{ paddingBottom: insets.bottom }}
        >
          {/* Header */}
          <View className="flex-row items-start justify-between border-b border-f1-white/10 px-5 py-4">
            <View className="flex-1 flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-f1-purple/15">
                <Ionicons name="sparkles" size={18} color="#A06CD5" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-f1-white" numberOfLines={1}>
                  {t.pointSystem.modalTitle}
                </Text>
                <Text className="mt-0.5 text-[11px] text-f1-white/50" numberOfLines={2}>
                  {t.pointSystem.modalSubtitle}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t.pointSystem.closeModal}
              className="h-8 w-8 items-center justify-center rounded-full bg-f1-white/10 active:bg-f1-white/20"
            >
              <Ionicons name="close" size={16} color="#F7F7F7" />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="gap-6 p-5">
            {sections.map((section) => (
              <View key={section.title}>
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 text-sm font-semibold text-f1-white" numberOfLines={1}>
                    {section.title}
                  </Text>
                  <View className="rounded-full bg-f1-red/10 px-2.5 py-0.5">
                    <Text className="text-[10px] font-semibold text-f1-red">
                      {t.pointSystem.max} {section.maxPoints} {t.pointSystem.pts}
                    </Text>
                  </View>
                </View>
                <View className="mt-3 gap-1">
                  {section.rules.map((rule) => (
                    <RuleRow key={rule.category} rule={rule} />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** One scoring rule; rules with a worked example expand it inline on tap. */
function RuleRow({ rule }: { rule: PointSystemRule }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const hasExample = Boolean(rule.example);

  const body = (
    <>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-1.5">
          <Text className="text-xs font-medium text-f1-white" numberOfLines={1}>
            {rule.category}
          </Text>
          {hasExample ? (
            <Ionicons
              name="information-circle-outline"
              size={13}
              color={expanded ? "#A06CD5" : "#A06CD5B3"}
            />
          ) : null}
        </View>
        <Text className="ml-4 text-xs font-semibold tabular-nums text-f1-amber">
          +{rule.points}
        </Text>
      </View>
      <Text className="mt-0.5 text-[10px] text-f1-white/50">{rule.description}</Text>
      {expanded && hasExample ? (
        <View className="mt-2 rounded-lg border border-f1-purple/30 bg-f1-purple/5 p-2.5">
          <Text className="text-[9px] font-semibold uppercase tracking-wide text-f1-purple">
            {t.pointSystem.example}
          </Text>
          <Text className="mt-0.5 text-[11px] leading-relaxed text-f1-white">{rule.example}</Text>
        </View>
      ) : null}
    </>
  );

  if (!hasExample) {
    return <View className="rounded-md px-3 py-2">{body}</View>;
  }

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      accessibilityRole="button"
      accessibilityLabel={`${rule.category} — ${t.pointSystem.showExample}`}
      accessibilityState={{ expanded }}
      className="rounded-md bg-f1-purple/5 px-3 py-2 active:bg-f1-purple/10"
    >
      {body}
    </Pressable>
  );
}
