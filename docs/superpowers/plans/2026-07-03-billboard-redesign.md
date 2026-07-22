# Billboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the billboard UI to the new mockup — tan board with a dark-sage title tab and corner X, WYSIWYG create-on-the-note flow, "add note"/"add sticker" buttons, and a bottom-docked "Your Stickers" tray with a "create sticker" shortcut.

**Architecture:** A new shared `BoardShell` component (title tab + tan board + corner X) is used by both the create modal in `map.tsx` and the view panel `BillboardPanel`. All data flow, hooks, and placement editing stay exactly as they are — this is a restyle plus one new presentational component.

**Tech Stack:** Expo Router 6, React Native 0.81 + RN Web, `StyleSheet.create()`, `lucide-react-native`, TanStack Query hooks, theme tokens in `apps/app/lib/theme.ts`.

**Spec:** `docs/superpowers/specs/2026-07-03-billboard-redesign-design.md`

## Global Constraints

- No API, hook, DB, or shared-contract changes.
- No changes to `Placement`, `EditingSticky`, `EditingSticker`, `AnchorNote`, or `LocalBillboardPanel`.
- Existing behaviours stay wired: "add note" → existing sticky edit flow; "add sticker" → tray; tray tile tap → existing pick → drag → pin flow; billboard create keeps `useCreateBillboard` with the 500-char limit.
- Board/chrome colours come from `apps/app/lib/theme.ts` tokens (`sage*`, `pageBg*`, `ink*`, `creamText`, `paperBlue`, `paperEdge`, `pinRedDark`). Exactly one new token is added: `boardTan`.
- Button/tab copy is lowercase per the mockup: "create billboard", "create", "creating...", "add note", "add sticker", "create sticker". Tray title stays "Your Stickers".
- Text styles in billboard components do NOT set `fontFamily` — the app installs the Jersey 10 font globally (see `lib/installGlobalFont.ts`); match the existing billboard styles.
- **Testing note:** `apps/app` has no unit-test runner. Each task verifies with `bun --cwd apps/app run typecheck`; the final task runs `bun run check` and a manual web walkthrough. Run `bun run format` before committing if `format:check` complains.

---

### Task 1: `BoardShell` component + `boardTan` token

**Files:**
- Modify: `apps/app/lib/theme.ts` (add one token)
- Create: `apps/app/components/billboard/BoardShell.tsx`

**Interfaces:**
- Consumes: `colors` from `@/lib/theme`, `X` from `lucide-react-native`.
- Produces: `BoardShell` with props `{ title: string; onClose?: () => void; boardHeight?: number; onBoardLayout?: (e: LayoutChangeEvent) => void; children?: ReactNode }`. Children render inside a clipped inner view (`overflow: "hidden"`), so absolutely-positioned placements behave like they did inside the old cork view. `onBoardLayout` reports the inner content area's layout — Tasks 2 and 3 rely on these exact prop names.

- [ ] **Step 1: Add the `boardTan` token to `apps/app/lib/theme.ts`**

In the `colors` object, after the `corkShadow` line, add:

```ts
  // Redesigned billboard board fill (tan/peach, flatter than cork)
  boardTan: "#E9C6A0",
```

- [ ] **Step 2: Create `apps/app/components/billboard/BoardShell.tsx`**

