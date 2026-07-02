import { useSignUp } from "@clerk/expo/legacy";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { fonts } from "@/app/theme";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { clerkErrorMessage } from "@/components/auth/clerkError";
import { FormError } from "@/components/auth/FormError";
import { PixelInput } from "@/components/auth/PixelInput";
import { Button } from "@/components/Button";
import { colors } from "@/lib/theme";

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyScreen() {
  const { isLoaded, setActive, signUp } = useSignUp();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (isLoaded && !signUp?.emailAddress) {
    // No sign-up in flight (deep link / refresh) — back to the landing.
    return <Redirect href="/" />;
  }

  const submit = async (value: string) => {
    if (!isLoaded || pending || value.length !== 6) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: value });
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

  const onChangeCode = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) {
      void submit(digits);
    }
  };

  const resend = async () => {
    if (!isLoaded || cooldown > 0) {
      return;
    }
    setError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(clerkErrorMessage(err));
    }
  };

  return (
    <AuthScreen>
      <Text style={styles.prompt}>we emailed a code to {signUp?.emailAddress}</Text>
      <PixelInput
        autoComplete="one-time-code"
        inputMode="numeric"
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={onChangeCode}
        placeholder="code..."
        style={styles.code}
        value={code}
      />
      <View style={styles.submit}>
        <Button
          disabled={pending}
          label={pending ? "verifying..." : "verify"}
          onPress={() => submit(code)}
          variant="sage"
        />
      </View>
      <Text onPress={resend} style={styles.resend} suppressHighlighting>
        {cooldown > 0 ? `sent! (${cooldown})` : "resend code"}
      </Text>
      <FormError message={error} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  prompt: {
    color: colors.authSage,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.sm,
    marginBottom: 16,
    textAlign: "center",
  },
  code: {
    letterSpacing: 8,
  },
  submit: {
    alignSelf: "center",
    marginTop: 8,
  },
  resend: {
    color: colors.authSage,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.sm,
    marginTop: 16,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
