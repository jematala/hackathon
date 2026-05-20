import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";

type UsernamePillProps = {
  username: string;
  tone?: "sage" | "cream";
};

export function UsernamePill({ username, tone = "sage" }: UsernamePillProps) {
  const isCream = tone === "cream";
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: isCream ? colors.pageBg : colors.sageDark,
          borderColor: isCream ? colors.sage : colors.sageDarker,
        },
      ]}
    >
      <Text style={[styles.text, { color: isCream ? colors.sageDark : colors.creamText }]}>
        @{username}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});
