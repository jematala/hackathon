import { useCallback, useEffect, useRef } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/app/theme";
import { colors } from "@/lib/theme";

const STEP_M = 20;
const REPEAT_MS = 120;

// [north metres, east metres]
const DIRS = {
  up: [STEP_M, 0],
  down: [-STEP_M, 0],
  left: [0, -STEP_M],
  right: [0, STEP_M],
} as const;

type Dir = keyof typeof DIRS;

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
};

const GLYPHS: Record<Dir, string> = { up: "^", down: "v", left: "<", right: ">" };

type VirtualPadProps = {
  isVirtual: boolean;
  moveBy: (dLatMeters: number, dLngMeters: number) => void;
  setVirtual: (on: boolean) => void;
};

export function VirtualPad({ isVirtual, moveBy, setVirtual }: VirtualPadProps) {
  // Keep the timers pointed at the latest moveBy without restarting them.
  const moveByRef = useRef(moveBy);
  moveByRef.current = moveBy;
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHold = useCallback(() => {
    if (holdTimer.current === null) return;
    clearInterval(holdTimer.current);
    holdTimer.current = null;
  }, []);

  const startHold = useCallback(
    (dir: Dir) => {
      const [dLat, dLng] = DIRS[dir];
      stopHold();
      moveByRef.current(dLat, dLng);
      holdTimer.current = setInterval(() => moveByRef.current(dLat, dLng), REPEAT_MS);
    },
    [stopHold],
  );

  // A leaked interval would keep calling moveBy after unmount.
  useEffect(() => stopHold, [stopHold]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !isVirtual) return;

    const held = new Set<Dir>();
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      let dLat = 0;
      let dLng = 0;
      for (const dir of held) {
        dLat += DIRS[dir][0];
        dLng += DIRS[dir][1];
      }
      if (dLat !== 0 || dLng !== 0) moveByRef.current(dLat, dLng);
    };

    const dirFor = (event: KeyboardEvent) =>
      KEY_DIRS[event.key.length === 1 ? event.key.toLowerCase() : event.key];

    const isTyping = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA";
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event)) return;
      const dir = dirFor(event);
      if (!dir) return;
      if (event.key.startsWith("Arrow")) event.preventDefault();
      if (held.has(dir)) return;
      held.add(dir);
      tick();
      timer ??= setInterval(tick, REPEAT_MS);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const dir = dirFor(event);
      if (!dir) return;
      held.delete(dir);
      if (held.size === 0 && timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (timer !== null) clearInterval(timer);
    };
  }, [isVirtual]);

  const button = (dir: Dir) => (
    <Pressable
      accessibilityLabel={`Move ${dir}`}
      onPressIn={() => startHold(dir)}
      onPressOut={stopHold}
      onTouchCancel={stopHold}
      style={({ pressed }) => [styles.padButton, { opacity: pressed ? 0.78 : 1 }]}
    >
      <Text style={styles.padGlyph}>{GLYPHS[dir]}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container} pointerEvents="box-none">
      {isVirtual ? (
        <View style={styles.pad}>
          <View style={styles.padRow}>{button("up")}</View>
          <View style={styles.padRow}>
            {button("left")}
            <View style={styles.padSpacer} />
            {button("right")}
          </View>
          <View style={styles.padRow}>{button("down")}</View>
        </View>
      ) : null}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {isVirtual ? "demo mode - virtual location" : "live gps"}
        </Text>
        <Pressable
          onPress={() => setVirtual(!isVirtual)}
          style={({ pressed }) => [styles.badgeButton, { opacity: pressed ? 0.78 : 1 }]}
        >
          <Text style={styles.badgeButtonText}>{isVirtual ? "use gps" : "demo"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const PAD_BUTTON = 40;

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    bottom: 176,
    gap: 8,
    left: 14,
    position: "absolute",
  },
  pad: {
    alignItems: "center",
    gap: 4,
  },
  padRow: {
    flexDirection: "row",
    gap: 4,
  },
  padButton: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDarker,
    borderRadius: 8,
    borderWidth: 3,
    height: PAD_BUTTON,
    justifyContent: "center",
    width: PAD_BUTTON,
  },
  padGlyph: {
    color: colors.creamText,
    fontFamily: fonts.family,
    fontSize: 26,
    lineHeight: 28,
  },
  padSpacer: {
    width: PAD_BUTTON,
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.inkSoft,
    fontFamily: fonts.family,
    fontSize: 16,
  },
  badgeButton: {
    backgroundColor: colors.sageDark,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeButtonText: {
    color: colors.creamText,
    fontFamily: fonts.family,
    fontSize: 16,
  },
});
