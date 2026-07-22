import { useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { colors } from "@/lib/theme";

export default function SSOCallbackScreen() {
  const { handleRedirectCallback } = useClerk();
  const router = useRouter();

  useEffect(() => {
    // Clerk finishes the OAuth handshake and navigates to redirectUrlComplete.
    handleRedirectCallback({}).catch(() => router.replace("/(auth)/sign-in"));
  }, [handleRedirectCallback, router]);

  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.authSage} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: colors.authCream,
    flex: 1,
    justifyContent: "center",
  },
});
