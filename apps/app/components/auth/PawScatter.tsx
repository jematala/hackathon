import type { DimensionValue, ImageStyle } from "react-native";
import { Image, Platform, StyleSheet, View } from "react-native";

const PAW = require("../../assets/images/paw.png");

type PawSpot = {
  left: DimensionValue;
  bottom: number;
  size: number;
  rotate: string;
};

// Fixed layout (deterministic — no per-render randomness) matched to the
// Figma mock: a walking trail climbing diagonally from the bottom-left corner
// to the right edge, steps alternating like footprints.
const LAYOUT: PawSpot[] = [
  { left: "-3%", bottom: 14, size: 66, rotate: "16deg" },
  { left: "24%", bottom: 4, size: 70, rotate: "36deg" },
  { left: "27%", bottom: 106, size: 62, rotate: "14deg" },
  { left: "54%", bottom: 70, size: 66, rotate: "34deg" },
  { left: "60%", bottom: 176, size: 58, rotate: "16deg" },
  { left: "86%", bottom: 130, size: 66, rotate: "38deg" },
  { left: "92%", bottom: 232, size: 56, rotate: "18deg" },
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
