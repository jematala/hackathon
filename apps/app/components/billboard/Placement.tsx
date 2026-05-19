import type { BillboardPlacement } from "@repo/shared";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getLocalRotation } from "@/lib/localPlacements";
import { colors, pinForAuthor } from "@/lib/theme";

import { STICKY_EDIT_SIZE } from "./EditingSticky";
import { FlowerPin } from "./FlowerPin";
import { StickyNoteView } from "./StickyNoteView";
import { UsernamePill } from "./UsernamePill";

const STICKY_SIZE = STICKY_EDIT_SIZE;
const STICKER_SIZE = 64;
const PIN_SIZE = 18;
const PIN_OVERLAP = 6;

type PlacementProps = {
  placement: BillboardPlacement;
  canvasWidth: number;
  canvasHeight: number;
  interactive?: boolean;
};

export function Placement({
  placement,
  canvasWidth,
  canvasHeight,
  interactive = true,
}: PlacementProps) {
  const [revealed, setRevealed] = useState(false);
  const isSticker = placement.kind === "sticker";
  const size = isSticker ? STICKER_SIZE : STICKY_SIZE;
  const left = placement.x * canvasWidth - size / 2;
  const top = placement.y * canvasHeight - size / 2;
  const pending = placement.status === "pending";
  const localRotation = getLocalRotation(placement.id);
  const pin = pinForAuthor(placement.authorId);

  const reveal = () => {
    setRevealed(true);
    setTimeout(() => setRevealed(false), 2000);
  };

  return (
    <View
      pointerEvents={interactive ? "box-none" : "none"}
      style={[
        styles.host,
        {
          left,
          top,
          width: size,
          height: size,
          zIndex: placement.zIndex,
          opacity: pending ? 0.55 : 1,
        },
      ]}
    >
      <Pressable onPress={reveal} disabled={!interactive}>
        {isSticker ? (
          renderSticker(placement)
        ) : (
          <StickyNoteView
            body={placement.body ?? ""}
            authorId={placement.authorId}
            size={STICKY_SIZE}
            rotationDeg={localRotation}
          />
        )}
      </Pressable>
      {!isSticker ? (
        <View pointerEvents="none" style={[styles.pin, { width: PIN_SIZE, height: PIN_SIZE }]}>
          <FlowerPin fill={pin.fill} accent={pin.accent} size={PIN_SIZE} />
        </View>
      ) : null}
      {revealed ? (
        <View style={styles.usernameOverlay} pointerEvents="none">
          <UsernamePill username={placement.authorUsername} tone="cream" />
        </View>
      ) : null}
      {pending ? (
        <View style={styles.pendingOverlay} pointerEvents="none">
          <Text style={styles.pendingText}>moderating…</Text>
        </View>
      ) : null}
    </View>
  );
}

function renderSticker(placement: BillboardPlacement) {
  const asset = placement.stickerAsset;
  if (!asset) {
    return (
      <View style={styles.stickerFallback}>
        <Text style={styles.stickerFallbackText}>?</Text>
      </View>
    );
  }
  const uri = asset.pngBase64.startsWith("data:image")
    ? asset.pngBase64
    : `data:image/png;base64,${asset.pngBase64}`;
  return <Image source={{ uri }} style={styles.sticker} contentFit="contain" />;
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
  },
  pin: {
    left: "50%",
    marginLeft: -PIN_SIZE / 2,
    position: "absolute",
    top: -PIN_OVERLAP,
  },
  sticker: {
    height: STICKER_SIZE,
    width: STICKER_SIZE,
  },
  stickerFallback: {
    alignItems: "center",
    backgroundColor: colors.paperGreen,
    borderColor: colors.paperEdge,
    borderRadius: 3,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
  },
  stickerFallbackText: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
  },
  usernameOverlay: {
    alignItems: "center",
    bottom: -22,
    left: 0,
    position: "absolute",
    right: 0,
  },
  pendingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(62, 53, 40, 0.7)",
    borderRadius: 3,
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
  },
  pendingText: {
    color: colors.creamText,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
