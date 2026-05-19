import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, pixelBorder } from "@/app/theme";

type POIMarkerProps = {
  name: string;
  distance?: string;
};

export function POIMarker({ name, distance }: POIMarkerProps) {
  return (
    <View style={styles.marker}>
      <View style={styles.inner}>
        <Text style={styles.icon}>⭐</Text>
        <View style={styles.labelContainer}>
          <Text style={styles.name}>{name}</Text>
          {distance && <Text style={styles.distance}>{distance}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    ...pixelBorder,
    borderColor: colors.accent,
    backgroundColor: colors.card,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 6,
  },
  icon: {
    fontSize: 20,
  },
  labelContainer: {
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
    fontFamily: fonts.family,
    fontWeight: "700",
  },
  distance: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontFamily: fonts.family,
  },
});
