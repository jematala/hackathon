import { useAuth } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button } from "@/components/Button";
import { colors } from "@/lib/theme";

export default function HomeScreen() {
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const router = useRouter();

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.authSage} size="large" />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(app)/map" />;
  }

  return (
    <AuthScreen>
      <View style={styles.buttons}>
        <Button label="login" onPress={() => router.push("/(auth)/sign-in")} variant="sage" />
        <Button label="register" onPress={() => router.push("/(auth)/sign-up")} variant="sage" />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: colors.authCream,
    flex: 1,
    justifyContent: "center",
  },
  buttons: {
    alignSelf: "center",
    gap: 12,
  },
});
