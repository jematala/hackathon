import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/app/theme";

export type LevelUpPerk = {
  id: string;
  name: string;
  description: string;
};

type LevelUpOverlayProps = {
  visible: boolean;
  levelBefore: number;
  levelAfter: number;
  perks: LevelUpPerk[];
  onDismiss: () => void;
};

export function LevelUpOverlay({
  visible,
  levelBefore,
  levelAfter,
  perks,
  onDismiss,
}: LevelUpOverlayProps) {
  return (
    <Modal animationType="fade" onRequestClose={onDismiss} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Level Up!</Text>
          <Text style={styles.transition}>
            Lv {levelBefore} → Lv {levelAfter}
          </Text>
          {perks.length > 0 ? (
            <ScrollView
              contentContainerStyle={styles.perkList}
              showsVerticalScrollIndicator={false}
              style={styles.perkScroll}
            >
              <Text style={styles.sectionHeading}>Unlocked perks</Text>
              {perks.map((perk) => (
                <View key={perk.id} style={styles.perkRow}>
                  <Text style={styles.perkName}>{perk.name}</Text>
                  <Text style={styles.perkDescription}>{perk.description}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyPerks}>Keep questing to unlock new perks.</Text>
          )}
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.continueButton, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.continueLabel}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(46, 30, 12, 0.6)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFF5E6",
    borderColor: "#B17833",
    borderRadius: 12,
    borderWidth: 3,
    gap: 14,
    maxWidth: 420,
    padding: 24,
    width: "100%",
  },
  title: {
    color: "#6A401A",
    fontFamily: fonts.family,
    fontSize: 42,
    textAlign: "center",
  },
  transition: {
    color: "#4A90D9",
    fontFamily: fonts.family,
    fontSize: 30,
    textAlign: "center",
  },
  sectionHeading: {
    color: "#5b7559",
    fontFamily: fonts.family,
    fontSize: 22,
    marginBottom: 4,
  },
  perkScroll: {
    maxHeight: 240,
  },
  perkList: {
    gap: 10,
    paddingBottom: 4,
  },
  perkRow: {
    backgroundColor: "#FEEED5",
    borderColor: "#E1C28D",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  perkName: {
    color: "#6A401A",
    fontFamily: fonts.family,
    fontSize: 20,
  },
  perkDescription: {
    color: "#71730E",
    fontFamily: fonts.family,
    fontSize: 16,
  },
  emptyPerks: {
    color: "#8B7340",
    fontFamily: fonts.family,
    fontSize: 18,
    textAlign: "center",
  },
  continueButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#5b7559",
    borderRadius: 8,
    marginTop: 4,
    paddingHorizontal: 28,
    paddingVertical: 8,
  },
  continueLabel: {
    color: "#ffedd6",
    fontFamily: fonts.family,
    fontSize: 26,
  },
});
