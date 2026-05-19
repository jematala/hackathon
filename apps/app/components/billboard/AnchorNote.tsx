import { StyleSheet, Text, View } from "react-native";

import { colors, paperForAuthor, pinForAuthor } from "@/lib/theme";

import { FlowerPin } from "./FlowerPin";

const PIN_SIZE = 22;
const PIN_OVERLAP = 8;

type AnchorNoteProps = {
  body: string;
  authorId: string;
  authorUsername: string;
  width: number;
  height: number;
  rotationDeg?: number;
};

export function AnchorNote({
  body,
  authorId,
  authorUsername,
  width,
  height,
  rotationDeg,
}: AnchorNoteProps) {
  const paper = paperForAuthor(authorId);
  const pin = pinForAuthor(authorId);
  const rotation = rotationDeg ?? -2;

  return (
    <View
      style={[
        styles.host,
        {
          width,
          height,
          transform: [{ rotate: `${rotation}deg` }],
        },
      ]}
    >
      <View
        style={[
          styles.paper,
          {
            backgroundColor: paper.fill,
            borderColor: paper.edge,
          },
        ]}
      >
        <Text style={styles.body}>{body}</Text>
        <View style={styles.signRow}>
          <Text style={styles.dash}>—</Text>
          <Text style={styles.signature}>@{authorUsername}</Text>
        </View>
      </View>
      <View pointerEvents="none" style={styles.pin}>
        <FlowerPin fill={pin.fill} accent={pin.accent} size={PIN_SIZE} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: "center",
  },
  paper: {
    borderRadius: 3,
    flex: 1,
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: "100%",
  },
  body: {
    color: colors.ink,
    flex: 1,
    fontSize: 19,
    lineHeight: 22,
  },
  signRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  dash: {
    color: colors.inkSoft,
    fontSize: 16,
  },
  signature: {
    color: colors.inkSoft,
    fontSize: 15,
  },
  pin: {
    left: "50%",
    marginLeft: -PIN_SIZE / 2,
    position: "absolute",
    top: -PIN_OVERLAP,
  },
});
