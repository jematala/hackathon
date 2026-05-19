import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { DottingRef } from "dotting";
import { fonts } from "@/app/theme";
import { ApiError } from "@/lib/api/client";
import { useCreateStickerAsset, useSaveSticker } from "@/lib/api/hooks";
import { PixelCanvas } from "@/components/PixelCanvas";

const STICKER_SIZE = 64;

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

type CreateStickerPanelVariant = "sticker" | "avatar";

type CreateStickerPanelProps = {
  onClose?: () => void;
  variant?: CreateStickerPanelVariant;
  onAvatarSaved?: (payload: { dataUrl: string; base64: string }) => void;
};

type StickerUploadPayload = {
  base64: string;
  dataUrl: string;
  filename: string;
  mimeType: "image/png";
};

function prepareStickerUpload(ref: DottingRef): StickerUploadPayload | null {
  if (typeof document === "undefined") {
    return null;
  }

  const [layer] = ref.getLayersAsArray();
  if (!layer) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = STICKER_SIZE;
  canvas.height = STICKER_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  for (const row of layer.data) {
    for (const pixel of row) {
      if (!pixel.color || pixel.color === "transparent") {
        continue;
      }

      context.fillStyle = pixel.color;
      context.fillRect(pixel.columnIndex, pixel.rowIndex, 1, 1);
    }
  }

  const dataUrl = canvas.toDataURL("image/png");

  return {
    base64: dataUrl.replace(/^data:image\/png;base64,/, ""),
    dataUrl,
    filename: "sticker.png",
    mimeType: "image/png",
  };
}

export function CreateStickerPanel({
  onClose,
  variant = "sticker",
  onAvatarSaved,
}: CreateStickerPanelProps) {
  const isAvatar = variant === "avatar";
  const ref = useRef<DottingRef>(null);
  const [brushColor, setBrushColor] = useState("#111827");
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitTone, setSubmitTone] = useState<"info" | "success" | "error">("info");
  const createAsset = useCreateStickerAsset();
  const saveSticker = useSaveSticker();
  const isSubmitting = !isAvatar && (createAsset.isPending || saveSticker.isPending);

  const handleDownload = useCallback(() => {
    ref.current?.downloadImage({ type: "png" });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!ref.current) {
      setSubmitTone("error");
      setSubmitStatus(isAvatar ? "Avatar is not ready yet." : "Sticker is not ready yet.");
      return;
    }

    const payload = prepareStickerUpload(ref.current);
    if (!payload) {
      setSubmitTone("error");
      setSubmitStatus(isAvatar ? "Could not prepare avatar." : "Could not prepare sticker.");
      return;
    }

    if (isAvatar) {
      onAvatarSaved?.({ dataUrl: payload.dataUrl, base64: payload.base64 });
      setSubmitTone("success");
      setSubmitStatus("Avatar saved!");
      return;
    }

    setSubmitTone("info");
    setSubmitStatus("Saving to your collection…");

    try {
      const { sticker } = await createAsset.mutateAsync({
        pngBase64: payload.base64,
        width: STICKER_SIZE,
        height: STICKER_SIZE,
      });
      await saveSticker.mutateAsync({
        kind: "sticker",
        stickerAssetId: sticker.id,
      });
      setSubmitTone("success");
      setSubmitStatus("Saved to your collection!");
      ref.current?.clear();
    } catch (err) {
      setSubmitTone("error");
      if (err instanceof ApiError) {
        if (err.code === "capacity_reached") {
          setSubmitStatus("Your collection is full. Delete one to make room.");
        } else if (err.code === "moderation_rejected") {
          setSubmitStatus("Sticker was rejected by moderation.");
        } else {
          setSubmitStatus(err.message);
        }
      } else if (err instanceof Error) {
        setSubmitStatus(`Couldn't save sticker: ${err.message}`);
      } else {
        setSubmitStatus("Couldn't save sticker. Try again.");
      }
    }
  }, [createAsset, saveSticker, isAvatar, onAvatarSaved]);

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>{isAvatar ? "Avatar Maker" : "Sticker Maker"}</Text>
          <Text style={styles.subtitle}>
            {isAvatar
              ? "Draw a 64x64 pixel art portrait — this becomes your profile picture."
              : "Draw a 64x64 sticker to post!"}
          </Text>
        </View>

        {onClose ? (
          <Pressable
            accessibilityLabel={isAvatar ? "Close avatar maker" : "Close sticker maker"}
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
        <Pressable
          accessibilityLabel={isAvatar ? "Save avatar" : "Save sticker to collection"}
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={[
            styles.actionButton,
            styles.actionButtonSubmit,
            isSubmitting ? styles.actionButtonDisabled : null,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff8e8" size="small" />
          ) : (
            <Text style={[styles.actionLabel, styles.actionLabelSubmit]}>
              {isAvatar ? "Set as Avatar" : "Save"}
            </Text>
          )}
        </Pressable>
      </View>

      {submitStatus ? (
        <Text
          style={[
            styles.submitStatus,
            submitTone === "success" ? styles.submitStatusSuccess : null,
            submitTone === "error" ? styles.submitStatusError : null,
          ]}
        >
          {submitStatus}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#f4ead7",
    borderColor: "#5f4a2d",
    borderRadius: 8,
    borderWidth: 3,
    gap: 14,
    padding: 16,
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
    fontWeight: "800",
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
    fontWeight: "800",
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
    fontWeight: "700",
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
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  actionButtonPrimary: {
    backgroundColor: "#e1c59b",
  },
  actionButtonSubmit: {
    backgroundColor: "#2f6b42",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionLabel: {
    color: "#2d2418",
    fontFamily: fonts.family,
    fontSize: 15,
    fontWeight: "800",
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
    fontWeight: "700",
    textAlign: "center",
  },
  submitStatusSuccess: {
    color: "#2f6b42",
  },
  submitStatusError: {
    color: "#b91c1c",
  },
});
