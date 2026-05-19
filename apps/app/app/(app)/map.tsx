import { useCallback, useRef, useState } from "react";
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

import { Map } from "@/components/map/Map";
import { MapHUD } from "@/components/map/MapHUD";
import { DEMO_BILLBOARD, UNSW_CENTER } from "@/constants/coordinates";
import { colors } from "@/lib/theme";

type PlaceholderBillboard = {
  id: string;
  title: string;
  body: string;
  authorUsername: string;
  lat: number;
  lng: number;
};

const EXAMPLE_BILLBOARD: PlaceholderBillboard = {
  id: DEMO_BILLBOARD.id,
  title: DEMO_BILLBOARD.title,
  body: "Welcome to Campus Connect - pin a sticky note or sticker on this whiteboard.",
  authorUsername: "admin",
  lat: DEMO_BILLBOARD.lat,
  lng: DEMO_BILLBOARD.lng,
};

export default function MapScreen() {
  const mapRef = useRef<{ invalidateSize: () => void }>(null);
  const [activeBillboardId, setActiveBillboardId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [body, setBody] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [billboards, setBillboards] = useState<PlaceholderBillboard[]>([]);

  const onLayout = useCallback((_event: LayoutChangeEvent) => {
    mapRef.current?.invalidateSize();
  }, []);

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
    const id = `placeholder-${Date.now()}`;
    setBillboards((current) => [
      ...current,
      {
        id,
        title: "New whiteboard",
        body: trimmed,
        authorUsername: "bluewren",
        lat: UNSW_CENTER.lat,
        lng: UNSW_CENTER.lng,
      },
    ]);
    setBody("");
    setCreateOpen(false);
    setActiveBillboardId(id);
  };

  const visibleBillboards = [EXAMPLE_BILLBOARD, ...billboards];
  const activeBillboard = visibleBillboards.find((billboard) => billboard.id === activeBillboardId);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Map
        ref={mapRef}
        billboards={billboards}
        exampleBillboard={EXAMPLE_BILLBOARD}
        onBillboardPress={setActiveBillboardId}
      />
      <MapHUD onCreateBillboard={() => setCreateOpen(true)} />
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
                <PlaceholderBillboardPanel
                  billboard={activeBillboard}
                  onClose={() => setActiveBillboardId(null)}
                />
              ) : null}
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

function PlaceholderBillboardPanel({
  billboard,
  onClose,
}: {
  billboard: PlaceholderBillboard;
  onClose: () => void;
}) {
  return (
    <>
      <View style={styles.placeholderHeader}>
        <Text style={styles.authorPill}>@{billboard.authorUsername}</Text>
        <Pressable
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={8}
          accessibilityLabel="Close billboard"
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>
      <View style={styles.placeholderFrame}>
        <View style={styles.placeholderBoard}>
          <View style={styles.placeholderNote}>
            <Text style={styles.placeholderBody}>{billboard.body}</Text>
            <Text style={styles.placeholderAuthor}>- @{billboard.authorUsername}</Text>
          </View>
        </View>
      </View>
      <Pressable style={styles.placeholderAddButton}>
        <Text style={styles.placeholderAddText}>+ Add a note</Text>
      </Pressable>
    </>
  );
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
  placeholderHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  authorPill: {
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDarker,
    borderRadius: 999,
    borderWidth: 2,
    color: colors.creamText,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  placeholderFrame: {
    backgroundColor: colors.sage,
    borderColor: colors.sageDarker,
    borderRadius: 14,
    borderWidth: 3,
    padding: 10,
  },
  placeholderBoard: {
    alignItems: "center",
    backgroundColor: colors.cork,
    borderColor: colors.corkEdge,
    borderRadius: 8,
    borderWidth: 2,
    height: 420,
    justifyContent: "flex-start",
    paddingTop: 36,
  },
  placeholderNote: {
    backgroundColor: colors.paperCream,
    borderColor: colors.paperEdge,
    borderRadius: 4,
    borderWidth: 2,
    minHeight: 130,
    padding: 18,
    transform: [{ rotate: "-2deg" }],
    width: 230,
  },
  placeholderBody: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 25,
  },
  placeholderAuthor: {
    color: colors.inkSoft,
    fontSize: 14,
    marginTop: 28,
  },
  placeholderAddButton: {
    alignItems: "center",
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDarker,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 48,
    justifyContent: "center",
  },
  placeholderAddText: {
    color: colors.creamText,
    fontSize: 20,
  },
});
