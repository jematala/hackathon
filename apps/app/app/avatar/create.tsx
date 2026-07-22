import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ImageUp, Palette } from "lucide-react-native";

import { CreateStickerPanel } from "@/components/CreateStickerPanel";
import { Screen } from "@/components/Screen";
import { colors, fonts, pixelBorder } from "@/app/theme";
import { ApiError } from "@/lib/api/client";
import { useUpdateAvatar } from "@/lib/api/hooks";
import { setAvatarUri } from "@/lib/userProfile";

type Mode = "draw" | "upload";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB before resize
const AVATAR_SIZE = 64;
const PNG_DATA_URL_PREFIX = "data:image/png;base64,";

function normalizeAvatarPng(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = document.createElement("img");
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const context = canvas.getContext("2d");
      if (!context || image.naturalWidth < 1 || image.naturalHeight < 1) {
        reject(new Error("Could not process image."));
        return;
      }

      const scale = Math.max(AVATAR_SIZE / image.naturalWidth, AVATAR_SIZE / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      context.imageSmoothingEnabled = false;
      context.drawImage(
        image,
        (AVATAR_SIZE - width) / 2,
        (AVATAR_SIZE - height) / 2,
        width,
        height,
      );
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Could not decode PNG image."));
    image.src = dataUrl;
  });
}

