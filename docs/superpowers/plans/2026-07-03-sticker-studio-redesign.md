# Sticker Studio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the sticker/avatar creation UI to match the new mockup — a floating cream card over the live map with rainbow swatches, an optional name field, and clear/create buttons.

**Architecture:** `/studio` becomes a transparent-modal route so the map stays visible behind a dimmed backdrop. `CreateStickerPanel` is rewritten visually (same props, same API flow) and stays shared between the sticker studio and the avatar maker's draw tab.

**Tech Stack:** Expo Router 6, React Native 0.81 + RN Web, `StyleSheet.create()`, Jersey 10 font, existing `PixelCanvas` (dotting on web / WebView on native), TanStack Query hooks.

**Spec:** `docs/superpowers/specs/2026-07-03-sticker-studio-redesign-design.md`

## Global Constraints

- No backend/API/DB/shared-contract changes. `label` (max 80 chars, optional) already exists in `createSavedStickerInputSchema`.
- No changes to `PixelCanvas` internals; sticker size stays fixed at 64×64 (`STICKER_SIZE = 64`).
- Swatch colours come from `stickerPalette` in `apps/app/app/theme.ts` — do not hardcode new swatch hexes.
- Card/chrome colours come from `apps/app/lib/theme.ts` (the map's AC-style palette: `sage*`, `pageBgSoft`, `cork`, `ink`, `creamText`). One new token is added there; nothing else hardcoded.
- All copy is lowercase per the mockup: "create sticker", "create avatar", "colours", "name your sticker :", "sticker name...", "clear", "create", "set as avatar".
- **Testing note:** `apps/app` has no unit-test runner. Each task verifies with `bun --cwd apps/app run typecheck`; the final task runs `bun run check` (oxlint + oxfmt + typecheck for all workspaces) and a manual web walkthrough. Run `bun run format` before committing if `format:check` complains.

---

### Task 1: Restyle `CreateStickerPanel` (new card UI + name field)

**Files:**
- Modify: `apps/app/lib/theme.ts` (add one token)
- Modify: `apps/app/components/CreateStickerPanel.tsx` (full rewrite)

**Interfaces:**
- Consumes: `PixelCanvasRef` (`clear(): void`, `exportAsBase64(): Promise<StickerExport | null>`), `useCreateStickerAsset()`, `useSaveSticker()` (accepts `{ kind: "sticker", stickerAssetId, label? }`), `stickerPalette: string[]` from `@/app/theme`, `colors` from `@/lib/theme`.
- Produces: `CreateStickerPanel` with the **unchanged** prop type `{ onClose?: () => void; variant?: "sticker" | "avatar"; onAvatarSaved?: (payload: { dataUrl: string; base64: string }) => void }`. Task 2 and the existing `/avatar/create` page rely on these props exactly.

- [ ] **Step 1: Add the canvas-cream token to `apps/app/lib/theme.ts`**

In the `colors` object, after the `pageBgSoft` line, add:

```ts
  // Studio canvas / input fill — slightly lighter than the card
  canvasCream: "#FCF9EF",
```

- [ ] **Step 2: Rewrite `apps/app/components/CreateStickerPanel.tsx`**

Replace the entire file with:

```tsx
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { fonts, stickerPalette } from "@/app/theme";
import { colors } from "@/lib/theme";
import { ApiError } from "@/lib/api/client";
import { useCreateStickerAsset, useSaveSticker } from "@/lib/api/hooks";
import { PixelCanvas, type PixelCanvasRef } from "@/components/PixelCanvas";

const STICKER_SIZE = 64;

const WEB_NO_OUTLINE = { outlineStyle: "none" } as unknown as { outlineStyle: undefined };

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
  const ref = useRef<PixelCanvasRef>(null);
  const [brushColor, setBrushColor] = useState(stickerPalette[0]);
  const [stickerName, setStickerName] = useState("");
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitTone, setSubmitTone] = useState<"info" | "success" | "error">("info");
  const createAsset = useCreateStickerAsset();
  const saveSticker = useSaveSticker();
  const isSubmitting = !isAvatar && (createAsset.isPending || saveSticker.isPending);

  const handleSubmit = useCallback(async () => {
    if (!ref.current) {
      setSubmitTone("error");
      setSubmitStatus(isAvatar ? "avatar is not ready yet." : "sticker is not ready yet.");
      return;
    }

    const payload = await ref.current.exportAsBase64();
    if (!payload) {
      setSubmitTone("error");
      setSubmitStatus(isAvatar ? "could not prepare avatar." : "could not prepare sticker.");
      return;
    }

    if (isAvatar) {
      onAvatarSaved?.({ dataUrl: payload.dataUrl, base64: payload.base64 });
      setSubmitTone("success");
      setSubmitStatus("avatar saved!");
      return;
    }

    setSubmitTone("info");
    setSubmitStatus("saving to your collection…");

    try {
      const { sticker } = await createAsset.mutateAsync({
        pngBase64: payload.base64,
        width: STICKER_SIZE,
        height: STICKER_SIZE,
      });
      const label = stickerName.trim();
      await saveSticker.mutateAsync({
        kind: "sticker",
        stickerAssetId: sticker.id,
        ...(label ? { label } : {}),
      });
      setSubmitTone("success");
      setSubmitStatus("saved to your collection!");
      ref.current?.clear();
      setStickerName("");
    } catch (err) {
      setSubmitTone("error");
      if (err instanceof ApiError) {
        if (err.code === "capacity_reached") {
          setSubmitStatus("your collection is full. delete one to make room.");
        } else if (err.code === "moderation_rejected") {
          setSubmitStatus("sticker was rejected by moderation.");
        } else {
          setSubmitStatus(err.message);
        }
      } else if (err instanceof Error) {
        setSubmitStatus(`couldn't save sticker: ${err.message}`);
      } else {
        setSubmitStatus("couldn't save sticker. try again.");
      }
    }
  }, [createAsset, saveSticker, isAvatar, onAvatarSaved, stickerName]);

  return (
    <View style={styles.panel}>
      {onClose ? (
        <Pressable
          accessibilityLabel={isAvatar ? "Close avatar maker" : "Close sticker maker"}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          onPress={onClose}
        >
          <Text style={styles.closeText}>x</Text>
        </Pressable>
      ) : null}

      <Text style={styles.title}>{isAvatar ? "create avatar" : "create sticker"}</Text>

      <View style={styles.canvasFrame}>
        <PixelCanvas ref={ref} brushColor={brushColor} />
      </View>

      <Text style={styles.sectionLabel}>colours</Text>

      <View style={styles.paletteTray}>
        {stickerPalette.map((value) => (
          <Pressable
            accessibilityLabel={`Select colour ${value}`}
            key={value}
            onPress={() => setBrushColor(value)}
            style={[
              styles.swatch,
              { backgroundColor: value },
              brushColor === value && styles.swatchActive,
            ]}
          />
        ))}
      </View>

      {!isAvatar ? (
        <View style={styles.nameField}>
          <Text style={styles.sectionLabel}>name your sticker :</Text>
          <TextInput
            accessibilityLabel="Sticker name"
            autoCapitalize="none"
            maxLength={80}
            onChangeText={setStickerName}
            placeholder="sticker name..."
            placeholderTextColor={colors.inkSofter}
            selectionColor={colors.sageDark}
            style={[styles.nameInput, WEB_NO_OUTLINE]}
            underlineColorAndroid="transparent"
            value={stickerName}
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Clear canvas"
          onPress={() => ref.current?.clear()}
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
        >
          <Text style={styles.actionLabel}>clear</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={isAvatar ? "Save avatar" : "Save sticker to collection"}
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.actionButton,
            isSubmitting && styles.actionButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.creamText} size="small" />
          ) : (
            <Text style={styles.actionLabel}>{isAvatar ? "set as avatar" : "create"}</Text>
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
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderRadius: 18,
    borderWidth: 3,
    gap: 12,
    padding: 18,
    shadowColor: colors.sageDarker,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    width: "100%",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.sage,
    borderColor: colors.sageDark,
    borderRadius: 8,
    borderWidth: 2,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: -12,
    top: -12,
    width: 32,
    zIndex: 10,
  },
  closeText: {
    color: colors.creamText,
    fontFamily: fonts.family,
    fontSize: 18,
    lineHeight: 20,
  },
  title: {
    color: colors.sageDark,
    fontFamily: fonts.family,
    fontSize: 32,
    textAlign: "center",
  },
  canvasFrame: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.canvasCream,
    borderColor: colors.sageDark,
    borderRadius: 6,
    borderStyle: "dashed",
    borderWidth: 2,
    overflow: "hidden",
    padding: 8,
  },
  sectionLabel: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 20,
  },
  paletteTray: {
    alignItems: "center",
    backgroundColor: colors.cork,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  swatch: {
    borderColor: "rgba(62, 53, 40, 0.25)",
    borderRadius: 999,
    borderWidth: 2,
    height: 32,
    width: 32,
  },
  swatchActive: {
    borderColor: colors.sageDarker,
    borderWidth: 3,
  },
  nameField: {
    gap: 8,
  },
  nameInput: {
    backgroundColor: colors.canvasCream,
    borderColor: colors.sageDark,
    borderRadius: 10,
    borderWidth: 2,
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 18,
    minHeight: 44,
    paddingHorizontal: 12,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionLabel: {
    color: colors.creamText,
    fontFamily: fonts.family,
    fontSize: 22,
  },
  pressed: {
    opacity: 0.8,
  },
  submitStatus: {
    color: colors.inkSoft,
    fontFamily: fonts.family,
    fontSize: 16,
    textAlign: "center",
  },
  submitStatusSuccess: {
    color: colors.pinGreenDark,
  },
  submitStatusError: {
    color: colors.pinRedDark,
  },
});
```

Notes on what changed vs. the old file (for review context, not action):
- Download button and `handleDownload` removed entirely.
- Hardcoded earthy `COLORS` list replaced by `stickerPalette` tokens.
- New optional name field wired to `label` (sticker variant only, trimmed, omitted when empty, cleared on success).
- Subtitle removed; title centered and lowercase; close button now overlaps the top-right corner.

- [ ] **Step 3: Typecheck**

Run: `bun --cwd apps/app run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/app/components/CreateStickerPanel.tsx apps/app/lib/theme.ts
git commit -m "feat(app): restyle sticker/avatar creator card with name field"
```

---

### Task 2: Present `/studio` as a transparent modal over the map

**Files:**
- Modify: `apps/app/app/(app)/_layout.tsx` (studio screen options, one line)
- Modify: `apps/app/app/(app)/studio.tsx` (full rewrite)

**Interfaces:**
- Consumes: `CreateStickerPanel` props from Task 1 — renders `<CreateStickerPanel onClose={close} />` (default `variant="sticker"`).
- Produces: nothing consumed by later tasks. `/create` (which is `<Redirect href="/studio" />`) and the existing `router.push("/studio")` calls in `MapHUD` and `StickerCollectionPicker` must keep working unchanged.

- [ ] **Step 1: Update the studio screen options in `apps/app/app/(app)/_layout.tsx`**

Replace:

```tsx
      <Stack.Screen name="studio" options={{ animation: "slide_from_bottom" }} />
