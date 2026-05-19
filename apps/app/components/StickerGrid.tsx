import { StyleSheet, View } from "react-native";

import { pixelBorder } from "@/app/theme";

type StickerGridProps = {
  grid: string[];
  gridSize: number;
};

export function StickerGrid({ grid, gridSize }: StickerGridProps) {
  const cellSize = Math.floor(256 / gridSize);

  const rows = [];
  for (let row = 0; row < gridSize; row++) {
    const cells = [];
    for (let col = 0; col < gridSize; col++) {
      const index = row * gridSize + col;
      cells.push(
        <View
          key={col}
          style={[
            styles.cell,
            {
              backgroundColor: grid[index],
              height: cellSize,
              width: cellSize,
            },
          ]}
        />,
      );
    }
    rows.push(
      <View key={row} style={styles.row}>
        {cells}
      </View>,
    );
  }

  return <View style={styles.grid}>{rows}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "column",
    ...pixelBorder,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  cell: {},
});
