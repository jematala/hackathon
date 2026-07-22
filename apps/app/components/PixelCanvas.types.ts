export type StickerExport = {
  base64: string;
  dataUrl: string;
  filename: string;
  mimeType: "image/png";
};

export type PixelCanvasRef = {
  clear: () => void;
  exportAsBase64: () => Promise<StickerExport | null>;
};

export type PixelCanvasProps = {
  brushColor?: string;
  size?: number;
};