```

with:

```tsx
      <Stack.Screen
        name="studio"
        options={{
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
          presentation: "transparentModal",
        }}
      />
```

(The `contentStyle` override is required — the layout-level `contentStyle` paints `colors.pageBg` behind every screen, which would hide the map.)

- [ ] **Step 2: Rewrite `apps/app/app/(app)/studio.tsx`**

Replace the entire file with:

```tsx
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { CreateStickerPanel } from "@/components/CreateStickerPanel";

export default function StudioScreen() {
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/map" as any);
  };

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityLabel="Close studio"
        onPress={close}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="box-none" style={styles.cardWrap}>
        <CreateStickerPanel onClose={close} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "rgba(62, 53, 40, 0.35)",
    flex: 1,
    justifyContent: "center",
  },
  cardWrap: {
    alignSelf: "center",
    maxWidth: 430,
    paddingHorizontal: 16,
    width: "100%",
  },
});
```

Behaviour notes:
- The full-screen `Pressable` is the dimmed backdrop — tapping outside the card closes the modal. The card wrapper sits on top with `pointerEvents="box-none"` so the card itself still receives touches.
- The old header ("home" button + "Studio" title) is gone; closing is via the backdrop or the card's X button.
- `close()` keeps the old fallback: `router.back()` when possible, else replace with `/(app)/map` (covers direct deep-links to `/studio`).

- [ ] **Step 3: Typecheck**

Run: `bun --cwd apps/app run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/app/app/(app)/_layout.tsx" "apps/app/app/(app)/studio.tsx"
git commit -m "feat(app): present studio as transparent modal over the map"
```

---

### Task 3: Full check + manual verification

**Files:**
- No planned modifications (fixes only if checks or the walkthrough fail).

**Interfaces:**
- Consumes: everything from Tasks 1–2.
- Produces: verified, formatted, committed branch state.

- [ ] **Step 1: Run the repo-wide check**

Run: `bun run check`
Expected: oxlint, oxfmt `--check`, and all four typechecks pass.
If `format:check` fails: run `bun run format`, re-run `bun run check`, and include the formatted files in a `style: auto-format` commit.

- [ ] **Step 2: Manual web walkthrough**

Run: `bun run dev:app` and open the web build.

Verify each of these:
1. From `/map`, tap the "Studio" HUD button → the card fades in **over the visible map** with a dimmed backdrop.
2. Card matches the mockup: X on the top-right corner, centered lowercase "create sticker", dashed-border canvas, "colours" + round swatches in a tan pill tray, "name your sticker :" + centered placeholder "sticker name...", and "clear" / "create" buttons.
3. Draw a few pixels, pick different swatches (selected swatch shows a darker ring), type a name, press "create" → "saved to your collection!" appears, canvas and name field reset.
4. The saved sticker (with its label) appears in the collection (e.g. the billboard sticker picker).
5. Press "create" with an empty name → still saves (name optional).
6. Backdrop tap and X button both close the modal back to the map.
7. Navigate to `/create` directly → lands on the studio modal.
8. `/avatar/create` → draw tab shows the new card titled "create avatar" with no name field; drawing and "set as avatar" still updates the profile picture; upload tab unchanged.

- [ ] **Step 3: Commit any fixes**

Only if Steps 1–2 required changes:

```bash
git add -A apps/app
git commit -m "fix(app): studio redesign polish from manual verification"
```
