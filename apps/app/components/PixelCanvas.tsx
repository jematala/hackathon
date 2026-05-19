import { forwardRef } from "react";
import { StyleSheet, View } from "react-native";
import { BrushTool, Dotting, DottingRef } from "dotting";

type PixelCanvasProps = {
  brushColor?: string;
};

export const PixelCanvas = forwardRef<DottingRef, PixelCanvasProps>(function PixelCanvas(
  { brushColor = "#111827" },
  ref,
) {
  return (
    <View style={styles.container}>
      <Dotting
        ref={ref}
        width={384}
        height={384}
        brushColor={brushColor}
        brushTool={BrushTool.DOT}
        isGridFixed
        isPanZoomable={false}
        minColumnCount={64}
        maxColumnCount={64}
        minRowCount={64}
        maxRowCount={64}
        gridSquareLength={6}
        isGridVisible
        defaultPixelColor="#ffffff"
        backgroundColor="#ffffff"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: 8,
    overflow: "hidden",
  },
});
