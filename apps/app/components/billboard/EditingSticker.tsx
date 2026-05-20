import type { StickerAsset } from "@repo/shared";
import { Image } from "expo-image";
import { RotateCw } from "lucide-react-native";
import { forwardRef, useImperativeHandle } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import { colors } from "@/lib/theme";

const STICKER_IMAGE_SIZE = 80;
const STICKER_CARD_PADDING = 8;
const STICKER_CARD_SIZE = STICKER_IMAGE_SIZE + STICKER_CARD_PADDING * 2;
const HANDLE_SIZE = 28;
const HANDLE_GAP = 22;
// Host needs slack on every side so the rotation handle stays inside the host
// regardless of which way the card is rotated; otherwise the handle's gesture
// region gets clipped.
const HOST_PAD = HANDLE_SIZE + HANDLE_GAP;
export const STICKER_EDIT_SIZE = STICKER_CARD_SIZE + HOST_PAD * 2;
const CARD_OFFSET = HOST_PAD;
const HANDLE_RADIUS = STICKER_CARD_SIZE / 2 + HANDLE_GAP + HANDLE_SIZE / 2;

export type EditingStickerHandle = {
  getState: () => { centerX: number; centerY: number; rotationDeg: number };
};

type EditingStickerProps = {
  asset: StickerAsset;
  canvasWidth: number;
  canvasHeight: number;
};

export const EditingSticker = forwardRef<EditingStickerHandle, EditingStickerProps>(
  function EditingSticker({ asset, canvasWidth, canvasHeight }, ref) {
    // Clamp the card's bounds, not the host's. The host has rotation-handle
    // slack on every side; clamping by host bounds would keep the card ~50px
    // away from every edge. We instead let the host (and the handle) extend
    // off-canvas — the cork's overflow:hidden hides that during editing, and
    // once pinned there is no handle so it doesn't matter.
    const minTx = -CARD_OFFSET;
    const maxTx = canvasWidth - STICKER_EDIT_SIZE + CARD_OFFSET;
    const minTy = -CARD_OFFSET;
    const maxTy = canvasHeight - STICKER_EDIT_SIZE + CARD_OFFSET;
    const tx = useSharedValue(canvasWidth / 2 - STICKER_EDIT_SIZE / 2);
    const ty = useSharedValue(canvasHeight / 2 - STICKER_EDIT_SIZE / 2);
    const rotation = useSharedValue(0);
    const startTx = useSharedValue(0);
    const startTy = useSharedValue(0);
    const startHandleX = useSharedValue(0);
    const startHandleY = useSharedValue(0);

    useImperativeHandle(
      ref,
      () => ({
        getState: () => ({
          centerX: tx.value + STICKER_EDIT_SIZE / 2,
          centerY: ty.value + STICKER_EDIT_SIZE / 2,
          rotationDeg: rotation.value,
        }),
      }),
      [tx, ty, rotation],
    );

    const pan = Gesture.Pan()
      .activeOffsetX([-4, 4])
      .activeOffsetY([-4, 4])
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .onStart(() => {
        "worklet";
        startTx.value = tx.value;
        startTy.value = ty.value;
      })
      .onUpdate((e) => {
        "worklet";
        tx.value = clampWorklet(startTx.value + e.translationX, minTx, maxTx);
        ty.value = clampWorklet(startTy.value + e.translationY, minTy, maxTy);
      });

    const rotate = Gesture.Pan()
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .onStart(() => {
        "worklet";
        const r = (rotation.value * Math.PI) / 180;
        // Handle's offset from card center at rotation = 0 is (0, +HANDLE_RADIUS).
        // After CSS rotation by r (clockwise positive), it sits at
        // (-sin(r) * R, cos(r) * R).
        startHandleX.value = -Math.sin(r) * HANDLE_RADIUS;
        startHandleY.value = Math.cos(r) * HANDLE_RADIUS;
      })
      .onUpdate((e) => {
        "worklet";
        const x = startHandleX.value + e.translationX;
        const y = startHandleY.value + e.translationY;
        // Inverse of the mapping above: r = atan2(-x, y) in radians.
        rotation.value = (Math.atan2(-x, y) * 180) / Math.PI;
      });

    const hostStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: tx.value }, { translateY: ty.value }],
    }));

    const innerStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const uri = asset.pngBase64.startsWith("data:image")
      ? asset.pngBase64
      : `data:image/png;base64,${asset.pngBase64}`;

    return (
      <Animated.View
        style={[styles.host, { width: STICKER_EDIT_SIZE, height: STICKER_EDIT_SIZE }, hostStyle]}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.inner, innerStyle]} pointerEvents="box-none">
          <GestureDetector gesture={pan}>
            <View style={styles.card}>
              <Image source={{ uri }} style={styles.image} contentFit="contain" />
            </View>
          </GestureDetector>
          <GestureDetector gesture={rotate}>
            <View style={styles.handle} accessibilityLabel="Rotate sticker">
              <RotateCw color={colors.sageDark} size={16} />
            </View>
          </GestureDetector>
        </Animated.View>
      </Animated.View>
    );
  },
);

function clampWorklet(value: number, min: number, max: number): number {
  "worklet";
  if (max <= min) return min;
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    zIndex: 9999,
  },
  inner: {
    height: STICKER_EDIT_SIZE,
    width: STICKER_EDIT_SIZE,
  },
  card: {
    alignItems: "center",
    backgroundColor: "#FAF6E8",
    borderRadius: 10,
    boxShadow: "0 3px 7px rgba(0, 0, 0, 0.3)",
    height: STICKER_CARD_SIZE,
    justifyContent: "center",
    left: CARD_OFFSET,
    padding: STICKER_CARD_PADDING,
    position: "absolute",
    top: CARD_OFFSET,
    width: STICKER_CARD_SIZE,
  },
  handle: {
    alignItems: "center",
    backgroundColor: "#FAF6E8",
    borderColor: colors.sageDark,
    borderRadius: HANDLE_SIZE / 2,
    borderWidth: 1.5,
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.25)",
    height: HANDLE_SIZE,
    justifyContent: "center",
    left: (STICKER_EDIT_SIZE - HANDLE_SIZE) / 2,
    position: "absolute",
    top: CARD_OFFSET + STICKER_CARD_SIZE + HANDLE_GAP,
    width: HANDLE_SIZE,
  },
  image: {
    height: STICKER_IMAGE_SIZE,
    width: STICKER_IMAGE_SIZE,
  },
});