```tsx
import type { PropsWithChildren } from "react";
import { X } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";

import { colors } from "@/lib/theme";

type BoardShellProps = PropsWithChildren<{
  title: string;
  onClose?: () => void;
  boardHeight?: number;
  onBoardLayout?: (e: LayoutChangeEvent) => void;
}>;

export function BoardShell({
  title,
  onClose,
  boardHeight,
  onBoardLayout,
  children,
}: BoardShellProps) {
  return (
    <View>
      <View style={styles.titleTab}>
        <Text style={styles.titleText}>{title}</Text>
      </View>
      <View style={[styles.board, boardHeight != null ? { height: boardHeight } : null]}>
        <View style={styles.boardInner} onLayout={onBoardLayout}>
          {children}
        </View>
        {onClose ? (
          <Pressable
            accessibilityLabel="Close board"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <X color={colors.creamText} size={16} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleTab: {
    alignSelf: "flex-start",
    backgroundColor: colors.sageDarker,
    borderRadius: 4,
    marginBottom: -8,
    marginLeft: 16,
    paddingHorizontal: 16,
    paddingVertical: 7,
    zIndex: 2,
  },
  titleText: {
    color: colors.creamText,
    fontSize: 22,
    letterSpacing: 0.4,
  },
  board: {
    backgroundColor: colors.boardTan,
    borderColor: colors.sageDarker,
    borderRadius: 12,
    borderWidth: 3,
  },
  boardInner: {
    borderRadius: 9,
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  close: {
    alignItems: "center",
    backgroundColor: colors.sageDarker,
    borderRadius: 6,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    top: 6,
    width: 26,
    zIndex: 20,
  },
  pressed: {
    opacity: 0.8,
  },
});
```

- [ ] **Step 3: Typecheck**

Run: `bun --cwd apps/app run typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/app/components/billboard/BoardShell.tsx apps/app/lib/theme.ts
git commit -m "feat(app): add BoardShell billboard frame component"
```

---

### Task 2: Restyle `BillboardPanel` with `BoardShell`

**Files:**
- Modify: `apps/app/components/billboard/BillboardPanel.tsx` (full rewrite)

**Interfaces:**
- Consumes: `BoardShell` from Task 1 (`title`, `onClose`, `boardHeight`, `onBoardLayout`, children). Existing: `useBillboard`, `useCreatePlacement`, `useCurrentUser`, `setLocalRotation`, `expiresInLabel`, `AnchorNote`, `Placement`, `EditingSticky`/`EditingStickyHandle`, `EditingSticker`/`EditingStickerHandle`, `StickerCollectionPicker` (unchanged prop contract: `visible`, `onClose`, `onPick`).
- Produces: `BillboardPanel` with the **unchanged** prop type `{ id: string | undefined; onClose?: () => void }` — `map.tsx` and `/billboard/[id]` rely on it.

- [ ] **Step 1: Rewrite `apps/app/components/billboard/BillboardPanel.tsx`**

Replace the entire file with:

