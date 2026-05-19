import type { BillboardPlacement } from "@repo/shared";
import { useCallback, useState } from "react";
import {
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  LOCAL_AUTHOR_ID,
  LOCAL_AUTHOR_USERNAME,
  LocalBillboardPanel,
  localUuid,
  type LocalBillboard,
} from "@/components/billboard/LocalBillboardPanel";
import { CreateStickerPanel } from "@/components/CreateStickerPanel";
import { Map } from "@/components/map/Map";
import { MapHUD } from "@/components/map/MapHUD";
import { DEMO_BILLBOARD, UNSW_CENTER } from "@/constants/coordinates";
import { colors } from "@/lib/theme";

const EXAMPLE_BILLBOARD: LocalBillboard = {
  id: DEMO_BILLBOARD.id,
  authorId: "00000000-0000-4000-8000-000000000001",
  authorUsername: "admin",
  body: "Welcome to Campus Connect - pin a sticky note or sticker on this whiteboard.",
  lat: DEMO_BILLBOARD.lat,
  lng: DEMO_BILLBOARD.lng,
  expiresAt: hoursFromNowIso(120),
  placements: [
    {
      id: "00000000-0000-4000-8000-000000000c01",
      billboardId: DEMO_BILLBOARD.id,
      authorId: "00000000-0000-4000-8000-000000000011",
      authorUsername: "tess",
      kind: "sticky_note",
      x: 0.68,
      y: 0.62,
      zIndex: 0,
      stickerAsset: null,
      body: "study group @ Basser Steps, 3pm sharp",
      status: "active",
      createdAt: new Date().toISOString(),
    },
  ],
};

export default function MapScreen() {
  const [activeBillboardId, setActiveBillboardId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [body, setBody] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [exampleBillboard, setExampleBillboard] = useState<LocalBillboard>(EXAMPLE_BILLBOARD);
  const [billboards, setBillboards] = useState<LocalBillboard[]>([]);

  const onLayout = useCallback((_event: LayoutChangeEvent) => {}, []);

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

    const id = localUuid();
    setCreateError(null);
    setBillboards((current) => [
      ...current,
      {
        id,
        authorId: LOCAL_AUTHOR_ID,
        authorUsername: LOCAL_AUTHOR_USERNAME,
        body: trimmed,
        lat: UNSW_CENTER.lat,
        lng: UNSW_CENTER.lng,
        expiresAt: hoursFromNowIso(120),
        placements: [],
      },
    ]);
    setBody("");
    setCreateOpen(false);
    setActiveBillboardId(id);
  };

  const addPlacement = (billboardId: string, placement: BillboardPlacement) => {
    if (billboardId === exampleBillboard.id) {
      setExampleBillboard((current) => ({
        ...current,
        placements: [...current.placements, placement],
      }));
      return;
    }

    setBillboards((current) =>
      current.map((billboard) =>
        billboard.id === billboardId
          ? { ...billboard, placements: [...billboard.placements, placement] }
          : billboard,
      ),
    );
  };

  const visibleBillboards = [exampleBillboard, ...billboards];
  const activeBillboard = visibleBillboards.find((billboard) => billboard.id === activeBillboardId);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Map
        billboards={billboards.map((billboard) => ({
          id: billboard.id,
          title: "New whiteboard",
          lat: billboard.lat,
          lng: billboard.lng,
        }))}
        exampleBillboard={{
          id: exampleBillboard.id,
          title: DEMO_BILLBOARD.title,
          lat: exampleBillboard.lat,
          lng: exampleBillboard.lng,
        }}
        onBillboardPress={setActiveBillboardId}
      />
      <MapHUD
        onCreateBillboard={() => setCreateOpen(true)}
        onOpenStudio={() => setStudioOpen(true)}
      />
      <Modal
        visible={activeBillboard !== undefined}
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
              {activeBillboard ? (
                <LocalBillboardPanel
                  billboard={activeBillboard}
                  onAddPlacement={(placement) => addPlacement(activeBillboard.id, placement)}
                  onClose={() => setActiveBillboardId(null)}
                />
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Modal>
      <Modal
        visible={studioOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStudioOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setStudioOpen(false)} />
          <ScrollView
            style={styles.studioScroll}
            contentContainerStyle={styles.studioScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.studioPanel} pointerEvents="box-none">
              <CreateStickerPanel onClose={() => setStudioOpen(false)} />
            </View>
          </ScrollView>
        </View>
      </Modal>
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={closeCreate}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closeCreate} />
          <View style={styles.createPanel}>
            <View style={styles.createHeader}>
              <Text style={styles.createTitle}>New whiteboard</Text>
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
            <Pressable onPress={submitBillboard} style={styles.submitButton}>
              <Text style={styles.submitText}>Pin here</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function hoursFromNowIso(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
  studioScroll: {
    flex: 1,
    width: "100%",
  },
  studioScrollContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    padding: 18,
  },
  studioPanel: {
    maxWidth: 460,
    width: "100%",
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
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.pageBgSoft,
    borderColor: colors.sageDark,
    borderRadius: 999,
    borderWidth: 2,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  closeText: {
    color: colors.sageDark,
    fontSize: 28,
    lineHeight: 28,
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
    borderColor: colors.sageDarker,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
  },
  submitText: {
    color: colors.creamText,
    fontSize: 20,
  },
});
