import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ChevronLeft,
  Flame,
  LogOut,
  Lock,
  MapPin,
  MessageSquare,
  Pencil,
  Sparkles,
  Sticker,
} from "lucide-react-native";

import { Screen } from "@/components/Screen";
import { colors, fonts, pixelBorder, stickerPalette } from "@/app/theme";
import { setUsername, useUserProfile } from "@/lib/userProfile";

const AVATAR_SIZE = 132;
const RING_SIZE = AVATAR_SIZE + 18;
const RING_STROKE = 5;
const XP_COLOR = "#4A90D9";
const XP_TRACK = "rgba(45,45,45,0.12)";
const WEB_NO_OUTLINE = { outlineStyle: "none" } as unknown as { outlineStyle: undefined };

const DEMO_USER = {
  level: 6,
  xpCurrent: 720,
  xpForNext: 1000,
  streak: 7,
  joined: "Mar 2026",
};

const DEMO_STATS = [
  { key: "notes", label: "Notes placed", value: 12, Icon: MessageSquare, tint: colors.accent },
  {
    key: "stickers",
    label: "Stickers saved",
    value: 24,
    Icon: Sticker,
    tint: colors.stickerPurple,
  },
  { key: "pois", label: "POIs visited", value: 8, Icon: MapPin, tint: colors.primary },
  {
    key: "replies",
    label: "Replies received",
    value: 36,
    Icon: Sparkles,
    tint: colors.stickerOrange,
  },
];

const PERKS = [
  { level: 1, label: "3 concurrent billboards · 4/day", unlocked: true },
  { level: 1, label: "10 sticker slots", unlocked: true },
  { level: 2, label: "+1 concurrent billboard (4 total)", unlocked: true },
  { level: 3, label: "+2 sticker slots (12 total)", unlocked: true },
  { level: 4, label: "Cosmetic: signature on notes", unlocked: true },
  { level: 5, label: "+1 concurrent billboard (5 total)", unlocked: true },
  { level: 6, label: "Note border flair", unlocked: true },
  { level: 7, label: "+2 sticker slots (14 total)", unlocked: false },
  { level: 8, label: "+1 concurrent billboard (6 total)", unlocked: false },
  { level: 9, label: "Sticker colour palette expansion", unlocked: false },
  { level: 10, label: "Maxed: 10 billboards · 20 sticker slots", unlocked: false },
];

// 8x8 hand-authored mini stickers. Each entry is a row string of palette indices (0-7) or '.' for transparent.
// Palette index maps to stickerPalette: 0=Red 1=Blue 2=Green 3=Yellow 4=Purple 5=Orange 6=Pink 7=Cyan
const SAVED_STICKERS: string[][] = [
  // tiny heart
  ["........", ".00..00.", ".000000.", ".000000.", "..0000..", "...00...", "........", "........"],
  // mushroom
  ["..3333..", ".333333.", "33533533", "33333333", ".322223.", "..2222..", "..2222..", "..2222.."],
  // star
  ["...33...", "...33...", "33333333", ".333333.", "..3333..", ".33..33.", "33....33", "........"],
  // smiley
  ["..3333..", ".333333.", "33033033", "33333333", "33033033", "33300333", ".333333.", "..3333.."],
  // leaf
  [".....22.", "....222.", "...2222.", "..22222.", ".222222.", ".22222..", ".2222...", "22......"],
  // pixel cat face
  [
    ".44..44.",
    "444444.",
    "44044044",
    "44444444",
    "44400444",
    ".444444.",
    "..4444..",
    "........",
  ].map((r) => r.padEnd(8, ".")),
];

function makeXpRingUri(progress: number): string {
  const r = (RING_SIZE - RING_STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${RING_SIZE}" height="${RING_SIZE}" viewBox="0 0 ${RING_SIZE} ${RING_SIZE}">
    <circle cx="${RING_SIZE / 2}" cy="${RING_SIZE / 2}" r="${r}" fill="none" stroke="${XP_TRACK}" stroke-width="${RING_STROKE}"/>
    <circle cx="${RING_SIZE / 2}" cy="${RING_SIZE / 2}" r="${r}" fill="none" stroke="${XP_COLOR}" stroke-width="${RING_STROKE}"
      stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})" stroke-linecap="round"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function MiniSticker({ pattern, locked }: { pattern: string[]; locked?: boolean }) {
  const cell = 6;
  return (
    <View style={[styles.miniSticker, locked && styles.miniStickerLocked]}>
      {pattern.map((row, ri) => (
        <View key={ri} style={styles.miniStickerRow}>
          {row.split("").map((ch, ci) => {
            const idx = Number.parseInt(ch, 10);
            const bg = Number.isNaN(idx) ? "transparent" : stickerPalette[idx];
            return <View key={ci} style={{ backgroundColor: bg, height: cell, width: cell }} />;
          })}
        </View>
      ))}
      {locked ? (
        <View style={styles.miniStickerLockOverlay}>
          <Lock color={colors.white} size={14} />
        </View>
      ) : null}
    </View>
  );
}