```tsx
import type { SavedSticker, StickerAsset } from "@repo/shared";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { ApiError } from "@/lib/api/client";
import { useBillboard, useCreatePlacement, useCurrentUser } from "@/lib/api/hooks";
import { setLocalRotation } from "@/lib/localPlacements";
import { colors, expiresInLabel } from "@/lib/theme";

import { AnchorNote } from "./AnchorNote";
import { BoardShell } from "./BoardShell";
import { EditingSticker, type EditingStickerHandle } from "./EditingSticker";
import { EditingSticky, type EditingStickyHandle } from "./EditingSticky";
import { Placement } from "./Placement";
import { StickerCollectionPicker } from "./StickerCollectionPicker";

const CANVAS_HEIGHT = 540;
const ANCHOR_WIDTH = 210;
const ANCHOR_HEIGHT = 150;
const ANCHOR_TOP = 26;
const STICKY_MAX_CHARS = 280;

type BillboardPanelProps = {
  id: string | undefined;
  onClose?: () => void;
};

type EditingState =
  | { kind: "sticky_note"; body: string }
  | { kind: "sticker"; asset: StickerAsset };

export function BillboardPanel({ id, onClose }: BillboardPanelProps) {
  const billboard = useBillboard(id);
  const currentUser = useCurrentUser();
  const createPlacement = useCreatePlacement(id ?? "");
  const stickyRef = useRef<EditingStickyHandle>(null);
  const stickerRef = useRef<EditingStickerHandle>(null);

  const [canvasSize, setCanvasSize] = useState<{
    width: number;
    height: number;
  }>({
    width: 0,
    height: 0,
  });
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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

  const handlePlacementError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      if (err.code === "placement_exists") {
        setError("You've already pinned something here.");
      } else if (err.code === "moderation_rejected") {
        setError("Your post was rejected by moderation.");
      } else if (err.code === "moderation_unavailable") {
        setError("Moderation isn't available right now - can't pin this.");
      } else {
        setError(err.message);
      }
    } else if (err instanceof Error) {
      console.error("[placement] unexpected error", err);
      setError(`${fallback}: ${err.message}`);
    } else {
      setError(`${fallback}. Try again.`);
    }
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
          onError: (err) => handlePlacementError(err, "Couldn't pin note"),
        },
      );
      return;
    }

    if (!stickerRef.current) return;
    const { centerX, centerY, rotationDeg } = stickerRef.current.getState();
    const x = clamp(centerX / width, 0, 1);
    const y = clamp(centerY / height, 0, 1);
    setError(null);
    createPlacement.mutate(
      { kind: "sticker", stickerAssetId: editing.asset.id, x, y },
      {
        onSuccess: (data) => {
          setLocalRotation(data.placement.id, rotationDeg);
          setEditing(null);
        },
        onError: (err) => handlePlacementError(err, "Couldn't pin sticker"),
      },
    );
  };

  if (billboard.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.sageDark} />
      </View>
    );
  }

  if (billboard.isError || !billboard.data) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Billboard not found</Text>
        <Text style={styles.emptyBody}>
          {(billboard.error as Error | undefined)?.message ?? "It may have expired."}
        </Text>
      </View>
    );
  }

  const b = billboard.data;

  return (
    <>
      <BoardShell
        title={`${b.authorUsername}'s billboard`}
        onClose={onClose}
        boardHeight={CANVAS_HEIGHT}
        onBoardLayout={onCanvasLayout}
      >
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

        {editing?.kind === "sticky_note" && canvasSize.width > 0 ? (
          <EditingSticky
            ref={stickyRef}
            authorId={currentUser.data?.id ?? ""}
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
      </BoardShell>

      <Text style={styles.meta}>
        {expiresInLabel(b.expiresAt)} - {b.placementCount}{" "}
        {b.placementCount === 1 ? "reply" : "replies"}
      </Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isEditing ? (
        <View style={styles.actionBar}>
          <Pressable onPress={cancelEdit} style={styles.cancelButton} hitSlop={8}>
            <Text style={styles.cancelText}>cancel</Text>
          </Pressable>
          <Pressable
            onPress={place}
            disabled={createPlacement.isPending}
            style={[
              styles.placeButton,
              createPlacement.isPending ? styles.placeButtonDisabled : null,
            ]}
          >
            <Text style={styles.placeText}>pin it</Text>
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
        <View style={styles.addRow}>
          <Pressable onPress={startNoteEdit} style={styles.addButton}>
            <Text style={styles.addButtonText}>add note</Text>
          </Pressable>
          <Pressable onPress={startStickerEdit} style={styles.addButton}>
            <Text style={styles.addButtonText}>add sticker</Text>
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
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
  meta: {
    color: colors.inkSoft,
    fontSize: 14,
    letterSpacing: 0.6,
    marginTop: -8,
    paddingLeft: 4,
    textTransform: "uppercase",
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
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: colors.sageDark,
    fontSize: 18,
    letterSpacing: 0.4,
  },
  placeButton: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDarker,
    borderRadius: 8,
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
  addRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-start",
  },
  addButton: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDarker,
    borderRadius: 6,
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  addButtonText: {
    color: colors.creamText,
    fontSize: 18,
    letterSpacing: 0.6,
  },
});
```

What changed vs. the old file (review context, not action): meta row + `UsernamePill` + sage frame/latches/cork replaced by `BoardShell`; expiry/replies became a muted line under the board; add buttons are lowercase left-aligned sage tabs; cancel/pin-it restyled to the sage/cream language; all logic, hooks, and editing flows untouched. `fonts` and `UsernamePill` imports removed (no longer used).

- [ ] **Step 2: Typecheck**

Run: `bun --cwd apps/app run typecheck`
Expected: exits 0. (`UsernamePill.tsx` itself stays in the repo — it is still used elsewhere or harmlessly unused; do not delete it.)

- [ ] **Step 3: Commit**

```bash
git add apps/app/components/billboard/BillboardPanel.tsx
git commit -m "feat(app): restyle billboard view panel with BoardShell"
```

---

### Task 3: Create-billboard board + view-modal wrapper in `map.tsx`

**Files:**
- Modify: `apps/app/app/(app)/map.tsx`

**Interfaces:**
- Consumes: `BoardShell` from Task 1 (`title`, `onClose`, `boardHeight`, children); existing `useCreateBillboard`, `BillboardPanel { id, onClose }`.
- Produces: nothing consumed later. All state names (`createOpen`, `body`, `createError`, `activeBillboardId`) stay the same.

- [ ] **Step 1: Update imports and add a constant**

In `apps/app/app/(app)/map.tsx`, add to the imports:

```tsx
import { BoardShell } from "@/components/billboard/BoardShell";
```

Below the imports (next to the other top-level constants), add:

```tsx
const CREATE_BOARD_HEIGHT = 420;

