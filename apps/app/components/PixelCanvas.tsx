import { Platform } from "react-native";
import { PixelCanvas as PixelCanvasWeb } from "./PixelCanvas.web";
import { PixelCanvas as PixelCanvasNative } from "./PixelCanvas.native";

export type { PixelCanvasRef, StickerExport } from "./PixelCanvas.types";

export const PixelCanvas = Platform.OS === "web" ? PixelCanvasWeb : PixelCanvasNative;
