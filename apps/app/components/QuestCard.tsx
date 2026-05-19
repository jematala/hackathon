import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, pixelBorder } from "@/app/theme";

type QuestCardProps = {
  title: string;
  description: string;
  progress: number;
  total: number;
  completed: boolean;
};

export function QuestCard({ title, description, progress, total, completed }: QuestCardProps) {
  return (
    <View style={[styles.card, completed && styles.completed]}>
      <View style={styles.header}>
        <Text style={[styles.title, completed && styles.completedText]}>{title}</Text>
        {completed && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </View>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${Math.min((progress / total) * 100, 100)}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {progress}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.parchment,
    borderColor: colors.borderDark,
    borderRadius: 0,
    borderWidth: 2,
    padding: 12,
    gap: 8,
  },
  completed: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: fonts.sizes.md,
    fontWeight: "700",
    fontFamily: fonts.family,
  },
  completedText: {
    color: colors.white,
  },
  checkmark: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    fontFamily: fonts.family,
  },
  progressContainer: {
    height: 4,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontFamily: fonts.family,
    textAlign: "right",
  },
});
