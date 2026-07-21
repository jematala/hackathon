import type { ClaimQuestResponse, QuestProgress } from "@repo/shared";
import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { fonts } from "@/app/theme";
import { BillboardPanel } from "@/components/billboard/BillboardPanel";
import { Card } from "@/components/Card";
import { CanvasModal } from "@/components/CanvasModal";
import { CreateStickerPanel } from "@/components/CreateStickerPanel";
import { LevelUpOverlay, type LevelUpPerk } from "@/components/LevelUpOverlay";
import Map from "@/components/map/Map";
import { MapHUD } from "@/components/map/MapHUD";
import { NextLevelPreview } from "@/components/NextLevelPreview";
import { NextMilestonePreview } from "@/components/NextMilestonePreview";
import { QuestCard } from "@/components/QuestCard";
import { UNSW_CAMPUS_ID, UNSW_CENTER } from "@/constants/coordinates";
import { useUserLocation } from "@/hooks/useUserLocation";
import { ApiError } from "@/lib/api/client";
import {
  useBillboards,
  useClaimQuest,
  useCreateBillboard,
  usePois,
  useQuests,
  useUserProgress,
  useVisitPoi,
} from "@/lib/api/hooks";
import { colors } from "@/lib/theme";
import { useUserProfile } from "@/lib/userProfile";

type HudModal = "profile" | "quests" | "studio";

export default function MapScreen() {
  const mapRef = useRef<{ invalidateSize: () => void }>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [activeBillboardId, setActiveBillboardId] = useState<string | null>(null);
  const [activeHudModal, setActiveHudModal] = useState<HudModal | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [body, setBody] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [poiError, setPoiError] = useState<string | null>(null);
  const billboards = useBillboards({ campusId: UNSW_CAMPUS_ID });
  const pois = usePois({ campusId: UNSW_CAMPUS_ID });
  const createBillboard = useCreateBillboard();
  const { location, isDenied, canAskAgain, requestPermission } = useUserLocation();
  const billboardLocation = location
    ? { lat: location.latitude, lng: location.longitude }
    : UNSW_CENTER;
  const mapBillboards = useMemo(
    () =>
      (billboards.data ?? []).map((billboard) => ({
        id: billboard.id,
        title: billboard.body,
        lat: billboard.lat,
        lng: billboard.lng,
      })),
    [billboards.data],
  );
  const visitPoi = useVisitPoi({ campusId: UNSW_CAMPUS_ID });

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateError(null);
  };

  const submitBillboard = () => {
    const trimmed = body.trim();
    if (!trimmed) {
      setCreateError("Write something for your whiteboard first.");
      return;
    }

    setCreateError(null);

    createBillboard.mutate(
      {
        campusId: UNSW_CAMPUS_ID,
        body: trimmed,
        lat: billboardLocation.lat,
        lng: billboardLocation.lng,
      },
      {
        onSuccess: (data) => {
          setBody("");
          setCreateOpen(false);
          setActiveBillboardId(data.billboard.id);
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            setCreateError(err.message);
            return;
          }
          console.log(err.message);
          setCreateError("Could not pin this billboard.");
        },
      },
    );
  };

  const handleEnableLocation = useCallback(async () => {
    if (canAskAgain) {
      await requestPermission();
    } else {
      Linking.openURL("app-settings:");
    }
  }, [canAskAgain, requestPermission]);

  const handleBillboardPress = useCallback((id: string) => {
    setActiveBillboardId(id);
  }, []);

  const checkInToPoi = useCallback(
    (id: string) => {
      const poi = pois.data?.find((candidate) => candidate.id === id);
      if (!poi || visitPoi.isPending) return;

      setPoiError(null);
      if (!location) {
        setPoiError("Enable location and wait for a position before checking in.");
        return;
      }

      visitPoi.mutate(
        {
          id,
          input: { lat: location.latitude, lng: location.longitude },
        },
        {
          onSuccess: (data) => {
            if (!data.withinRadius) {
              setPoiError("Move closer to this POI to check in.");
            }
          },
          onError: (err) => {
            setPoiError(err instanceof ApiError ? err.message : "Could not check in here.");
          },
        },
      );
    },
    [location, pois.data, visitPoi],
  );

  return (
    <View style={styles.root}>
      <Map
        ref={mapRef}
        location={location}
        billboards={mapBillboards}
        onBillboardPress={handleBillboardPress}
        onPoiCheckIn={checkInToPoi}
        pois={(pois.data ?? []).map((poi) => ({
          id: poi.id,
          title: poi.title,
          description: poi.description,
          lat: poi.lat,
          lng: poi.lng,
          visited: poi.visited,
        }))}
      />
      {billboards.isLoading || pois.isLoading ? (
        <View style={styles.mapStatus}>
          <ActivityIndicator color={colors.sageDark} />
        </View>
      ) : null}
      {poiError ? (
        <View style={styles.poiError}>
          <Text style={styles.poiErrorText}>{poiError}</Text>
        </View>
      ) : null}
      <MapHUD
        onCreateBillboard={() => setCreateOpen(true)}
        onOpenProfile={() => setActiveHudModal("profile")}
        onOpenQuests={() => setActiveHudModal("quests")}
        onOpenStudio={() => setActiveHudModal("studio")}
        isPermissionDenied={isDenied}
        onEnableLocation={handleEnableLocation}
      />
      <Modal
        visible={activeBillboardId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveBillboardId(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setActiveBillboardId(null)} />
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalPanel}>
              <BillboardPanel
                id={activeBillboardId ?? undefined}
                onClose={() => setActiveBillboardId(null)}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={closeCreate}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closeCreate} />
          <View style={styles.createPanel}>
            <View style={styles.createHeader}>
              <Text style={styles.createTitle}>New billboard</Text>
              <Pressable
                onPress={closeCreate}
                style={styles.closeButton}
                hitSlop={8}
                accessibilityLabel="Close create billboard"
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={500}
              placeholder="Write something for people nearby..."
              placeholderTextColor={colors.inkSofter}
              selectionColor={colors.sageDark}
              style={styles.createInput}
            />
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
                {createBillboard.isPending ? "Pinning..." : "Pin here"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <HudSheetModal
        activeModal={activeHudModal}
        onClose={() => setActiveHudModal(null)}
        onCreateBillboard={() => {
          setActiveHudModal(null);
          setCreateOpen(true);
        }}
      />
      <CanvasModal visible={isCanvasOpen} onClose={() => setIsCanvasOpen(false)} />
    </View>
  );
}

