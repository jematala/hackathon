import { useUser } from "@clerk/expo";
import { Screen } from "@/components/Screen";
import { LevelBadge } from "@/components/LevelBadge";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/app/theme";

export default function ProfileScreen() {
  const { user } = useUser();

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{user?.firstName?.charAt(0) ?? "?"}</Text>
        </View>
        <Text style={styles.name}>
          {user?.firstName ?? "User"} {user?.lastName ?? ""}
        </Text>
        <LevelBadge level={1} />
        <Text style={styles.email}>{user?.emailAddresses[0]?.emailAddress}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 32,
  },
  avatarPlaceholder: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 0,
    height: 64,
    justifyContent: "center",
    width: 64,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  avatarText: {
    color: colors.white,
    fontFamily: fonts.family,
    fontSize: 28,
  },
  name: {
    color: colors.text,
    fontFamily: fonts.family,
    fontSize: 24,
    fontWeight: "700",
  },
  email: {
    color: colors.textSecondary,
    fontFamily: fonts.family,
    fontSize: 16,
  },
});