const WEB_NO_OUTLINE = { outlineStyle: "none" } as unknown as { outlineStyle: undefined };
```

- [ ] **Step 2: Replace the create modal JSX**

Replace the whole `<Modal visible={createOpen} ...>...</Modal>` block with:

```tsx
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={closeCreate}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closeCreate} />
          <View style={styles.createWrap}>
            <BoardShell
              title="create billboard"
              onClose={closeCreate}
              boardHeight={CREATE_BOARD_HEIGHT}
            >
              <View style={styles.noteWrap}>
                <TextInput
                  value={body}
                  onChangeText={setBody}
                  multiline
                  maxLength={500}
                  placeholder="write something for people nearby..."
                  placeholderTextColor={colors.inkSofter}
                  selectionColor={colors.sageDark}
                  style={[styles.noteInput, WEB_NO_OUTLINE]}
                />
              </View>
            </BoardShell>
            <View style={styles.createFooter}>
              <Text style={styles.charCount}>{body.length}/500</Text>
              {createError ? <Text style={styles.createError}>{createError}</Text> : null}
            </View>
            <Pressable
              disabled={createBillboard.isPending}
              onPress={submitBillboard}
              style={[styles.submitButton, createBillboard.isPending ? styles.disabled : null]}
            >
              <Text style={styles.submitText}>
                {createBillboard.isPending ? "creating..." : "create"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
```

- [ ] **Step 3: Update the styles**

In the `StyleSheet.create` block of `map.tsx`:

Replace `modalPanel` (the cream card around the view panel) with:

```tsx
  modalPanel: {
    gap: 18,
    maxWidth: 560,
    width: "100%",
  },
```

Delete these now-unused styles: `createPanel`, `createHeader`, `createTitle`, `closeButton`, `closeText`, `createInput`.

Add these styles:

```tsx
  createWrap: {
    alignSelf: "center",
    gap: 12,
    maxWidth: 460,
    width: "90%",
  },
  noteWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  noteInput: {
    backgroundColor: colors.paperBlue,
    borderColor: colors.paperEdge,
    borderRadius: 3,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 19,
    height: 170,
    lineHeight: 22,
    padding: 16,
    textAlignVertical: "top",
    transform: [{ rotate: "-2deg" }],
    width: 220,
  },
```

Replace `submitButton` with:

```tsx
  submitButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDarker,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 34,
  },
```

Keep `charCount`, `createError`, `createFooter`, `disabled`, `submitText`, `modalRoot`, `backdrop`, `modalScroll`, `modalScrollContent`, `mapStatus`, `root` unchanged.

- [ ] **Step 4: Typecheck**

Run: `bun --cwd apps/app run typecheck`
Expected: exits 0 with no unused-style or missing-symbol errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/app/app/(app)/map.tsx"
git commit -m "feat(app): board-style create billboard modal and frameless view wrapper"
```

---

### Task 4: Bottom-docked sticker tray

**Files:**
- Modify: `apps/app/components/billboard/StickerCollectionPicker.tsx` (full rewrite)

