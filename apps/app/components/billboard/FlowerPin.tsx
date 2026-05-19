import { StyleSheet, View } from "react-native";

type FlowerPinProps = {
  fill: string;
  accent: string;
  size?: number;
};

// Small deterministic "jitter" per petal so the flower doesn't look
// algorithmically perfect. Values are hand-picked, not generated.
const PETAL_JITTER: ReadonlyArray<{ angleOffset: number; scale: number }> = [
  { angleOffset: -4, scale: 1.02 },
  { angleOffset: 3, scale: 0.94 },
  { angleOffset: -2, scale: 1.05 },
  { angleOffset: 5, scale: 0.97 },
  { angleOffset: -3, scale: 1.0 },
  { angleOffset: 2, scale: 0.96 },
];

export function FlowerPin({ fill, accent, size = 16 }: FlowerPinProps) {
  // Six petals reads more like a real flower than five evenly-spaced circles.
  const petalCount = 6;
  const petalW = size * 0.42;
  const petalH = size * 0.62;
  const petalOffset = size * 0.24;
  const centerSize = size * 0.36;
  const centerHighlight = centerSize * 0.45;
  // Slight global tilt so each pin looks like it was placed by a different hand.
  const tilt = ((fill.charCodeAt(0) % 11) - 5) * 1.4;

  return (
    <View style={[styles.host, { width: size, height: size, transform: [{ rotate: `${tilt}deg` }] }]}>
      {Array.from({ length: petalCount }).map((_, i) => {
        const baseAngle = (i * 360) / petalCount;
        const { angleOffset, scale } = PETAL_JITTER[i % PETAL_JITTER.length] ?? {
          angleOffset: 0,
          scale: 1,
        };
        const w = petalW * scale;
        const h = petalH * scale;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: (size - w) / 2,
              top: (size - h) / 2,
              width: w,
              height: h,
              borderRadius: Math.max(w, h),
              backgroundColor: fill,
              transform: [
                { rotate: `${baseAngle + angleOffset}deg` },
                { translateY: -petalOffset },
              ],
            }}
          />
        );
      })}
      <View
        style={{
          position: "absolute",
          left: size / 2 - centerSize / 2,
          top: size / 2 - centerSize / 2,
          width: centerSize,
          height: centerSize,
          borderRadius: centerSize / 2,
          backgroundColor: accent,
        }}
      />
      {/* Off-center highlight on the seed bead — sells the "drawn, not generated" feel. */}
      <View
        style={{
          position: "absolute",
          left: size / 2 - centerSize / 2 + centerSize * 0.18,
          top: size / 2 - centerSize / 2 + centerSize * 0.14,
          width: centerHighlight,
          height: centerHighlight,
          borderRadius: centerHighlight / 2,
          backgroundColor: fill,
          opacity: 0.55,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    justifyContent: "center",
  },
});
