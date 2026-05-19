import { useCallback, useRef, useState } from "react";
import { Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { fonts } from "@/app/theme";
import { PixelCanvas, type PixelCanvasRef, type StickerExport } from "@/components/PixelCanvas";

const COLORS = [
  { label: "Dark", value: "#111827" },
  { label: "Teal", value: "#0f766e" },
  { label: "Green", value: "#4A7C59" },
  { label: "Tan", value: "#D4A574" },
  { label: "Brown", value: "#8B6914" },
  { label: "Red", value: "#b91c1c" },
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#000000" },
];

type CreateStickerPanelProps = {
  onClose?: () => void;
};

export function CreateStickerPanel({ onClose }: CreateStickerPanelProps) {
  const ref = useRef<PixelCanvasRef>(null);
  const preparedStickerRef = useRef<StickerExport | null>(null);
  const [brushColor, setBrushColor] = useState("#111827");
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    const payload = await ref.current?.exportAsBase64();
    if (!payload) return;

    if (Platform.OS === "web") {
      const link = document.createElement("a");
      link.href = payload.dataUrl;
      link.download = payload.filename;
      link.click();
    } else {
      await Share.share({ url: payload.dataUrl });
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!ref.current) {
      setSubmitStatus("Sticker is not ready yet.");
      return;
    }

    const payload = await ref.current.exportAsBase64();
    preparedStickerRef.current = payload;
    setSubmitStatus(payload ? `Ready to send ${payload.filename}` : "Could not prepare sticker.");
  }, []);

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>Sticker Maker</Text>
          <Text style={styles.subtitle}>Draw a 64x64 sticker to post!</Text>
        </View>

        {onClose ? (
          <Pressable
            accessibilityLabel="Close sticker maker"
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeText}>x</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.canvasCard}>
        <PixelCanvas ref={ref} brushColor={brushColor} />
      </View>

      <View style={styles.paletteHeader}>
        <Text style={styles.label}>Colours</Text>
      </View>

      <View style={styles.palette}>
        {COLORS.map((c) => (
          <Pressable
            accessibilityLabel={`Select ${c.label}`}
            key={c.value}
            onPress={() => setBrushColor(c.value)}
            style={[
              styles.swatch,
              { backgroundColor: c.value },
              brushColor === c.value && styles.swatchActive,
            ]}
          >
            {brushColor === c.value && <Text style={styles.check}>✓</Text>}
          </Pressable>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={() => ref.current?.clear()}>
          <Text style={styles.actionLabel}>Clear</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={handleDownload}
        >
          <Text style={[styles.actionLabel, styles.actionLabelPrimary]}>Download</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.actionButtonSubmit]} onPress={handleSubmit}>
          <Text style={[styles.actionLabel, styles.actionLabelSubmit]}>Submit</Text>
        </Pressable>
      </View>

      {submitStatus ? <Text style={styles.submitStatus}>{submitStatus}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#f4ead7",
    borderColor: "#5f4a2d",
    borderRadius: 8,
    borderWidth: 3,
    gap: 8,
    padding: 12,
    shadowColor: "#2a1f15",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    width: "100%",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  heading: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    color: "#2f6b42",
    fontFamily: fonts.family,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: "#2d2418",
    fontFamily: fonts.family,
    fontSize: 26,
  },
  subtitle: {
    color: "#69563f",
    fontFamily: fonts.family,
    fontSize: 15,
    lineHeight: 21,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#e1c59b",
    borderColor: "#5f4a2d",
    borderRadius: 8,
    borderWidth: 2,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  closeText: {
    color: "#2d2418",
    fontFamily: fonts.family,
    fontSize: 20,
    lineHeight: 22,
  },
  canvasCard: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderColor: "#5f4a2d",
    borderRadius: 8,
    borderWidth: 2,
    maxWidth: "100%",
    overflow: "hidden",
  },
  paletteHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    color: "#3d3224",
    fontFamily: fonts.family,
    fontSize: 13,
    textTransform: "uppercase",
  },
  currentColour: {
    borderColor: "#5f4a2d",
    borderRadius: 4,
    borderWidth: 2,
    height: 18,
    width: 36,
  },
  palette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  swatch: {
    alignItems: "center",
    borderColor: "#9c7b51",
    borderRadius: 8,
    borderWidth: 2,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  swatchActive: {
    borderColor: "#2d2418",
    transform: [{ translateY: -2 }],
  },
  check: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: "#fff8e8",
    borderColor: "#5f4a2d",
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  actionButtonPrimary: {
    backgroundColor: "#e1c59b",
  },
  actionButtonSubmit: {
    backgroundColor: "#2f6b42",
  },
  actionLabel: {
    color: "#2d2418",
    fontFamily: fonts.family,
    fontSize: 15,
  },
  actionLabelPrimary: {
    color: "#2d2418",
  },
  actionLabelSubmit: {
    color: "#fff8e8",
  },
  submitStatus: {
    color: "#3d3224",
    fontFamily: fonts.family,
    fontSize: 13,
    textAlign: "center",
  },
});
