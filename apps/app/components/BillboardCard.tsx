import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, pixelBorder } from "@/app/theme";

type BillboardCardProps = {
  title: string;
  author: string;
  preview: string;
};

export function BillboardCard({ title, author, preview }: BillboardCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.authorPill}>
          <Text style={styles.authorText}>{author}</Text>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.preview} numberOfLines={2}>
        {preview}
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
  header: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  authorPill: {
    backgroundColor: colors.primary,
    ...pixelBorder,
    borderColor: colors.primaryDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  authorText: {
    color: colors.white,
    fontSize: fonts.sizes.xs,
    fontFamily: fonts.family,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: fonts.sizes.lg,
    fontFamily: fonts.family,
    fontWeight: "700",
  },
  preview: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.md,
    fontFamily: fonts.family,
    lineHeight: 20,
  },
});
