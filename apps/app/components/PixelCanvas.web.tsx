import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { BrushTool, Dotting, DottingRef } from "dotting";
import type { PixelCanvasRef, StickerExport } from "./PixelCanvas.types";

export type { PixelCanvasRef, StickerExport };

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

export const PixelCanvas = forwardRef<PixelCanvasRef, PixelCanvasProps>(function PixelCanvas(
  { brushColor = "#111827" },
  ref,
) {
  const dottingRef = useRef<DottingRef>(null);
  const initLayers = useMemo(() => [{ id: "layer1", data: makeInitData() }], []);

  useImperativeHandle(
    ref,
    () => ({
      clear: () => dottingRef.current?.clear(),
      exportAsBase64: (): Promise<StickerExport | null> => {
        const [layer] = dottingRef.current?.getLayersAsArray() ?? [];
        if (!layer) return Promise.resolve(null);

        const canvas = document.createElement("canvas");
        canvas.width = GRID;
        canvas.height = GRID;
        const context = canvas.getContext("2d");
        if (!context) return Promise.resolve(null);

        for (const row of layer.data) {
          for (const pixel of row) {
            if (!pixel.color || pixel.color === "transparent") continue;
            context.fillStyle = pixel.color;
            context.fillRect(pixel.columnIndex, pixel.rowIndex, 1, 1);
          }
        }

        const dataUrl = canvas.toDataURL("image/png");
        return Promise.resolve({
          base64: dataUrl.replace(/^data:image\/png;base64,/, ""),
          dataUrl,
          filename: "sticker.png",
          mimeType: "image/png",
        });
      },
    }),
    [],
  );

  return (
    <Dotting
      ref={dottingRef}
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
