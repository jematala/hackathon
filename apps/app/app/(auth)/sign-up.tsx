import { useAuth } from "@clerk/expo";
import { useSignUp } from "@clerk/expo/legacy";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { clerkErrorMessage } from "@/components/auth/clerkError";
import { FormError } from "@/components/auth/FormError";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { PixelInput } from "@/components/auth/PixelInput";
import { Button } from "@/components/Button";

export default function SignUpScreen() {
  const { isLoaded, setActive, signUp } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const passwordsMismatch = passwordAgain.length > 0 && password !== passwordAgain;

  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Redirect href="/(app)/map" />;
  }

  const submit = async () => {
    if (!isLoaded || pending) {
      return;
    }
    setError(null);
    if (password !== passwordAgain) {
      setError("passwords don't match");
      return;
    }
    setPending(true);
    try {
      const attempt = await signUp.create({
        emailAddress: email.trim(),
        password,
        username: username.trim(),
      });
      if (attempt.status === "complete") {
        // Clerk instance has verification disabled — straight in.
        await setActive({ session: attempt.createdSessionId });
        router.replace("/(app)/map");
        return;
      }
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      router.push("/(auth)/verify" as any);
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
        inputMode="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="email..."
        value={email}
      />
      <PixelInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setUsername}
        placeholder="username..."
        value={username}
      />
      <PixelInput
        onChangeText={setPassword}
        placeholder="password..."
        secureTextEntry
        value={password}
      />
      <PixelInput
        hasError={passwordsMismatch}
        onChangeText={setPasswordAgain}
        onSubmitEditing={submit}
        placeholder="password again..."
        secureTextEntry
        value={passwordAgain}
      />
      <View style={styles.submit}>
        <Button
          disabled={pending}
          label={pending ? "registering..." : "register"}
          onPress={submit}
          variant="sage"
        />
        <GoogleButton onError={setError} />
      </View>
      <FormError message={error} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  submit: {
    alignSelf: "center",
    gap: 12,
    marginTop: 8,
  },
});
