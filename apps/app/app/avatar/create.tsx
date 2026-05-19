import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { PixelGrid } from "@/components/PixelGrid";
import { Screen } from "@/components/Screen";
import { colors, fonts, pixelBorder } from "@/app/theme";

const PALETTE = [
  "#2D2D2D",
  "#E8B4B4",
  "#C8A882",
  "#4A7C59",
  "#8B6914",
  "#F5E6CA",
  "#D94F4F",
  "#F4D03F",
];

const GRID_SIZE = 64;

function createEmptyGrid(): string[] {
  return Array(GRID_SIZE * GRID_SIZE).fill(PALETTE[5]);
}

export default function CreateAvatarScreen() {
  const [grid, setGrid] = useState(createEmptyGrid);
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);

  const handleCellPress = (index: number) => {
    setGrid((prev) => {
      const next = [...prev];
      next[index] = selectedColor;
      return next;
    });
  };

  const handleSave = () => {
    console.log("Avatar saved (stub)");
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.heading}>Create Your Avatar</Text>
        <Text style={styles.instructions}>Tap cells to fill. Choose a colour below.</Text>

        <View style={styles.canvas}>
          <PixelGrid grid={grid} gridSize={GRID_SIZE} onCellPress={handleCellPress} />
        </View>

        <View style={styles.palette}>
          {PALETTE.map((color) => (
            <View
              key={color}
              style={[
                styles.swatch,
                { backgroundColor: color },
                selectedColor === color && styles.selectedSwatch,
              ]}
            >
              <Text style={styles.swatchHitArea} onPress={() => setSelectedColor(color)} />
            </View>
          ))}
        </View>

        <Button label="Save Avatar" onPress={handleSave} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 16,
  },
  heading: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 28,
  },
  instructions: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 16,
  },
  canvas: {
    ...pixelBorder,
    overflow: "hidden",
  },
  palette: {
    flexDirection: "row",
    gap: 8,
  },
  swatch: {
    borderRadius: 4,
    height: 36,
    width: 36,
  },
  selectedSwatch: {
    ...pixelBorder,
    borderColor: colors.text,
  },
  swatchHitArea: {
    height: "100%",
    width: "100%",
  },
});