function HudSheetModal({
  activeModal,
  onClose,
  onCreateBillboard,
}: {
  activeModal: HudModal | null;
  onClose: () => void;
  onCreateBillboard: () => void;
}) {
  const { height } = useWindowDimensions();
  // The modal stays mounted through its fade-out, so keep showing the last
  // sheet instead of falling through to the Studio branch on the way out.
  const [shown, setShown] = useState(activeModal);
  if (activeModal && activeModal !== shown) {
    setShown(activeModal);
  }
  // No fall-through default: an unexpected value must never read as "Studio".
  const title =
    shown === "profile"
      ? "Profile"
      : shown === "quests"
        ? "Quests"
        : shown === "studio"
          ? "Studio"
          : "";
  const isStudio = shown === "studio";

  return (
    <Modal visible={activeModal !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <ScrollView
          style={[styles.hudModalScroll, { maxHeight: Math.max(360, height - 32) }]}
          contentContainerStyle={[
            styles.hudModalScrollContent,
            isStudio && styles.studioModalScrollContent,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {isStudio ? (
            <CreateStickerPanel onClose={onClose} />
          ) : (
            <View style={styles.hudModalPanel}>
              <View style={styles.hudModalHeader}>
                <Text style={styles.hudModalTitle}>{title}</Text>
                <Pressable
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={8}
                  accessibilityLabel={`Close ${title.toLowerCase()} modal`}
                >
                  <Text style={styles.closeText}>x</Text>
                </Pressable>
              </View>

              {shown === "profile" ? (
                <ProfileModalContent onCreateBillboard={onCreateBillboard} />
              ) : null}
              {shown === "quests" ? <QuestsModalContent /> : null}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ProfileModalContent({ onCreateBillboard }: { onCreateBillboard: () => void }) {
  const profile = useUserProfile();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const avatarSource = profile.avatarUri
    ? { uri: profile.avatarUri }
    : require("@/assets/images/avatar.png");

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/");
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.profileContent}>
      <View style={styles.profileHero}>
        <View style={styles.profileAvatarFrame}>
          <Image source={avatarSource} style={styles.profileAvatar} />
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>@{profile.username}</Text>
          <Text style={styles.profileMeta}>lv22 explorer</Text>
        </View>
      </View>

      <View style={styles.profileStatsRow}>
        <StatPill label="notes" value="12" />
        <StatPill label="stickers" value="24" />
        <StatPill label="pois" value="8" />
      </View>

      <Pressable
        onPress={onCreateBillboard}
        style={({ pressed }) => [styles.profileAction, pressed && styles.pressed]}
      >
        <Text style={styles.profileActionText}>create billboard</Text>
      </Pressable>

      <Pressable
        disabled={signingOut}
        onPress={handleSignOut}
        style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
      >
        <Text style={styles.signOutText}>{signingOut ? "signing out..." : "log out"}</Text>
      </Pressable>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuestsModalContent() {
  const [levelUp, setLevelUp] = useState<ClaimQuestResponse | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const quests = useQuests();
  const userProgress = useUserProgress();
  const claimQuest = useClaimQuest();

  const handleClaim = (questId: string) => {
    setClaimingId(questId);
    setClaimError(null);
    claimQuest.mutate(questId, {
      onSuccess: (response) => {
        if (response.levelAfter > response.levelBefore) {
          setLevelUp(response);
        }
      },
      onError: (err) => {
        setClaimError(err instanceof ApiError ? err.message : "Could not claim this quest.");
      },
      onSettled: () => {
        setClaimingId(null);
      },
    });
  };

  const levelUpPerks = useMemo<LevelUpPerk[]>(() => {
    if (!levelUp) return [];
    const ids = new Set(levelUp.unlockedPerkIds);
    return (userProgress.data?.unlockedPerks ?? [])
      .filter((entry) => ids.has(entry.levelPerkId))
      .map((entry) => ({
        id: entry.levelPerkId,
        name: entry.perk.name,
        description: entry.perk.description,
      }));
  }, [levelUp, userProgress.data?.unlockedPerks]);

  const dailyQuest = quests.data?.dailyQuest ?? null;
  const levelQuests = quests.data?.levelQuests ?? [];
  const level = quests.data?.level ?? userProgress.data?.level ?? 1;
  const streak = quests.data?.streak ?? userProgress.data?.dailyStreak ?? 0;

  return (
    <View style={styles.questsContent}>
      <View style={styles.streakPill}>
        <Text style={styles.streakValue}>{streak}</Text>
        <Text style={styles.streakLabel}>day streak</Text>
      </View>

      {quests.isLoading ? (
        <Card>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.sageDark} />
            <Text style={styles.emptyText}>Loading quests...</Text>
          </View>
        </Card>
      ) : null}

      {quests.isError ? (
        <Card>
          <Text style={styles.errorText}>
            {(quests.error as Error | undefined)?.message ?? "Could not load quests."}
          </Text>
        </Card>
      ) : null}

      {claimError ? (
        <Card>
          <Text style={styles.errorText}>{claimError}</Text>
        </Card>
      ) : null}

      {!quests.isLoading && !quests.isError ? (
        <>
          <QuestSection title="Daily Quest">
            {dailyQuest ? (
              <>
                <QuestCard
                  isClaiming={claimingId === dailyQuest.id}
                  onClaim={handleClaim}
                  progress={dailyQuest as QuestProgress}
                />
                <NextMilestonePreview currentStreak={streak} />
              </>
            ) : (
              <Card>
                <Text style={styles.emptyText}>No daily quest today. Check back tomorrow!</Text>
              </Card>
            )}
          </QuestSection>

          <QuestSection title={`Level ${level} Quests`}>
            {levelQuests.length > 0 ? (
              levelQuests.map((quest) => (
                <QuestCard
                  isClaiming={claimingId === quest.id}
                  key={quest.id}
                  onClaim={handleClaim}
                  progress={quest as QuestProgress}
                />
              ))
            ) : (
              <Card>
                <Text style={styles.emptyText}>
                  All caught up. New quests will appear after the next rotation.
                </Text>
              </Card>
            )}
            <NextLevelPreview currentLevel={level} />
          </QuestSection>
        </>
      ) : null}

      <LevelUpOverlay
        levelAfter={levelUp?.levelAfter ?? level}
        levelBefore={levelUp?.levelBefore ?? level}
        onDismiss={() => setLevelUp(null)}
        perks={levelUpPerks}
        visible={levelUp !== null}
      />
    </View>
  );
}

function QuestSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.questSection}>
      <Text style={styles.questSectionTitle}>{title}</Text>
      <View style={styles.questSectionBody}>{children}</View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  mapStatus: {
    alignItems: "center",
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderRadius: 999,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: 18,
    top: 18,
    width: 42,
  },
  poiError: {
    alignSelf: "center",
    backgroundColor: "#F6D7CE",
    borderColor: colors.pinRedDark,
    borderRadius: 12,
    borderWidth: 2,
    maxWidth: 360,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: "absolute",
    top: 18,
  },
  poiErrorText: {
    color: colors.pinRedDark,
    fontSize: 16,
    textAlign: "center",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(36, 30, 22, 0.55)",
  },
  modalScroll: {
    maxHeight: "92%",
    width: "100%",
  },
  modalScrollContent: {
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalPanel: {
    backgroundColor: "#F2EAD3",
    borderColor: "#384730",
    borderRadius: 16,
    borderWidth: 3,
    gap: 18,
    maxWidth: 820,
    padding: 18,
    width: "100%",
  },
  hudModalScroll: {
    width: "100%",
  },
  hudModalScrollContent: {
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  studioModalScrollContent: {
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  hudModalPanel: {
    backgroundColor: colors.pageBg,
    borderColor: colors.sageDarker,
    borderRadius: 16,
    borderWidth: 3,
    gap: 16,
    maxWidth: 560,
    padding: 18,
    width: "100%",
  },
  hudModalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hudModalTitle: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 34,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.pageBgSoft,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  closeText: {
    color: colors.sageDark,
    fontSize: 28,
    lineHeight: 28,
  },
  createPanel: {
    alignSelf: "center",
    backgroundColor: colors.pageBg,
    borderColor: colors.sageDarker,
    borderRadius: 16,
    borderWidth: 3,
    gap: 14,
    maxWidth: 460,
    padding: 18,
    width: "90%",
  },
  createHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  createTitle: {
    color: colors.ink,
    fontSize: 26,
  },
  createInput: {
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderRadius: 12,
    borderWidth: 2,
    color: colors.ink,
    fontFamily: "Jersey10_400Regular",
    fontSize: 20,
    minHeight: 140,
    padding: 14,
    textAlignVertical: "top",
  },
  createFooter: {
    gap: 6,
  },
  charCount: {
    alignSelf: "flex-end",
    color: colors.inkSoft,
    fontSize: 14,
  },
  createError: {
    color: colors.pinRedDark,
    fontSize: 16,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
  },
  disabled: {
    opacity: 0.65,
  },
  submitText: {
    color: colors.creamText,
    fontSize: 20,
  },
  profileContent: {
    gap: 16,
  },
  profileHero: {
    alignItems: "center",
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    gap: 16,
    padding: 14,
  },
  profileAvatarFrame: {
    backgroundColor: "#F7E8B0",
    borderColor: colors.sageDark,
    borderRadius: 18,
    borderWidth: 3,
    height: 100,
    overflow: "hidden",
    width: 100,
  },
  profileAvatar: {
    height: "100%",
    width: "100%",
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    color: colors.ink,
    fontFamily: fonts.family,
    fontSize: 28,
  },
  profileMeta: {
    color: colors.inkSoft,
    fontFamily: fonts.family,
    fontSize: 20,
  },
  profileStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statPill: {
    alignItems: "center",
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderRadius: 10,
    borderWidth: 2,
    flex: 1,
    padding: 10,
  },
  statValue: {
    color: colors.sageDark,
    fontFamily: fonts.family,
    fontSize: 28,
  },
  statLabel: {
    color: colors.inkSoft,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  profileAction: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderRadius: 10,
    minHeight: 48,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.78,
  },
  profileActionText: {
    color: colors.creamText,
    fontFamily: fonts.family,
    fontSize: 24,
  },
  signOutButton: {
    alignItems: "center",
    borderColor: colors.pinRedDark,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 44,
  },
  signOutText: {
    color: colors.pinRedDark,
    fontFamily: fonts.family,
    fontSize: 22,
  },
  questsContent: {
    gap: 16,
  },
  streakPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  streakValue: {
    color: colors.pinRed,
    fontFamily: fonts.family,
    fontSize: 28,
  },
  streakLabel: {
    color: colors.inkSoft,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  emptyText: {
    color: colors.inkSoft,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  errorText: {
    color: colors.pinRedDark,
    fontFamily: fonts.family,
    fontSize: 18,
  },
  questSection: {
    gap: 8,
  },
  questSectionTitle: {
    color: colors.sageDark,
    fontFamily: fonts.family,
    fontSize: 26,
  },
  questSectionBody: {
    gap: 12,
  },
});
