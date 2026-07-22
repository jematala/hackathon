import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { fonts } from "@/app/theme";
import { ApiError } from "@/lib/api/client";
import { useCreateStickerAsset, useSaveSticker } from "@/lib/api/hooks";
import { PixelCanvas, type PixelCanvasRef } from "@/components/PixelCanvas";

const STICKER_SIZE = 64;

const COLORS = [
  { label: "Pink", value: "#ff5b6b" },
  { label: "Orange", value: "#ff914d" },
  { label: "Yellow", value: "#ffca3a" },
  { label: "Lime", value: "#82c91e" },
  { label: "Mint", value: "#52ad7d" },
  { label: "Blue", value: "#1e91d6" },
  { label: "Indigo", value: "#4169b1" },
  { label: "Purple", value: "#6f4bb3" },
];

type CreateStickerPanelVariant = "sticker" | "avatar";

type CreateStickerPanelProps = {
  onClose?: () => void;
  variant?: CreateStickerPanelVariant;
  onAvatarSaved?: (payload: { dataUrl: string; base64: string }) => void;
};

export function CreateStickerPanel({
  onClose,
  variant = "sticker",
  onAvatarSaved,
}: CreateStickerPanelProps) {
  const isAvatar = variant === "avatar";
  const { height, width } = useWindowDimensions();
  const ref = useRef<PixelCanvasRef>(null);
  const [brushColor, setBrushColor] = useState(COLORS[0]?.value ?? "#ff5b6b");
  const [stickerName, setStickerName] = useState("");
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitTone, setSubmitTone] = useState<"info" | "success" | "error">("info");
  const createAsset = useCreateStickerAsset();
  const saveSticker = useSaveSticker();
  const isSubmitting = !isAvatar && (createAsset.isPending || saveSticker.isPending);
  const isCompact = width < 390 || height < 720;
  const horizontalPanelPadding = isCompact ? 18 : 38;
  const reservedHeight = isAvatar ? 280 : 370;
  const canvasSize = Math.floor(
    Math.max(184, Math.min(320, width - horizontalPanelPadding * 2 - 42, height - reservedHeight)),
  );

  const handleSubmit = useCallback(async () => {
    if (!ref.current) {
      setSubmitTone("error");
      setSubmitStatus(isAvatar ? "Avatar is not ready yet." : "Sticker is not ready yet.");
      return;
    }

    const payload = await ref.current.exportAsBase64();
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
      setSubmitStatus(
        stickerName.trim()
          ? `${stickerName.trim()} saved to your collection!`
          : "Saved to your collection!",
      );
      ref.current?.clear();
      setStickerName("");
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
  }, [createAsset, saveSticker, isAvatar, onAvatarSaved, stickerName]);

  return (
    <View
      style={[
        styles.panel,
        {
          paddingHorizontal: horizontalPanelPadding,
          paddingTop: isCompact ? 22 : 32,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{isAvatar ? "create avatar" : "create sticker"}</Text>

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
        <PixelCanvas ref={ref} brushColor={brushColor} size={canvasSize} />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Colours</Text>
        <View style={[styles.palette, isCompact ? styles.paletteCompact : null]}>
          {COLORS.map((c) => (
            <Pressable
              accessibilityLabel={`Select ${c.label}`}
              key={c.value}
              onPress={() => setBrushColor(c.value)}
              style={[
                styles.swatch,
                isCompact ? styles.swatchCompact : null,
                { backgroundColor: c.value },
                brushColor === c.value && styles.swatchActive,
              ]}
            />
          ))}
        </View>
      </View>

      {!isAvatar ? (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>name your sticker :</Text>
          <TextInput
            value={stickerName}
            onChangeText={setStickerName}
            maxLength={32}
            placeholder="sticker name..."
            placeholderTextColor="#b5b5a8"
            selectionColor="#5A7258"
            style={styles.nameInput}
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={() => ref.current?.clear()}>
          <Text style={styles.actionLabel}>Clear</Text>
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
              {isAvatar ? "set avatar" : "create"}
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
    backgroundColor: "#f7e7cd",
    borderColor: "#5A7258",
    borderRadius: 18,
    borderWidth: 4,
    gap: 12,
    maxWidth: 490,
    paddingBottom: 24,
    paddingTop: 32,
    shadowColor: "#2a1f15",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    minHeight: 34,
  },
  title: {
    color: "#667f60",
    flex: 1,
    fontFamily: fonts.family,
    fontSize: 36,
    lineHeight: 38,
    textAlign: "center",
    textTransform: "lowercase",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#5A7258",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 0,
    width: 30,
  },
  closeText: {
    color: "#fff7e8",
    fontFamily: fonts.family,
    fontSize: 28,
    lineHeight: 28,
  },
  canvasCard: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#fffaf2",
    borderColor: "#5A7258",
    borderRadius: 0,
    borderStyle: "dashed",
    borderWidth: 3,
    maxWidth: "100%",
    overflow: "hidden",
    padding: 0,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: "#5A7258",
    fontFamily: fonts.family,
    fontSize: 24,
    lineHeight: 26,
    textTransform: "lowercase",
  },
  palette: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#ffdca7",
    borderColor: "#d0a66f",
    borderRadius: 999,
    borderWidth: 3,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  paletteCompact: {
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  swatch: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 18,
    borderWidth: 3,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  swatchCompact: {
    height: 30,
    width: 30,
  },
  swatchActive: {
    borderColor: "#92323a",
    transform: [{ scale: 1.08 }],
  },
  nameInput: {
    alignSelf: "center",
    backgroundColor: "#fffaf2",
    borderColor: "#5A7258",
    borderRadius: 10,
    borderWidth: 4,
    color: "#5A7258",
    fontFamily: fonts.family,
    fontSize: 22,
    height: 54,
    maxWidth: 300,
    paddingHorizontal: 16,
    textAlign: "center",
    width: "78%",
  },
  actions: {
    flexDirection: "row",
    gap: 14,
    justifyContent: "center",
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: "#5A7258",
    borderRadius: 3,
    flex: 1,
    justifyContent: "center",
    maxWidth: 185,
    minHeight: 42,
    paddingHorizontal: 16,
  },
  actionButtonPrimary: {
    backgroundColor: "#5A7258",
  },
  actionButtonSubmit: {
    backgroundColor: "#5A7258",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionLabel: {
    color: "#fff7e8",
    fontFamily: fonts.family,
    fontSize: 28,
    lineHeight: 30,
    textTransform: "lowercase",
  },
  actionLabelSubmit: {
    color: "#fff7e8",
  },
  submitStatus: {
    color: "#5A7258",
    fontFamily: fonts.family,
    fontSize: 18,
    textAlign: "center",
  },
  submitStatusSuccess: {
    color: "#5A7258",
  },
  submitStatusError: {
    color: "#b91c1c",
  },
});