function StatCard({
  label,
  value,
  Icon,
  tint,
}: {
  label: string;
  value: number;
  Icon: typeof MessageSquare;
  tint: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}>
        <Icon color={colors.white} size={18} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export default function ProfileScreen() {
  const xpProgress = useMemo(() => DEMO_USER.xpCurrent / DEMO_USER.xpForNext, []);
  const profile = useUserProfile();
  const unlockedCount = PERKS.filter((p) => p.unlocked).length;
  const avatarSource = profile.avatarUri
    ? { uri: profile.avatarUri }
    : require("@/assets/images/avatar.png");

  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [draftName, setDraftName] = useState(profile.username);
  const openNameModal = useCallback(() => {
    setDraftName(profile.username);
    setNameModalOpen(true);
  }, [profile.username]);
  const submitName = useCallback(() => {
    setUsername(draftName);
    setNameModalOpen(false);
  }, [draftName]);

  return (
    <Screen>
      {/* ── Identity hero ─────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.heroBgBand} />

        <Pressable
          accessibilityLabel="Back to map"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(app)/map" as any);
          }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <ChevronLeft color={colors.white} size={18} />
          <Text style={styles.backBtnLabel}>map</Text>
        </Pressable>

        <View style={styles.avatarWrapper}>
          <Image source={{ uri: makeXpRingUri(xpProgress) }} style={styles.xpRing} />
          <View style={styles.avatarFrame}>
            <Image source={avatarSource} style={styles.avatarImage} />
          </View>
          <View style={styles.levelChip}>
            <Text style={styles.levelChipText}>lv{DEMO_USER.level}</Text>
          </View>
        </View>

        <View style={styles.usernameRow}>
          <Text style={styles.usernameText}>@{profile.username}</Text>
        </View>
        <Text style={styles.joinedText}>joined {DEMO_USER.joined}</Text>

        <View style={styles.xpBarRow}>
          <Text style={styles.xpLabel}>XP</Text>
          <View style={styles.xpBarTrack}>
            <View style={[styles.xpBarFill, { width: `${xpProgress * 100}%` }]} />
          </View>
          <Text style={styles.xpValue}>
            {DEMO_USER.xpCurrent}/{DEMO_USER.xpForNext}
          </Text>
        </View>

        <View style={styles.heroActions}>
          <Pressable
            onPress={() => router.push("/avatar/create" as any)}
            style={({ pressed }) => [styles.heroBtn, pressed && styles.pressed]}
          >
            <Pencil color={colors.primaryDark} size={14} />
            <Text style={styles.heroBtnLabel}>edit avatar</Text>
          </Pressable>
          <Pressable
            onPress={openNameModal}
            style={({ pressed }) => [styles.heroBtn, pressed && styles.pressed]}
          >
            <Pencil color={colors.primaryDark} size={14} />
            <Text style={styles.heroBtnLabel}>edit name</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Streak banner ─────────────────────────── */}
      <View style={styles.streakBanner}>
        <View style={styles.streakIconBox}>
          <Flame color={colors.white} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.streakValue}>{DEMO_USER.streak}-day streak</Text>
          <Text style={styles.streakHint}>keep it going — daily quest resets at midnight</Text>
        </View>
        <View style={styles.streakDays}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.streakDot,
                i < DEMO_USER.streak ? styles.streakDotOn : styles.streakDotOff,
              ]}
            />
          ))}
        </View>
      </View>

      {/* ── Stats grid ────────────────────────────── */}
      <SectionLabel>stats</SectionLabel>
      <View style={styles.statsGrid}>
        {DEMO_STATS.map((s) => (
          <StatCard key={s.key} label={s.label} value={s.value} Icon={s.Icon} tint={s.tint} />
        ))}
      </View>

      {/* ── Perks ─────────────────────────────────── */}
      <View style={styles.perksHeader}>
        <SectionLabel>perks</SectionLabel>
        <Text style={styles.perksCount}>
          {unlockedCount}/{PERKS.length} unlocked
        </Text>
      </View>
      <View style={styles.perksCard}>
        {PERKS.map((perk, i) => (
          <View
            key={i}
            style={[styles.perkRow, i === PERKS.length - 1 && { borderBottomWidth: 0 }]}
          >
            <View style={[styles.perkLvl, perk.unlocked ? styles.perkLvlOn : styles.perkLvlOff]}>
              <Text style={[styles.perkLvlText, perk.unlocked ? null : styles.perkLvlTextOff]}>
                {perk.level}
              </Text>
            </View>
            <Text style={[styles.perkLabel, !perk.unlocked && styles.perkLabelLocked]}>
              {perk.label}
            </Text>
            {perk.unlocked ? (
              <View style={styles.perkCheck}>
                <Text style={styles.perkCheckText}>✓</Text>
              </View>
            ) : (
              <Lock color={colors.textLight} size={14} />
            )}
          </View>
        ))}
      </View>

      {/* ── Saved stickers ────────────────────────── */}
      <SectionLabel>saved stickers</SectionLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stickerRow}
      >
        {SAVED_STICKERS.map((p, i) => (
          <MiniSticker key={i} pattern={p} />
        ))}
        {/* one locked slot to telegraph progression */}
        <MiniSticker pattern={SAVED_STICKERS[0]} locked />
      </ScrollView>
      <Text style={styles.slotsHint}>
        {SAVED_STICKERS.length}/12 slots used · unlock more at level 7
      </Text>

      {/* ── Sign out ──────────────────────────────── */}
      <Pressable style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}>
        <LogOut color={colors.danger} size={16} />
        <Text style={styles.signOutLabel}>sign out</Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setNameModalOpen(false)}
        transparent
        visible={nameModalOpen}
      >
        <Pressable
          accessibilityLabel="Close edit name"
          onPress={() => setNameModalOpen(false)}
          style={styles.modalBackdrop}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalCard}>
            <Text style={styles.modalTitle}>edit username</Text>
            <Text style={styles.modalHint}>
              this is shown on your billboards and stickers.
            </Text>
            <View style={styles.modalInputRow}>
              <Text style={styles.modalAt}>@</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                maxLength={20}
                onChangeText={setDraftName}
                onSubmitEditing={submitName}
                placeholder="username"
                placeholderTextColor={colors.textLight}
                returnKeyType="done"
                selectionColor={colors.primaryDark}
                style={[styles.modalInput, WEB_NO_OUTLINE]}
                value={draftName}
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setNameModalOpen(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnSubtle,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.modalBtnSubtleLabel}>cancel</Text>
              </Pressable>
              <Pressable
                disabled={!draftName.trim()}
                onPress={submitName}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  !draftName.trim() && styles.saveBtnDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.modalBtnPrimaryLabel}>save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ── HERO ──────────────────────────────
  hero: {
    alignItems: "center",
    backgroundColor: colors.parchment,
    borderColor: colors.borderDark,
    borderWidth: 2,
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 50,
    position: "relative",
  },
  heroBgBand: {
    backgroundColor: colors.primary,
    borderBottomColor: colors.primaryDark,
    borderBottomWidth: 2,
    height: 64,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  backBtn: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderColor: colors.text,
    borderWidth: 2,
    flexDirection: "row",
    gap: 2,
    left: 10,
    paddingHorizontal: 10,
    paddingRight: 12,
    paddingVertical: 4,
    position: "absolute",
    top: 12,
  },
  backBtnLabel: {
    color: colors.white,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  avatarWrapper: {
    alignItems: "center",
    height: RING_SIZE,
    justifyContent: "center",
    marginBottom: 14,
    width: RING_SIZE,
  },
  xpRing: {
    height: RING_SIZE,
    position: "absolute",
    width: RING_SIZE,
  },
  avatarFrame: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.text,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    elevation: 6,
    height: AVATAR_SIZE,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    width: AVATAR_SIZE,
  },
  avatarImage: {
    borderRadius: AVATAR_SIZE / 2 - 3,
    height: AVATAR_SIZE - 6,
    width: AVATAR_SIZE - 6,
  },
  levelChip: {
    backgroundColor: colors.accent,
    borderColor: colors.text,
    borderWidth: 2,
    bottom: -6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    position: "absolute",
  },
  levelChipText: {
    color: colors.white,
    fontFamily: fonts.family,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  usernameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  usernameText: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 30,
  },
  joinedText: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 16,
    marginTop: 2,
  },
  xpBarRow: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  xpLabel: {
    color: colors.primaryDark,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  xpBarTrack: {
    backgroundColor: colors.parchmentDark,
    borderColor: colors.borderDark,
    borderWidth: 2,
    flex: 1,
    height: 14,
    overflow: "hidden",
  },
  xpBarFill: {
    backgroundColor: XP_COLOR,
    height: "100%",
  },
  xpValue: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 16,
    minWidth: 70,
    textAlign: "right",
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  heroBtn: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.primaryDark,
    borderWidth: 2,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroBtnLabel: {
    color: colors.primaryDark,
    fontFamily: fonts.family,
    fontSize: 16,
  },

  // ── STREAK ────────────────────────────
  streakBanner: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderDark,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  streakIconBox: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderColor: "#7E1D11",
    borderWidth: 2,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  streakValue: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 22,
  },
  streakHint: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 14,
  },
  streakDays: {
    flexDirection: "row",
    gap: 4,
  },
  streakDot: {
    borderWidth: 2,
    height: 10,
    width: 10,
  },
  streakDotOn: {
    backgroundColor: colors.danger,
    borderColor: "#7E1D11",
  },
  streakDotOff: {
    backgroundColor: colors.parchmentDark,
    borderColor: colors.borderDark,
  },

  // ── SECTION LABEL ─────────────────────
  sectionLabel: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 22,
    marginTop: 4,
  },

  // ── STATS ─────────────────────────────
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    backgroundColor: colors.card,
    borderColor: colors.borderDark,
    borderWidth: 2,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 4,
    padding: 14,
  },
  statIcon: {
    alignItems: "center",
    borderColor: colors.text,
    borderWidth: 2,
    height: 32,
    justifyContent: "center",
    marginBottom: 4,
    width: 32,
  },
  statValue: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 32,
    lineHeight: 34,
  },
  statLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 16,
  },

  // ── PERKS ─────────────────────────────
  perksHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  perksCount: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 16,
  },
  perksCard: {
    backgroundColor: colors.card,
    borderColor: colors.borderDark,
    borderWidth: 2,
  },
  perkRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  perkLvl: {
    alignItems: "center",
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  perkLvlOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  perkLvlOff: {
    backgroundColor: colors.parchmentDark,
    borderColor: colors.borderDark,
  },
  perkLvlText: {
    color: colors.white,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  perkLvlTextOff: {
    color: colors.textLight,
  },
  perkLabel: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  perkLabelLocked: {
    color: colors.textLight,
  },
  perkCheck: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  perkCheckText: {
    color: colors.white,
    fontFamily: fonts.family,
    fontSize: 14,
  },

  // ── STICKERS ──────────────────────────
  stickerRow: {
    gap: 12,
    paddingVertical: 4,
  },
  miniSticker: {
    backgroundColor: colors.card,
    ...pixelBorder,
    overflow: "hidden",
    padding: 4,
    position: "relative",
  },
  miniStickerLocked: {
    opacity: 0.4,
  },
  miniStickerRow: {
    flexDirection: "row",
  },
  miniStickerLockOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(45,45,45,0.55)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  slotsHint: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 14,
    marginTop: -4,
  },

  // ── SIGN OUT ──────────────────────────
  signOutBtn: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.card,
    borderColor: colors.danger,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  signOutLabel: {
    color: colors.danger,
    fontFamily: fonts.family,
    fontSize: 18,
  },

  // ── EDIT NAME MODAL ───────────────────
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(45,45,45,0.55)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.parchment,
    borderColor: colors.borderDark,
    borderWidth: 3,
    gap: 12,
    maxWidth: 380,
    padding: 18,
    width: "100%",
  },
  modalTitle: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 24,
  },
  modalHint: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 14,
  },
  modalInputRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderDark,
    borderWidth: 2,
    flexDirection: "row",
    paddingHorizontal: 10,
  },
  modalAt: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 22,
    marginRight: 4,
  },
  modalInput: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.family,
    fontSize: 22,
    minHeight: 44,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  modalBtn: {
    alignItems: "center",
    borderWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  modalBtnSubtle: {
    backgroundColor: colors.card,
    borderColor: colors.primaryDark,
  },
  modalBtnSubtleLabel: {
    color: colors.primaryDark,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  modalBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  modalBtnPrimaryLabel: {
    color: colors.white,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },

  // shared
  pressed: { opacity: 0.75 },
});
