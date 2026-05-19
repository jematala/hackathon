import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { PixelGrid } from "@/components/PixelGrid";
import { Screen } from "@/components/Screen";
import { StickerPalette } from "@/components/StickerPalette";
import { colors, fonts, pixelBorder, stickerPalette } from "@/app/theme";

const GRID_SIZE = 64;

function createEmptyGrid(): string[] {
  return Array(GRID_SIZE * GRID_SIZE).fill(stickerPalette[4]);
}

export default function CreateAvatarScreen() {
  const [grid, setGrid] = useState(createEmptyGrid);
  const [selectedColor, setSelectedColor] = useState(stickerPalette[0]);

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

        <StickerPalette selectedColor={selectedColor} onSelect={setSelectedColor} />

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
    fontWeight: "700",
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
});
