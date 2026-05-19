import { StyleSheet, View, Text } from "react-native";
import { colors, fonts, pixelBorder } from "@/app/theme";

type PixelGridProps = {
  grid: string[];
  gridSize: number;
  onCellPress: (index: number) => void;
};

export function PixelGrid({ grid, gridSize, onCellPress }: PixelGridProps) {
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
        >
          <View style={styles.hitArea} onTouchEnd={() => onCellPress(index)} />
        </View>,
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
  },
  row: {
    flexDirection: "row",
  },
  cell: {},
  hitArea: {
    height: "100%",
    width: "100%",
  },
});
