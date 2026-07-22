import type { SavedSticker } from "@repo/shared";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSavedStickers } from "@/lib/api/hooks";
import { colors } from "@/lib/theme";

type StickerCollectionPickerProps = {
  visible: boolean;
  onClose: () => void;
  onPick: (sticker: SavedSticker) => void;
};

export function StickerCollectionPicker({
  visible,
  onClose,
  onPick,
}: StickerCollectionPickerProps) {
  const router = useRouter();
  const query = useSavedStickers();

  const stickers = (query.data?.stickers ?? []).filter(
    (s) => s.kind === "sticker" && s.stickerAsset && s.stickerAsset.status === "active",
  );

  const goCreate = () => {
    onClose();
    router.push("/studio" as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Your Stickers</Text>
              <Text style={styles.subtitle}>
                {query.data ? `${stickers.length} / ${query.data.capacity}` : ""}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={8}
              accessibilityLabel="Close sticker picker"
            >
              <X color={colors.sageDark} size={20} />
            </Pressable>
          </View>

          {query.isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.sageDark} />
            </View>
          ) : stickers.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No stickers yet</Text>
              <Text style={styles.emptyBody}>Make one in the Studio to pin it on a board.</Text>
              <Pressable onPress={goCreate} style={styles.cta}>
                <Text style={styles.ctaText}>Open Studio</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.grid}>
              {stickers.map((sticker) => {
                const asset = sticker.stickerAsset!;
                const uri = asset.pngBase64.startsWith("data:image")
                  ? asset.pngBase64
                  : `data:image/png;base64,${asset.pngBase64}`;
                return (
                  <Pressable
                    key={sticker.id}
                    onPress={() => onPick(sticker)}
                    style={styles.tile}
                    accessibilityLabel={sticker.label ?? "Saved sticker"}
                  >
                    <Image source={{ uri }} style={styles.tileImage} contentFit="contain" />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    alignSelf: "center",
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderRadius: 16,
    borderWidth: 3,
    maxHeight: "80%",
    maxWidth: 430,
    padding: 16,
    width: "100%",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: colors.sageDark,
    fontSize: 13,
    letterSpacing: 0.6,
    marginTop: 2,
    textTransform: "uppercase",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.pageBg,
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    alignItems: "center",
    backgroundColor: colors.pageBg,
    borderColor: colors.sageDark,
    borderRadius: 8,
    borderWidth: 2,
    height: 80,
    justifyContent: "center",
    padding: 6,
    width: 80,
  },
  tileImage: {
    height: "100%",
    width: "100%",
  },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 32,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
  },
  emptyBody: {
    color: colors.inkSoft,
    fontSize: 14,
    textAlign: "center",
  },
  cta: {
    backgroundColor: colors.sageDark,
    borderRadius: 12,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  ctaText: {
    color: colors.creamText,
    fontSize: 16,
    letterSpacing: 0.4,
  },
});
