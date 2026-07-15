import { Image } from "expo-image";

/**
 * The F1 Prediction mark (same artwork as the web's public/logo.svg,
 * rasterized into assets/images/logo.png). Shown in the tab headers and at
 * the foot of the profile drawer.
 */
export function AppLogo({ size = 24 }: { size?: number }) {
  return (
    <Image
      source={require("../../../assets/images/logo.png")}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel="F1 Prediction"
    />
  );
}