export default function CreateAvatarScreen() {
  const [mode, setMode] = useState<Mode>("draw");
  const [uploadDataUrl, setUploadDataUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadTone, setUploadTone] = useState<"info" | "error" | "success">("info");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const updateAvatar = useUpdateAvatar();

  const saveAvatar = useCallback(
    async (avatarBase64: string, dataUrl: string) => {
      try {
        await updateAvatar.mutateAsync({ avatarBase64 });
        setAvatarUri(dataUrl);
      } catch (err) {
        if (err instanceof ApiError) {
          throw new Error(err.message);
        }
        throw err;
      }

      setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/(app)/profile" as any);
      }, 350);
    },
    [updateAvatar],
  );

  const handleAvatarDrawn = useCallback(
    ({ dataUrl, base64 }: { dataUrl: string; base64: string }) => saveAvatar(base64, dataUrl),
    [saveAvatar],
  );

  const openFilePicker = useCallback(() => {
    if (typeof document === "undefined") {
      setUploadTone("error");
      setUploadStatus("Image upload is only available on web for now.");
      return;
    }
    if (!fileInputRef.current) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png";
      input.style.display = "none";
      input.addEventListener("change", handleFileChange as unknown as EventListener);
      document.body.appendChild(input);
      fileInputRef.current = input;
    }
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  }, []);

  const handleFileChange = useCallback((e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadTone("error");
      setUploadStatus("Image is over 2MB — pick a smaller file.");
      return;
    }
    setUploadTone("info");
    setUploadStatus("Reading image…");
    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        setUploadTone("error");
        setUploadStatus("Could not read image.");
        return;
      }
      if (!result.startsWith(PNG_DATA_URL_PREFIX)) {
        setUploadTone("error");
        setUploadStatus("Pick a PNG image.");
        return;
      }
      try {
        const normalized = await normalizeAvatarPng(result);
        setUploadDataUrl(normalized);
        setUploadTone("success");
        setUploadStatus(`Loaded and resized ${file.name}`);
      } catch (error) {
        setUploadTone("error");
        setUploadStatus(error instanceof Error ? error.message : "Could not process image.");
      }
    };
    reader.onerror = () => {
      setUploadTone("error");
      setUploadStatus("Could not read image.");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUseUploaded = useCallback(async () => {
    if (!uploadDataUrl) return;
    setUploadTone("info");
    setUploadStatus("Saving avatar...");
    try {
      await saveAvatar(uploadDataUrl.slice(PNG_DATA_URL_PREFIX.length), uploadDataUrl);
      setUploadTone("success");
      setUploadStatus("Avatar saved!");
    } catch (err) {
      setUploadTone("error");
      setUploadStatus(err instanceof Error ? err.message : "Could not save avatar.");
    }
  }, [saveAvatar, uploadDataUrl]);

  return (
    <Screen>
      <Pressable
        accessibilityLabel="Back"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/(app)/profile" as any);
        }}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <ChevronLeft color={colors.primaryDark} size={18} />
        <Text style={styles.backLabel}>back</Text>
      </Pressable>

      <Text style={styles.title}>Edit Avatar</Text>
      <Text style={styles.subtitle}>
        Draw a portrait in the pixel editor, or upload your own image.
      </Text>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setMode("draw")}
          style={[styles.tab, mode === "draw" && styles.tabActive]}
        >
          <Palette color={mode === "draw" ? colors.white : colors.primaryDark} size={16} />
          <Text style={[styles.tabLabel, mode === "draw" && styles.tabLabelActive]}>draw</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("upload")}
          style={[styles.tab, mode === "upload" && styles.tabActive]}
        >
          <ImageUp color={mode === "upload" ? colors.white : colors.primaryDark} size={16} />
          <Text style={[styles.tabLabel, mode === "upload" && styles.tabLabelActive]}>upload</Text>
        </Pressable>
      </View>

      {mode === "draw" ? (
        <CreateStickerPanel variant="avatar" onAvatarSaved={handleAvatarDrawn} />
      ) : (
        <View style={styles.uploadCard}>
          <View style={styles.previewWrap}>
            {uploadDataUrl ? (
              <Image source={{ uri: uploadDataUrl }} style={styles.preview} />
            ) : (
              <View style={styles.previewEmpty}>
                <ImageUp color={colors.textLight} size={42} />
                <Text style={styles.previewHint}>no image selected</Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={openFilePicker}
            style={({ pressed }) => [styles.pickBtn, pressed && styles.pressed]}
          >
            <Text style={styles.pickBtnLabel}>
              {uploadDataUrl ? "choose a different image" : "choose an image"}
            </Text>
          </Pressable>

          <Text style={styles.uploadHint}>stored as a base64 png on your profile. max 2MB.</Text>

          {uploadStatus ? (
            <Text
              style={[
                styles.status,
                uploadTone === "success" && styles.statusSuccess,
                uploadTone === "error" && styles.statusError,
              ]}
            >
              {uploadStatus}
            </Text>
          ) : null}

          <Pressable
            disabled={!uploadDataUrl || updateAvatar.isPending}
            onPress={handleUseUploaded}
            style={({ pressed }) => [
              styles.saveBtn,
              (!uploadDataUrl || updateAvatar.isPending) && styles.saveBtnDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.saveBtnLabel}>
              {updateAvatar.isPending ? "saving..." : "set as avatar"}
            </Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 2,
  },
  backLabel: {
    color: colors.primaryDark,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 32,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 16,
    marginTop: -8,
  },
  tabs: {
    backgroundColor: colors.card,
    borderColor: colors.borderDark,
    borderWidth: 2,
    flexDirection: "row",
    padding: 4,
  },
  tab: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    color: colors.primaryDark,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  tabLabelActive: {
    color: colors.white,
  },
  uploadCard: {
    backgroundColor: colors.parchment,
    borderColor: colors.borderDark,
    borderWidth: 2,
    gap: 14,
    padding: 16,
  },
  previewWrap: {
    alignItems: "center",
    alignSelf: "center",
  },
  preview: {
    backgroundColor: colors.card,
    borderColor: colors.text,
    borderWidth: 3,
    height: 200,
    width: 200,
  },
  previewEmpty: {
    alignItems: "center",
    backgroundColor: colors.card,
    ...pixelBorder,
    borderStyle: "dashed",
    gap: 8,
    height: 200,
    justifyContent: "center",
    width: 200,
  },
  previewHint: {
    color: colors.textLight,
    fontFamily: fonts.family,
    fontSize: 16,
  },
  pickBtn: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.card,
    borderColor: colors.primaryDark,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pickBtnLabel: {
    color: colors.primaryDark,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  uploadHint: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 14,
    textAlign: "center",
  },
  status: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 14,
    textAlign: "center",
  },
  statusSuccess: {
    color: colors.primaryDark,
  },
  statusError: {
    color: colors.danger,
  },
  saveBtn: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    borderWidth: 2,
    paddingVertical: 12,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnLabel: {
    color: colors.white,
    fontFamily: fonts.family,
    fontSize: 20,
  },
  pressed: { opacity: 0.75 },
});
