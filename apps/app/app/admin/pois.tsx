import { router } from "expo-router";
import { ChevronLeft, MapPin, Pencil, Plus, X } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Map from "@/components/map/Map";
import { UNSW_CAMPUS_ID } from "@/constants/coordinates";
import { colors, fonts, pixelBorder } from "@/app/theme";
import { ApiError } from "@/lib/api/client";
import { useCurrentUser, usePois, useUpsertPoi } from "@/lib/api/hooks";

const WEB_NO_OUTLINE = { outlineStyle: "none" } as unknown as { outlineStyle: undefined };

const DEFAULT_RADIUS = "30";

function coord(value: number) {
  return value.toFixed(6);
}

export default function AdminPoisScreen() {
  const currentUser = useCurrentUser();
  const pois = usePois({ campusId: UNSW_CAMPUS_ID });
  const upsertPoi = useUpsertPoi();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [radiusText, setRadiusText] = useState(DEFAULT_RADIUS);
  const [isActive, setIsActive] = useState(true);
  const [latText, setLatText] = useState("");
  const [lngText, setLngText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const draftPin = useMemo(() => {
    const lat = Number.parseFloat(latText);
    const lng = Number.parseFloat(lngText);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, [latText, lngText]);

  const handleMapPress = useCallback((lat: number, lng: number) => {
    setLatText(coord(lat));
    setLngText(coord(lng));
  }, []);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setRadiusText(DEFAULT_RADIUS);
    setIsActive(true);
    setLatText("");
    setLngText("");
    setError(null);
  }, []);

  const startEdit = useCallback(
    (poi: NonNullable<typeof pois.data>[number]) => {
      setEditingId(poi.id);
      setTitle(poi.title);
      setDescription(poi.description ?? "");
      setRadiusText(String(poi.radiusMeters));
      setIsActive(poi.isActive);
      setLatText(coord(poi.lat));
      setLngText(coord(poi.lng));
      setError(null);
    },
    [],
  );

  const submit = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give the POI a title.");
      return;
    }
    if (!draftPin) {
      setError("Tap the map to place the POI, or enter valid coordinates.");
      return;
    }
    const radius = Number.parseInt(radiusText, 10);
    if (!Number.isInteger(radius) || radius <= 0) {
      setError("Radius must be a positive whole number of metres.");
      return;
    }
    setError(null);

    const base = {
      campusId: UNSW_CAMPUS_ID,
      title: trimmed,
      description: description.trim() || undefined,
      lat: draftPin.lat,
      lng: draftPin.lng,
      radiusMeters: radius,
      isActive,
    };

    upsertPoi.mutate(editingId ? { ...base, id: editingId } : base, {
      onSuccess: resetForm,
      onError: (err) => {
        setError(err instanceof ApiError ? err.message : "Could not save this POI.");
      },
    });
  }, [title, draftPin, radiusText, description, isActive, editingId, upsertPoi, resetForm]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/profile" as any);
  };

  const mapPois = useMemo(
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

  // ── Access control ──────────────────────────────
  if (currentUser.isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!currentUser.data?.isAdmin) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.deniedTitle}>Admins only</Text>
        <Text style={styles.deniedBody}>You don’t have access to the POI dashboard.</Text>
        <Pressable onPress={goBack} style={styles.deniedButton}>
          <Text style={styles.deniedButtonText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton} hitSlop={8} accessibilityLabel="Back">
          <ChevronLeft color={colors.white} size={18} />
        </Pressable>
        <Text style={styles.title}>POI Dashboard</Text>
      </View>

      <View style={styles.mapWrap}>
        <Map
          billboards={[]}
          pois={mapPois}
          draftPin={draftPin}
          onMapPress={handleMapPress}
        />
        <View style={styles.mapHint} pointerEvents="none">
          <MapPin color={colors.white} size={13} />
          <Text style={styles.mapHintText}>Tap the map to place the pin</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* ── Editor ─────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{editingId ? "Edit POI" : "New POI"}</Text>

          <Field label="Title">
            <TextInput
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              placeholder="e.g. Main Library"
              placeholderTextColor={colors.textLight}
              style={[styles.input, WEB_NO_OUTLINE]}
            />
          </Field>

          <Field label="Description">
            <TextInput
              value={description}
              onChangeText={setDescription}
              maxLength={1000}
              multiline
              placeholder="Optional details shown to students"
              placeholderTextColor={colors.textLight}
              style={[styles.input, styles.multiline, WEB_NO_OUTLINE]}
            />
          </Field>

          <View style={styles.row}>
            <Field label="Latitude" style={styles.flex1}>
              <TextInput
                value={latText}
                onChangeText={setLatText}
                keyboardType="numbers-and-punctuation"
                placeholder="-33.917"
                placeholderTextColor={colors.textLight}
                style={[styles.input, WEB_NO_OUTLINE]}
              />
            </Field>
            <Field label="Longitude" style={styles.flex1}>
              <TextInput
                value={lngText}
                onChangeText={setLngText}
                keyboardType="numbers-and-punctuation"
                placeholder="151.231"
                placeholderTextColor={colors.textLight}
                style={[styles.input, WEB_NO_OUTLINE]}
              />
            </Field>
          </View>

          <View style={styles.row}>
            <Field label="Radius (m)" style={styles.flex1}>
              <TextInput
                value={radiusText}
                onChangeText={setRadiusText}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor={colors.textLight}
                style={[styles.input, WEB_NO_OUTLINE]}
              />
            </Field>
            <View style={styles.flex1}>
              <Text style={styles.label}>Status</Text>
              <Pressable
                onPress={() => setIsActive((v) => !v)}
                style={[styles.toggle, isActive ? styles.toggleOn : styles.toggleOff]}
              >
                <Text style={[styles.toggleText, isActive && styles.toggleTextOn]}>
                  {isActive ? "Active" : "Inactive"}
                </Text>
              </Pressable>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            {editingId ? (
              <Pressable onPress={resetForm} style={[styles.btn, styles.btnGhost]}>
                <X color={colors.text} size={16} />
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={submit}
              disabled={upsertPoi.isPending}
              style={[styles.btn, styles.btnPrimary, upsertPoi.isPending && styles.btnDisabled]}
            >
              {editingId ? (
                <Pencil color={colors.white} size={16} />
              ) : (
                <Plus color={colors.white} size={16} />
              )}
              <Text style={styles.btnPrimaryText}>
                {upsertPoi.isPending ? "Saving…" : editingId ? "Save changes" : "Create POI"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Existing POIs ──────────────────────── */}
        <Text style={styles.sectionTitle}>
          Existing POIs {pois.data ? `(${pois.data.length})` : ""}
        </Text>

        {pois.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
        ) : (pois.data?.length ?? 0) === 0 ? (
          <Text style={styles.emptyText}>No POIs yet. Tap the map to create one.</Text>
        ) : (
          pois.data!.map((poi) => (
            <View key={poi.id} style={styles.poiRow}>
              <View style={styles.flex1}>
                <Text style={styles.poiTitle} numberOfLines={1}>
                  {poi.title}
                </Text>
                <Text style={styles.poiMeta}>
                  {poi.radiusMeters}m ·{" "}
                  <Text style={poi.isActive ? styles.activeText : styles.inactiveText}>
                    {poi.isActive ? "active" : "inactive"}
                  </Text>
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  upsertPoi.mutate({ id: poi.id, isActive: !poi.isActive })
                }
                disabled={upsertPoi.isPending}
                style={[styles.rowBtn, styles.rowBtnGhost]}
              >
                <Text style={styles.rowBtnGhostText}>
                  {poi.isActive ? "Deactivate" : "Activate"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => startEdit(poi)}
                style={[styles.rowBtn, styles.rowBtnPrimary]}
                accessibilityLabel={`Edit ${poi.title}`}
              >
                <Pencil color={colors.white} size={15} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  centered: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  deniedTitle: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.title,
  },
  deniedBody: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.sm,
    textAlign: "center",
  },
  deniedButton: {
    ...pixelBorder,
    backgroundColor: colors.primary,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  deniedButtonText: {
    color: colors.white,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.title,
  },
  mapWrap: {
    borderColor: colors.borderDark,
    borderBottomWidth: 2,
    borderTopWidth: 2,
    height: 300,
    width: "100%",
  },
  mapHint: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(45,45,45,0.78)",
    borderRadius: 999,
    bottom: 12,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "absolute",
  },
  mapHintText: {
    color: colors.white,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.xs,
  },
  body: {
    gap: 16,
    marginHorizontal: "auto",
    maxWidth: 760,
    padding: 16,
    width: "100%",
  },
  card: {
    ...pixelBorder,
    backgroundColor: colors.card,
    gap: 12,
    padding: 16,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.lg,
  },
  field: {
    gap: 6,
  },
  flex1: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.sm,
    fontWeight: "700",
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 0,
    borderWidth: 2,
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.md,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  multiline: {
    minHeight: 88,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  toggle: {
    alignItems: "center",
    borderRadius: 0,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 44,
  },
  toggleOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  toggleOff: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  toggleText: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.md,
  },
  toggleTextOn: {
    color: colors.white,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.sm,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  btn: {
    ...pixelBorder,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 16,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  btnPrimaryText: {
    color: colors.white,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.md,
  },
  btnGhost: {
    backgroundColor: colors.surface,
  },
  btnGhostText: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.lg,
    marginTop: 4,
  },
  emptyText: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.sm,
  },
  poiRow: {
    ...pixelBorder,
    alignItems: "center",
    backgroundColor: colors.card,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  poiTitle: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.md,
  },
  poiMeta: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.xs,
  },
  activeText: {
    color: colors.primary,
  },
  inactiveText: {
    color: colors.textLight,
  },
  rowBtn: {
    alignItems: "center",
    borderRadius: 0,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 10,
  },
  rowBtnGhost: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  rowBtnGhostText: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.xs,
  },
  rowBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
});
