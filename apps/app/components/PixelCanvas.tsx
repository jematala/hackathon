import { forwardRef, useMemo } from "react";
import { BrushTool, Dotting, DottingRef } from "dotting";

const GRID = 64;

function makeInitData() {
  return Array.from({ length: GRID }, (_, rowIndex) =>
    Array.from({ length: GRID }, (_, columnIndex) => ({
      rowIndex,
      columnIndex,
      color: "",
    })),
  );
}

type PixelCanvasProps = {
  brushColor?: string;
};

export const PixelCanvas = forwardRef<DottingRef, PixelCanvasProps>(function PixelCanvas(
  { brushColor = "#111827" },
  ref,
) {
  const initLayers = useMemo(() => [{ id: "layer1", data: makeInitData() }], []);

  return (
    <Dotting
      ref={ref}
      width={320}
      height={320}
      brushColor={brushColor}
      brushTool={BrushTool.DOT}
      isGridFixed
      isPanZoomable={false}
      minColumnCount={GRID}
      maxColumnCount={GRID}
      minRowCount={GRID}
      maxRowCount={GRID}
      isGridVisible={false}
      initAutoScale={false}
      defaultPixelColor="transparent"
      backgroundColor="transparent"
      initLayers={initLayers}
      style={{
        border: "none",
        padding: "none",
        margin: "none",
      }}
    />
  );
});
