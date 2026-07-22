import type { BillboardPlacement, SavedSticker, StickerAsset } from "@repo/shared";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";

import { fonts } from "@/app/theme";
import { setLocalRotation } from "@/lib/localPlacements";
import { colors, expiresInLabel } from "@/lib/theme";

import { AnchorNote } from "./AnchorNote";
import { EditingSticker, type EditingStickerHandle } from "./EditingSticker";
import { EditingSticky, type EditingStickyHandle } from "./EditingSticky";
import { Placement } from "./Placement";
import { StickerCollectionPicker } from "./StickerCollectionPicker";
import { UsernamePill } from "./UsernamePill";

const CANVAS_HEIGHT = 540;
const ANCHOR_WIDTH = 210;
const ANCHOR_HEIGHT = 150;
const ANCHOR_TOP = 26;
const STICKY_MAX_CHARS = 280;

export type LocalBillboard = {
  id: string;
  authorId: string;
  authorUsername: string;
  body: string;
  lat: number;
  lng: number;
  expiresAt: string;
  placements: BillboardPlacement[];
};

type LocalBillboardPanelProps = {
  billboard: LocalBillboard;
  onAddPlacement: (placement: BillboardPlacement) => void;
  onClose: () => void;
};

type EditingState =
  | { kind: "sticky_note"; body: string }
  | { kind: "sticker"; asset: StickerAsset };

export function LocalBillboardPanel({
  billboard,
  onAddPlacement,
  onClose,
}: LocalBillboardPanelProps) {
  const stickyRef = useRef<EditingStickyHandle>(null);
  const stickerRef = useRef<EditingStickerHandle>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = editing !== null;

  const onCanvasLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const startNoteEdit = () => {
    if (canvasSize.width === 0) return;
    setEditing({ kind: "sticky_note", body: "" });
    setError(null);
  };

  const startStickerEdit = () => {
    if (canvasSize.width === 0) return;
    setError(null);
    setPickerOpen(true);
  };

  const onPickSticker = (saved: SavedSticker) => {
    if (!saved.stickerAsset) return;
    setPickerOpen(false);
    setEditing({ kind: "sticker", asset: saved.stickerAsset });
  };

  const cancelEdit = () => {
    setEditing(null);
    setError(null);
  };

  const place = () => {
    if (!editing) return;
    const { width, height } = canvasSize;
    if (width === 0 || height === 0) return;

    if (editing.kind === "sticky_note") {
      if (!stickyRef.current) return;
      if (editing.body.trim().length === 0) {
        setError("Write something on your note first.");
        return;
      }

      const { centerX, centerY, rotationDeg } = stickyRef.current.getState();
      const placementId = localUuid();
      const placement: BillboardPlacement = {
        id: placementId,
        billboardId: billboard.id,
        authorId: LOCAL_AUTHOR_ID,
        authorUsername: LOCAL_AUTHOR_USERNAME,
        kind: "sticky_note",
        x: clamp(centerX / width, 0, 1),
        y: clamp(centerY / height, 0, 1),
        zIndex: billboard.placements.length,
        stickerAsset: null,
        body: editing.body.trim(),
        status: "active",
        createdAt: new Date().toISOString(),
      };

      setLocalRotation(placementId, rotationDeg);
      onAddPlacement(placement);
      setEditing(null);
      setError(null);
      return;
    }

    if (!stickerRef.current) return;
    const { centerX, centerY, rotationDeg } = stickerRef.current.getState();
    const placementId = localUuid();
    const placement: BillboardPlacement = {
      id: placementId,
      billboardId: billboard.id,
      authorId: LOCAL_AUTHOR_ID,
      authorUsername: LOCAL_AUTHOR_USERNAME,
      kind: "sticker",
      x: clamp(centerX / width, 0, 1),
      y: clamp(centerY / height, 0, 1),
      zIndex: billboard.placements.length,
      stickerAsset: editing.asset,
      body: null,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    setLocalRotation(placementId, rotationDeg);
    onAddPlacement(placement);
    setEditing(null);
    setError(null);
  };

  return (
    <>
      <View style={styles.metaRow}>
        <UsernamePill username={billboard.authorUsername} tone="sage" />
        <View style={styles.metaRight}>
          <Text style={styles.meta}>
            {expiresInLabel(billboard.expiresAt)} - {billboard.placements.length}{" "}
            {billboard.placements.length === 1 ? "reply" : "replies"}
          </Text>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={8}
            accessibilityLabel="Close billboard"
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.frame}>
        <View style={styles.latchLeft} />
        <View style={styles.latchRight} />
        <View style={styles.cork} onLayout={onCanvasLayout}>
          {canvasSize.width > 0 ? (
            <View
              pointerEvents="none"
              style={[
                styles.anchorWrap,
                {
                  left: canvasSize.width / 2 - ANCHOR_WIDTH / 2,
                  top: ANCHOR_TOP,
                  width: ANCHOR_WIDTH,
                  height: ANCHOR_HEIGHT,
                },
              ]}
            >
              <AnchorNote
                body={billboard.body}
                authorId={billboard.authorId}
                authorUsername={billboard.authorUsername}
                width={ANCHOR_WIDTH}
                height={ANCHOR_HEIGHT}
              />
            </View>
          ) : null}

          {canvasSize.width > 0 &&
            billboard.placements
              .slice()
              .sort((a, c) => a.zIndex - c.zIndex)
              .map((placement) => (
                <Placement
                  key={placement.id}
                  placement={placement}
                  canvasWidth={canvasSize.width}
                  canvasHeight={canvasSize.height}
                  interactive={!isEditing}
                />
              ))}

          {editing?.kind === "sticky_note" && canvasSize.width > 0 ? (
            <EditingSticky
              ref={stickyRef}
              authorId={LOCAL_AUTHOR_ID}
              body={editing.body}
              onChangeBody={(t) => setEditing({ kind: "sticky_note", body: t })}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
              maxChars={STICKY_MAX_CHARS}
            />
          ) : null}

          {editing?.kind === "sticker" && canvasSize.width > 0 ? (
            <EditingSticker
              ref={stickerRef}
              asset={editing.asset}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
            />
          ) : null}
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isEditing ? (
        <View style={styles.actionBar}>
          <Pressable onPress={cancelEdit} style={styles.cancelButton} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={place} style={styles.placeButton}>
            <Text style={styles.placeText}>Pin it</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.addRow}>
          <Pressable onPress={startNoteEdit} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Note</Text>
          </Pressable>
          <Pressable onPress={startStickerEdit} style={[styles.addButton, styles.addButtonAlt]}>
            <Text style={[styles.addButtonText, styles.addButtonTextAlt]}>+ Sticker</Text>
          </Pressable>
        </View>
      )}

      <StickerCollectionPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onPickSticker}
      />
    </>
  );
}

