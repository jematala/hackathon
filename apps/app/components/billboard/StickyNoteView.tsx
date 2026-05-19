import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, paperForAuthor } from "@/lib/theme";

type StickyNoteViewProps = {
  body: string;
  authorId: string;
  size?: number;
  rotationDeg?: number;
  style?: StyleProp<ViewStyle>;
};

export function StickyNoteView({
  body,
  authorId,
  size = 100,
  rotationDeg,
  style,
}: StickyNoteViewProps) {
  const paper = paperForAuthor(authorId);
  const rotation = rotationDeg ?? ((authorId.charCodeAt(0) % 7) - 3) * 1.2;
  return (
    <View
      style={[
        styles.sticky,
        {
          backgroundColor: paper.fill,
          borderColor: paper.edge,
          height: size,
          width: size,
          transform: [{ rotate: `${rotation}deg` }],
        },
        style,
      ]}
    >
      <Text style={styles.text} numberOfLines={6}>
        {body || "…"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sticky: {
    alignItems: "center",
    borderRadius: 2,
    justifyContent: "center",
    padding: 10,
  },
  text: {
    color: colors.ink,
    fontFamily: "Jersey10_400Regular",
    fontSize: 18,
    lineHeight: 20,
    textAlign: "center",
  },
});
