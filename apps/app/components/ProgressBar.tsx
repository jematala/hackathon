import { StyleSheet, Text, View } from "react-native";

type ProgressBarProps = {
  value: number;
  max: number;
};

export function ProgressBar({ value, max }: ProgressBarProps) {
  const safeMax = Math.max(1, max);
  const clamped = Math.min(safeMax, Math.max(0, value));
  const pct = (clamped / safeMax) * 100;

  return (
    <View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.label}>
        {clamped} / {safeMax}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: "#F2DCB2",
    borderColor: "#B17833",
    borderRadius: 6,
    borderWidth: 2,
    height: 18,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    backgroundColor: "#5b7559",
    height: "100%",
  },
  label: {
    color: "#6A401A",
    fontFamily: "Jersey10",
    fontSize: 16,
    marginTop: 2,
  },
});
