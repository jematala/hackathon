import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import {
  useCurrentUser,
  useQuests,
  useSavedStickers,
  useUpdateCurrentUser,
  useUserProgress,
} from "@/lib/api/hooks";
import {
  avatarBase64ToUri,
  resetUserProfile,
  setUsername,
  useUserProfile,
} from "@/lib/userProfile";

const AVATAR_SIZE = 132;
const RING_SIZE = AVATAR_SIZE + 18;
const RING_STROKE = 5;
const XP_COLOR = "#4A90D9";
const XP_TRACK = "rgba(45,45,45,0.12)";
const WEB_NO_OUTLINE = { outlineStyle: "none" } as unknown as { outlineStyle: undefined };

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

function MiniSticker({ uri, locked }: { uri?: string; locked?: boolean }) {
  return (
    <View style={[styles.miniSticker, locked && styles.miniStickerLocked]}>
      {uri ? (
        <Image source={{ uri }} style={styles.miniStickerImage} />
      ) : (
        <View style={styles.miniStickerFallback}>
          {Array.from({ length: 8 }).map((_, row) => (
            <View key={row} style={styles.miniStickerRow}>
              {Array.from({ length: 8 }).map((__, col) => (
                <View
                  key={col}
                  style={{
                    backgroundColor: stickerPalette[(row + col) % stickerPalette.length],
                    height: 6,
                    width: 6,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      )}
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

function formatJoined(createdAt: string | undefined): string {
  if (!createdAt) return "recently";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "recently";

  return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(date);
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const profile = useUserProfile();
  const currentUser = useCurrentUser();
  const userProgress = useUserProgress();
  const quests = useQuests();
  const savedStickers = useSavedStickers();
  const updateCurrentUser = useUpdateCurrentUser();

  const liveUser = currentUser.data;
  const progress = userProgress.data;
  const username = liveUser?.username ?? profile.username;
  const level = progress?.level ?? liveUser?.level ?? 1;
  const joined = formatJoined(liveUser?.createdAt);
  const avatarUri = avatarBase64ToUri(liveUser?.avatarBase64) ?? profile.avatarUri;
  const avatarSource = avatarUri ? { uri: avatarUri } : require("@/assets/images/avatar.png");
  const stickerCapacity = savedStickers.data?.capacity ?? progress?.capacities.stickerSlots ?? 0;
  const liveStickers = savedStickers.data?.stickers ?? [];

  const levelXp = useMemo(() => {
    const levelQuests = quests.data?.levelQuests ?? [];
    const total = levelQuests.reduce((sum, quest) => sum + quest.quest.xpReward, 0);
    const current = levelQuests.reduce(
      (sum, quest) => sum + (quest.claimedAt ? (quest.claimedXp ?? quest.quest.xpReward) : 0),
      0,
    );

    if (total > 0) {
      return { current, total };
    }

    const xp = progress?.xp ?? liveUser?.xp ?? 0;
    return { current: xp, total: Math.max(xp, 1) };
  }, [liveUser?.xp, progress?.xp, quests.data?.levelQuests]);
  const xpProgress = Math.min(1, levelXp.current / Math.max(levelXp.total, 1));

  const stats = useMemo(
    () => [
      {
        key: "pois",
        label: "POIs visited",
        value: progress?.stats.poisVisited ?? 0,
        Icon: MapPin,
        tint: colors.primary,
      },
      {
        key: "placements",
        label: "Pins placed",
        value: progress?.stats.placementsCreated ?? 0,
        Icon: MessageSquare,
        tint: colors.accent,
      },
      {
        key: "stickers",
        label: "Stickers saved",
        value: progress?.stats.stickersSaved ?? liveStickers.length,
        Icon: Sticker,
        tint: colors.stickerPurple,
      },
      {
        key: "replies",
        label: "Replies received",
        value: progress?.stats.repliesReceived ?? 0,
        Icon: Sparkles,
        tint: colors.stickerOrange,
      },
    ],
    [liveStickers.length, progress?.stats],
  );

  const perks = useMemo(() => {
    const unlocked =
      progress?.unlockedPerks.map((perk) => ({
        key: perk.levelPerkId,
        label: `${perk.perk.name}: ${perk.perk.description}`,
        level: perk.sourceLevel,
        unlocked: true,
      })) ?? [];
    const next =
      progress?.nextPerks.map((perk) => ({
        key: perk.id,
        label: `${perk.perk.name}: ${perk.perk.description}`,
        level: perk.level,
        unlocked: false,
      })) ?? [];

    return [...unlocked, ...next];
  }, [progress?.nextPerks, progress?.unlockedPerks]);
  const unlockedCount = progress?.unlockedPerks.length ?? 0;

  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [draftName, setDraftName] = useState(username);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!nameModalOpen) {
      setDraftName(username);
    }
  }, [nameModalOpen, username]);

  const openNameModal = useCallback(() => {
    setDraftName(username);
    setNameError(null);
    setNameModalOpen(true);
  }, [username]);
  const submitName = useCallback(async () => {
    const nextName = draftName.trim();
    if (!nextName) return;

    setNameError(null);
    try {
      await updateCurrentUser.mutateAsync({ username: nextName });
      setUsername(nextName);
      setNameModalOpen(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Could not save username.");
    }
  }, [draftName, updateCurrentUser]);

  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      resetUserProfile();
      router.replace("/");
    } catch {
      setSigningOut(false);
    }
  }, [signingOut, signOut]);

  return (
    <Screen>
      {currentUser.isLoading || userProgress.isLoading ? (
        <View style={styles.liveStatus}>
          <ActivityIndicator color={colors.primaryDark} />
          <Text style={styles.liveStatusText}>syncing profile...</Text>
        </View>
      ) : null}
      {currentUser.isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            {(currentUser.error as Error | undefined)?.message ?? "Could not load profile."}
          </Text>
        </View>
      ) : null}

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
            <Text style={styles.levelChipText}>lv{level}</Text>
          </View>
        </View>

        <View style={styles.usernameRow}>
          <Text style={styles.usernameText}>@{username}</Text>
        </View>
        <Text style={styles.joinedText}>joined {joined}</Text>

        <View style={styles.xpBarRow}>
          <Text style={styles.xpLabel}>XP</Text>
          <View style={styles.xpBarTrack}>
            <View style={[styles.xpBarFill, { width: `${xpProgress * 100}%` }]} />
          </View>
          <Text style={styles.xpValue}>
            {levelXp.current}/{levelXp.total}
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

      {/* ── Stats grid ────────────────────────────── */}
      <SectionLabel>stats</SectionLabel>
      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <StatCard key={s.key} label={s.label} value={s.value} Icon={s.Icon} tint={s.tint} />
        ))}
      </View>

      {/* ── Perks ─────────────────────────────────── */}
      <View style={styles.perksHeader}>
        <SectionLabel>perks</SectionLabel>
        <Text style={styles.perksCount}>
          {unlockedCount}/{Math.max(perks.length, unlockedCount)} unlocked
        </Text>
      </View>
      <View style={styles.perksCard}>
        {perks.length > 0 ? (
          perks.map((perk, i) => (
            <View
              key={perk.key}
              style={[styles.perkRow, i === perks.length - 1 && { borderBottomWidth: 0 }]}
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
          ))
        ) : (
          <View style={[styles.perkRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.perkLabelLocked}>Perks will appear after your profile syncs.</Text>
          </View>
        )}
      </View>

      {/* ── Saved stickers ────────────────────────── */}
      <SectionLabel>saved stickers</SectionLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stickerRow}
      >
        {liveStickers.map((sticker) => (
          <MiniSticker
            key={sticker.id}
            uri={avatarBase64ToUri(sticker.stickerAsset?.pngBase64) ?? undefined}
          />
        ))}
        {liveStickers.length < stickerCapacity ? <MiniSticker locked /> : null}
      </ScrollView>
      <Text style={styles.slotsHint}>
        {liveStickers.length}/{stickerCapacity} slots used
      </Text>

      {/* ── Sign out ──────────────────────────────── */}
      <Pressable
        disabled={signingOut}
        onPress={handleSignOut}
        style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
      >
        <LogOut color={colors.danger} size={16} />
        <Text style={styles.signOutLabel}>{signingOut ? "signing out…" : "sign out"}</Text>
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
            <Text style={styles.modalHint}>this is shown on your billboards and stickers.</Text>
            <View style={styles.modalInputRow}>
              <Text style={styles.modalAt}>@</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                maxLength={32}
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
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
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
                disabled={!draftName.trim() || updateCurrentUser.isPending}
                onPress={submitName}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  (!draftName.trim() || updateCurrentUser.isPending) && styles.saveBtnDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.modalBtnPrimaryLabel}>
                  {updateCurrentUser.isPending ? "saving..." : "save"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  liveStatus: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.borderDark,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  liveStatusText: {
    color: colors.primaryDark,
    fontFamily: fonts.family,
    fontSize: 16,
  },
  errorBanner: {
    backgroundColor: "#F6D7CE",
    borderColor: colors.danger,
    borderWidth: 2,
    padding: 10,
  },
  errorText: {
    color: colors.danger,
    fontFamily: fonts.family,
    fontSize: 16,
  },
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
  miniStickerFallback: {
    height: 48,
    width: 48,
  },
  miniStickerImage: {
    height: 48,
    width: 48,
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
