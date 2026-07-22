import { useSSO } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";

import { Button } from "@/components/Button";

import { clerkErrorMessage } from "./clerkError";

export function GoogleButton({ onError }: { onError: (message: string | null) => void }) {
  const { isLoaded, signIn } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const press = async () => {
    if (!isLoaded || pending) {
      return;
    }
    onError(null);
    setPending(true);
    try {
      if (Platform.OS === "web") {
        // ponytail: full-page redirect on web — the popup flow useSSO uses gets
        // blocked because signIn.create() awaits before window.open().
        const origin = window.location.origin;
        await signIn.authenticateWithRedirect({
          redirectUrl: `${origin}/sso-callback`,
          redirectUrlComplete: `${origin}/map`,
          strategy: "oauth_google",
        });
        return; // page navigates away
      }

      const { createdSessionId, setActive } = await startSSOFlow({ strategy: "oauth_google" });
      if (!createdSessionId || !setActive) {
        onError("google sign-in was cancelled");
        return;
      }
      await setActive({ session: createdSessionId });
      router.replace("/(app)/map");
    } catch (err) {
      onError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      disabled={pending}
      label={pending ? "connecting..." : "continue with google"}
      onPress={press}
      variant="sage"
    />
  );
}
