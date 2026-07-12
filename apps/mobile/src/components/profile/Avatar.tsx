import { Image, Text, View } from "react-native";

/** "Fede Sanchez" → "FS" — same derivation as the web ProfileContent. */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface AvatarProps {
  avatarUrl: string | null;
  displayName: string;
  /** Diameter in px (header button 30, profile screen 64). */
  size: number;
}

/**
 * Circular user avatar: the profile picture when set, otherwise an initials
 * circle — the same fallback the web navbar/profile use.
 */
export function Avatar({ avatarUrl, displayName, size }: AvatarProps) {
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        accessibilityIgnoresInvertColors
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full bg-f1-white/10"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text className="font-bold text-f1-white" style={{ fontSize: Math.round(size * 0.34) }}>
        {getInitials(displayName)}
      </Text>
    </View>
  );
}
