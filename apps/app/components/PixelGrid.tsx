import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

type PixelGridProps = {
  grid: string[];
  gridSize: number;
  onCellPress: (index: number) => void;
};

export function PixelGrid({ grid, gridSize, onCellPress }: PixelGridProps) {
  const cellSize = useMemo(() => Math.floor(256 / gridSize), [gridSize]);

  const rows = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (let row = 0; row < gridSize; row++) {
      const cells: React.ReactNode[] = [];
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
      result.push(
        <View key={row} style={styles.row}>
          {cells}
        </View>,
      );
    }
    return result;
  }, [grid, gridSize, cellSize, onCellPress]);

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
