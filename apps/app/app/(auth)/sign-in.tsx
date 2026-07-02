import { useAuth } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { clerkErrorMessage } from "@/components/auth/clerkError";
import { FormError } from "@/components/auth/FormError";
import { PixelInput } from "@/components/auth/PixelInput";
import { Button } from "@/components/Button";

export default function SignInScreen() {
  const { isLoaded, setActive, signIn } = useSignIn();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Redirect href="/(app)/map" />;
  }

  const submit = async () => {
    if (!isLoaded || pending) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      const attempt = await signIn.create({ identifier: username.trim(), password });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/(app)/map");
      } else {
        setError("something went wrong — try again");
      }
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthScreen>
      <PixelInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setUsername}
        placeholder="username..."
        value={username}
      />
      <PixelInput
        onChangeText={setPassword}
        onSubmitEditing={submit}
        placeholder="password..."
        secureTextEntry
        value={password}
      />
      <View style={styles.submit}>
        <Button
          disabled={pending}
          label={pending ? "logging in..." : "login"}
          onPress={submit}
          variant="sage"
        />
      </View>
      <FormError message={error} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  submit: {
    alignSelf: "center",
    marginTop: 8,
  },
});
