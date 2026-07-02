import type { DimensionValue, ImageStyle } from "react-native";
import { Image, Platform, StyleSheet, View } from "react-native";

const PAW = require("../../assets/images/paw.png");

type PawSpot = {
  left: DimensionValue;
  bottom: number;
  size: number;
  rotate: string;
};

// Fixed layout (deterministic — no per-render randomness), lower third of the
// screen, arrangement matched to the mock.
const LAYOUT: PawSpot[] = [
  { left: "6%", bottom: 28, size: 48, rotate: "-18deg" },
  { left: "28%", bottom: 8, size: 56, rotate: "8deg" },
  { left: "34%", bottom: 108, size: 44, rotate: "-6deg" },
  { left: "56%", bottom: 62, size: 40, rotate: "16deg" },
  { left: "64%", bottom: 172, size: 52, rotate: "-10deg" },
  { left: "82%", bottom: 124, size: 48, rotate: "12deg" },
  { left: "88%", bottom: 14, size: 44, rotate: "-4deg" },
];

// react-native-web passes this through to the DOM; keeps the pixel art crisp
const pixelated =
  Platform.OS === "web" ? ({ imageRendering: "pixelated" } as unknown as ImageStyle) : null;

export function PawScatter() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {LAYOUT.map((paw, index) => (
        <Image
          key={index}
          source={PAW}
          style={[
            styles.paw,
            pixelated,
            {
              bottom: paw.bottom,
              height: paw.size,
              left: paw.left,
              transform: [{ rotate: paw.rotate }],
              width: paw.size,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  paw: {
    opacity: 0.45,
    position: "absolute",
  },
});