**Interfaces:**
- Consumes: `useSavedStickers`, `colors` from `@/lib/theme`, `expo-router` router.
- Produces: `StickerCollectionPicker` with the **unchanged** prop type `{ visible: boolean; onClose: () => void; onPick: (sticker: SavedSticker) => void }` — `BillboardPanel` relies on it.

- [ ] **Step 1: Rewrite `apps/app/components/billboard/StickerCollectionPicker.tsx`**

Replace the entire file with:

```tsx
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Close sticker tray"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Stickers</Text>
            <View style={styles.headerActions}>
              <Pressable onPress={goCreate} style={styles.createButton}>
                <Text style={styles.createButtonText}>create sticker</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={8}
                accessibilityLabel="Close sticker picker"
              >
                <X color={colors.creamText} size={14} />
              </Pressable>
            </View>
          </View>

          {query.data ? (
            <Text style={styles.subtitle}>
              {stickers.length} / {query.data.capacity}
            </Text>
          ) : null}

          {query.isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.sageDark} />
            </View>
          ) : stickers.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No stickers yet</Text>
              <Text style={styles.emptyBody}>Make one in the Studio to pin it on a board.</Text>
              <Pressable onPress={goCreate} style={styles.cta}>
                <Text style={styles.ctaText}>create sticker</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    alignSelf: "center",
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderRadius: 16,
    borderWidth: 3,
    gap: 10,
    marginBottom: 10,
    maxHeight: "45%",
    maxWidth: 560,
    padding: 14,
    width: "96%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: colors.sageDark,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  createButton: {
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDarker,
    borderRadius: 6,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  createButtonText: {
    color: colors.creamText,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.sageDarker,
    borderRadius: 6,
    height: 26,
    justifyContent: "center",
    width: 26,
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
    borderColor: colors.sageDarker,
    borderRadius: 12,
    borderWidth: 2,
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
```

What changed (review context): centered modal → bottom-docked tray (`justifyContent: "flex-end"`, slide animation, press-outside-to-close backdrop); header gains the "create sticker" button; capacity count moved to its own line; grid, tile behaviour, and empty state logic unchanged (empty-state CTA relabelled "create sticker").

- [ ] **Step 2: Typecheck**

Run: `bun --cwd apps/app run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/app/components/billboard/StickerCollectionPicker.tsx
git commit -m "feat(app): bottom-docked sticker tray with create shortcut"
```

---

### Task 5: Full check + manual verification

**Files:**
- No planned modifications (fixes only if checks or the walkthrough fail).

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: verified, formatted, committed branch state.

- [ ] **Step 1: Run the repo-wide check**

Run: `bun run check`
Expected: oxlint, oxfmt `--check`, and all four typechecks pass.
If `format:check` fails: run `bun run format`, re-run `bun run check`, and commit the formatted files as `style: auto-format`.

- [ ] **Step 2: Manual web walkthrough**

Run: `bun run dev:app` and open the web build. Verify:

1. Map → create-billboard button → board appears over the dimmed map with the "create billboard" title tab and corner X; the light-blue note sits centered on the board and you type directly onto it; "create" pins it and opens the new billboard.
2. Tap a billboard marker → "{username}'s billboard" title tab, tan board (no cream card behind it), X on the board corner, expiry/replies as a small muted line under the board.
3. "add note" → existing drag-note flow works end-to-end (write, drag, "pin it").
4. "add sticker" → tray slides up from the bottom: "Your Stickers" + capacity count, "create sticker" button top-right, X close, sticker grid. Tapping a sticker starts the existing drag-to-place flow; "create sticker" navigates to `/studio`; tapping outside the tray closes it.
5. Empty sticker collection (if testable) shows "No stickers yet" with a "create sticker" CTA.
6. `/billboard/[id]` direct route renders the new board look (no X since no `onClose` is passed there — closing is via the header back button).
7. Create-modal error path: submit an empty note → "Write something for your whiteboard first." appears under the board.

- [ ] **Step 3: Commit any fixes**

Only if Steps 1–2 required changes:

```bash
git add -A apps/app
git commit -m "fix(app): billboard redesign polish from manual verification"
```