export const LOCAL_AUTHOR_ID = "00000000-0000-4000-8000-000000000002";
export const LOCAL_AUTHOR_USERNAME = "bluewren";

export function localUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `00000000-0000-4000-8000-${Math.floor(Math.random() * 0xffffffffffff)
    .toString(16)
    .padStart(12, "0")}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  metaRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  meta: {
    color: colors.sageDark,
    fontSize: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.pageBgSoft,
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  closeText: {
    color: colors.sageDark,
    fontSize: 26,
    lineHeight: 26,
  },
  frame: {
    backgroundColor: colors.sage,
    borderColor: colors.sageDarker,
    borderRadius: 14,
    borderWidth: 3,
    boxShadow:
      "inset 0 2px 3px rgba(0, 0, 0, 0.4), inset 0 -4px 10px rgba(0, 0, 0, 0.22), inset 6px 0 12px rgba(0, 0, 0, 0.22), inset -6px 0 12px rgba(0, 0, 0, 0.22)",
    padding: 10,
    position: "relative",
  },
  latchLeft: {
    backgroundColor: colors.sageLight,
    borderColor: colors.sageDarker,
    borderRadius: 3,
    borderWidth: 1.5,
    height: 7,
    left: 28,
    position: "absolute",
    top: -4,
    width: 30,
    zIndex: 2,
  },
  latchRight: {
    backgroundColor: colors.sageLight,
    borderColor: colors.sageDarker,
    borderRadius: 3,
    borderWidth: 1.5,
    height: 7,
    position: "absolute",
    right: 28,
    top: -4,
    width: 30,
    zIndex: 2,
  },
  cork: {
    backgroundColor: colors.cork,
    borderColor: colors.corkEdge,
    borderRadius: 8,
    borderWidth: 2,
    boxShadow:
      "inset 0 6px 14px rgba(0, 0, 0, 0.35), inset 0 -3px 8px rgba(0, 0, 0, 0.18), inset 4px 0 10px rgba(0, 0, 0, 0.18), inset -4px 0 10px rgba(0, 0, 0, 0.18)",
    height: CANVAS_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  anchorWrap: {
    position: "absolute",
  },
  errorBanner: {
    backgroundColor: "#F6D7CE",
    borderColor: colors.pinRedDark,
    borderRadius: 10,
    borderWidth: 2,
    padding: 12,
  },
  errorText: {
    color: colors.pinRedDark,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  actionBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#fff8e8",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: "#2d2418",
    fontFamily: fonts.family,
    fontSize: 15,
    fontWeight: "800",
  },
  placeButton: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 26,
    paddingVertical: 12,
  },
  placeText: {
    color: colors.creamText,
    fontSize: 18,
    letterSpacing: 0.6,
  },
  addRow: {
    flexDirection: "row",
    gap: 10,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderRadius: 14,
    flex: 1,
    paddingVertical: 14,
  },
  addButtonAlt: {
    backgroundColor: colors.pageBgSoft,
  },
  addButtonText: {
    color: colors.creamText,
    fontSize: 18,
    letterSpacing: 0.6,
  },
  addButtonTextAlt: {
    color: colors.sageDark,
  },
});
