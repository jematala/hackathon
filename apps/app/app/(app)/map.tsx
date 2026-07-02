import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BillboardPanel } from "@/components/billboard/BillboardPanel";
import { CanvasModal } from "@/components/CanvasModal";
import Map from "@/components/map/Map";
import { MapHUD } from "@/components/map/MapHUD";
import { UNSW_CAMPUS_ID, UNSW_CENTER } from "@/constants/coordinates";
import { useUserLocation } from "@/hooks/useUserLocation";
import { ApiError } from "@/lib/api/client";
import { useBillboards, useCreateBillboard, usePois } from "@/lib/api/hooks";
import { colors } from "@/lib/theme";

export default function MapScreen() {
  const mapRef = useRef<{ invalidateSize: () => void }>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [activeBillboardId, setActiveBillboardId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [body, setBody] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const billboards = useBillboards({ campusId: UNSW_CAMPUS_ID });
  const pois = usePois({ campusId: UNSW_CAMPUS_ID });
  const createBillboard = useCreateBillboard();
  const { location, isDenied, canAskAgain, requestPermission } = useUserLocation();

  // Stable references: only rebuild these arrays when the query data actually
  // changes, so the Map's effects don't re-run on every render.
  const billboardMarkers = useMemo(
    () =>
      (billboards.data ?? []).map((billboard) => ({
        id: billboard.id,
        title: billboard.body,
        lat: billboard.lat,
        lng: billboard.lng,
      })),
    [billboards.data],
  );
  const poiMarkers = useMemo(
    () =>
      (pois.data ?? []).map((poi) => ({
        id: poi.id,
        title: poi.title,
        description: poi.description,
        lat: poi.lat,
        lng: poi.lng,
        visited: poi.visited,
      })),
    [pois.data],
  );

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
        lat: UNSW_CENTER.lat,
        lng: UNSW_CENTER.lng,
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

  return (
    <View style={styles.root}>
      <Map
        ref={mapRef}
        location={location}
        billboards={billboardMarkers}
        onBillboardPress={setActiveBillboardId}
        pois={poiMarkers}
      />
      {billboards.isLoading || pois.isLoading ? (
        <View style={styles.mapStatus}>
          <ActivityIndicator color={colors.sageDark} />
        </View>
      ) : null}
      <MapHUD
        onCreateBillboard={() => setCreateOpen(true)}
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
      <CanvasModal visible={isCanvasOpen} onClose={() => setIsCanvasOpen(false)} />
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
  disabled: {
    opacity: 0.65,
  },
  submitText: {
    color: colors.creamText,
    fontSize: 20,
  },
});
