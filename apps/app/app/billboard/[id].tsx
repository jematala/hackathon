import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { AnchorNote } from "@/components/billboard/AnchorNote";
import { EditingSticky, type EditingStickyHandle } from "@/components/billboard/EditingSticky";
import { Placement } from "@/components/billboard/Placement";
import { UsernamePill } from "@/components/billboard/UsernamePill";
import { Screen } from "@/components/Screen";
import { ApiError } from "@/lib/api/client";
import { useBillboard, useCreatePlacement } from "@/lib/api/hooks";
import { useDevUser } from "@/lib/devUser";
import { setLocalRotation } from "@/lib/localPlacements";
import { colors, expiresInLabel } from "@/lib/theme";

const CANVAS_HEIGHT = 540;
const ANCHOR_WIDTH = 210;
const ANCHOR_HEIGHT = 150;
const ANCHOR_TOP = 26;
const STICKY_MAX_CHARS = 280;

export default function BillboardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };
  const renderBackButton = () => (
    <Pressable onPress={goBack} style={styles.backButton} hitSlop={8} accessibilityLabel="Go back">
      <ChevronLeft color={colors.sageDark} size={22} />
    </Pressable>
  );
  const { user } = useDevUser();
  const billboard = useBillboard(id);
  const createPlacement = useCreatePlacement(id ?? "");
  const editingRef = useRef<EditingStickyHandle>(null);

  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [editing, setEditing] = useState<{ body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditing = editing !== null;

  const onCanvasLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const cancelEdit = () => {
    setEditing(null);
    setError(null);
  };

  const startEdit = () => {
    if (canvasSize.width === 0) return;
    setEditing({ body: "" });
    setError(null);
  };

  const place = () => {
    if (!editing || !editingRef.current) return;
    if (editing.body.trim().length === 0) {
      setError("Write something on your note first.");
      return;
    }
    const { centerX, centerY, rotationDeg } = editingRef.current.getState();
    const { width, height } = canvasSize;
    if (width === 0 || height === 0) return;
    const x = clamp(centerX / width, 0, 1);
    const y = clamp(centerY / height, 0, 1);
    setError(null);
    createPlacement.mutate(
      { kind: "sticky_note", body: editing.body.trim(), x, y },
      {
        onSuccess: (data) => {
          setLocalRotation(data.placement.id, rotationDeg);
          setEditing(null);
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            if (err.code === "placement_exists") {
              setError("You've already pinned a note here.");
            } else if (err.code === "moderation_rejected") {
              setError("Your note was rejected by moderation.");
            } else if (err.code === "moderation_unavailable") {
              setError("Moderation isn't available right now — can't pin this note.");
            } else {
              setError(err.message);
            }
          } else if (err instanceof Error) {
            console.error("[placement] unexpected error", err);
            setError(`Couldn't pin note: ${err.message}`);
          } else {
            setError("Couldn't pin note. Try again.");
          }
        },
      },
    );
  };

  if (billboard.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Whiteboard", headerLeft: renderBackButton }} />
        <View style={styles.loading}>
          <ActivityIndicator color={colors.sageDark} />
        </View>
      </Screen>
    );
  }

  if (billboard.isError || !billboard.data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Whiteboard", headerLeft: renderBackButton }} />
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Whiteboard not found</Text>
          <Text style={styles.emptyBody}>
            {(billboard.error as Error | undefined)?.message ?? "It may have expired."}
          </Text>
        </View>
      </Screen>
    );
  }

  const b = billboard.data;

  return (
    <Screen>
      <Stack.Screen options={{ title: "Whiteboard", headerLeft: renderBackButton }} />

      <View style={styles.metaRow}>
        <UsernamePill username={b.authorUsername} tone="sage" />
        <Text style={styles.meta}>
          {expiresInLabel(b.expiresAt)} · {b.placementCount}{" "}
          {b.placementCount === 1 ? "reply" : "replies"}
        </Text>
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
                body={b.body}
                authorId={b.authorId}
                authorUsername={b.authorUsername}
                width={ANCHOR_WIDTH}
                height={ANCHOR_HEIGHT}
              />
            </View>
          ) : null}

          {canvasSize.width > 0 &&
            b.placements
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

          {isEditing && canvasSize.width > 0 ? (
            <EditingSticky
              ref={editingRef}
              authorId={user.id}
              body={editing.body}
              onChangeBody={(t) => setEditing({ body: t })}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
              maxChars={STICKY_MAX_CHARS}
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
          <Pressable
            onPress={place}
            disabled={createPlacement.isPending}
            style={[
              styles.placeButton,
              createPlacement.isPending ? styles.placeButtonDisabled : null,
            ]}
          >
            <Text style={styles.placeText}>Pin it</Text>
            {createPlacement.isPending ? (
              <ActivityIndicator
                color={colors.creamText}
                size="small"
                style={styles.placeSpinner}
              />
            ) : null}
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={startEdit} style={styles.addButton}>
          <Text style={styles.addButtonText}>+  Add a note</Text>
        </Pressable>
      )}
    </Screen>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  backButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  empty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 80,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 24,
    letterSpacing: 0.2,
  },
  emptyBody: {
    color: colors.inkSoft,
    fontSize: 16,
    lineHeight: 21,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  meta: {
    color: colors.sageDark,
    fontSize: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  frame: {
    backgroundColor: colors.sage,
    borderColor: colors.sageDarker,
    borderRadius: 14,
    borderWidth: 3,
    boxShadow:
      "inset 0 8px 18px rgba(0, 0, 0, 0.4), inset 0 -4px 10px rgba(0, 0, 0, 0.22), inset 6px 0 12px rgba(0, 0, 0, 0.22), inset -6px 0 12px rgba(0, 0, 0, 0.22)",
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
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelText: {
    color: colors.inkSoft,
    fontSize: 18,
    letterSpacing: 0.6,
  },
  placeButton: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDarker,
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 26,
    paddingVertical: 12,
  },
  placeButtonDisabled: {
    opacity: 0.7,
  },
  placeText: {
    color: colors.creamText,
    fontSize: 18,
    letterSpacing: 0.6,
  },
  placeSpinner: {
    transform: [{ scale: 0.8 }],
  },
  addButton: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDarker,
    borderRadius: 14,
    borderWidth: 2,
    paddingVertical: 14,
  },
  addButtonText: {
    color: colors.creamText,
    fontSize: 18,
    letterSpacing: 0.6,
  },
});
