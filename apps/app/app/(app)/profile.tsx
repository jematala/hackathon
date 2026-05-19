import type { UserSignature } from "@repo/shared";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { equipSignature, fetchMySignatures } from "@/lib/api";

type State =
  | { kind: "loading" }
  | { kind: "ready"; featureUnlocked: boolean; signatures: UserSignature[] }
  | { kind: "error"; message: string };

export default function ProfileScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [equipping, setEquipping] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchMySignatures();
      setState({
        kind: "ready",
        featureUnlocked: data.signatureFeatureUnlocked,
        signatures: data.unlocked,
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to load signatures",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleEquip = useCallback(
    async (id: string | null) => {
      setEquipping(id ?? "none");
      try {
        await equipSignature({ signatureId: id });
        await load();
      } finally {
        setEquipping(null);
      }
    },
    [load],
  );

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>

      {state.kind === "loading" ? (
        <Text style={styles.subtitle}>Loading…</Text>
      ) : state.kind === "error" ? (
        <Card>
          <Text style={styles.error}>{state.message}</Text>
        </Card>
      ) : !state.featureUnlocked ? (
        <Card>
          <Text style={styles.subtitle}>
            Reach level 4 to equip your earned signatures. You have {state.signatures.length}{" "}
            signature
            {state.signatures.length === 1 ? "" : "s"} banked.
          </Text>
        </Card>
      ) : state.signatures.length === 0 ? (
        <Card>
          <Text style={styles.subtitle}>
            No signatures yet — keep your daily streak alive to unlock them at days 3, 7, and 30.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          <Text style={styles.subtitle}>Signature</Text>
          <Pressable
            disabled={equipping !== null}
            onPress={() => handleEquip(null)}
            style={styles.row}
          >
            <View style={styles.swatchEmpty} />
            <Text style={styles.rowLabel}>None</Text>
          </Pressable>
          {state.signatures.map((entry) => (
            <Pressable
              disabled={equipping !== null}
              key={entry.signature.id}
              onPress={() => handleEquip(entry.signature.id)}
              style={[styles.row, entry.isEquipped && styles.rowEquipped]}
            >
              <Image source={{ uri: entry.signature.assetBase64 }} style={styles.swatch} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{entry.signature.name}</Text>
                <Text style={styles.rowSub}>
                  Day {entry.signature.streakDayRequired} {entry.isEquipped ? "· equipped" : ""}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#6A401A",
    fontFamily: "Jersey10",
    fontSize: 34,
  },
  subtitle: {
    color: "#71730E",
    fontFamily: "Jersey10",
    fontSize: 18,
  },
  error: {
    color: "#A14640",
    fontFamily: "Jersey10",
    fontSize: 18,
  },
  list: {
    gap: 8,
    marginTop: 12,
  },
  row: {
    alignItems: "center",
    backgroundColor: "#FFF5E6",
    borderColor: "#B17833",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 10,
  },
  rowEquipped: {
    backgroundColor: "#E9D8B5",
    borderWidth: 2,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: "#6A401A",
    fontFamily: "Jersey10",
    fontSize: 22,
  },
  rowSub: {
    color: "#8B7340",
    fontFamily: "Jersey10",
    fontSize: 14,
  },
  swatch: {
    backgroundColor: "#FFFFFF",
    borderColor: "#B17833",
    borderRadius: 4,
    borderWidth: 1,
    height: 32,
    width: 32,
  },
  swatchEmpty: {
    backgroundColor: "transparent",
    borderColor: "#B17833",
    borderRadius: 4,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 32,
    width: 32,
  },
});
