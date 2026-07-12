import { Text, View } from "react-native";

/**
 * Amber / silver / bronze badge for the top 3, plain number below — the same
 * treatment the web dashboard cards and the mobile Leaderboard screen use.
 */
export function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <View className="h-6 w-6 items-center justify-center rounded-full bg-f1-amber/15">
        <Text className="text-[10px] font-bold text-f1-amber">1</Text>
      </View>
    );
  }
  if (rank === 2) {
    return (
      <View className="h-6 w-6 items-center justify-center rounded-full bg-gray-400/15">
        <Text className="text-[10px] font-bold text-gray-400">2</Text>
      </View>
    );
  }
  if (rank === 3) {
    return (
      <View className="h-6 w-6 items-center justify-center rounded-full bg-amber-700/15">
        <Text className="text-[10px] font-bold text-amber-700">3</Text>
      </View>
    );
  }
  return (
    <View className="h-6 w-6 items-center justify-center">
      <Text className="text-[10px] tabular-nums text-f1-white/50">{rank}</Text>
    </View>
  );
}
