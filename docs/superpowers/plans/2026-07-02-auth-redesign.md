# Auth Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Jematala's pre-auth surfaces with four custom pixel-art screens (landing, login, register, 6-digit verify) matching the approved mocks, driven by Clerk's `useSignIn`/`useSignUp` hooks.

**Architecture:** One cross-platform React Native implementation (native + web via React Native Web) under Expo Router. Shared chrome (`AuthScreen` = cream background + wordmark + paw scatter) wraps per-screen form content. The landing renders inside `app/index.tsx` (route groups add no URL segment, so a `(auth)/index.tsx` would collide at `/`). All platform-split auth files and Clerk prebuilt UI are deleted.

**Tech Stack:** Expo ~54, React Native 0.81, Expo Router ~6 (typed routes), `@clerk/expo` hooks, `StyleSheet.create` styling, Jersey 10 font (already global).

**Spec:** `docs/superpowers/specs/2026-07-02-auth-redesign-design.md`

## Global Constraints

- Colors (exact, from spec): `authCream #FDEDD4`, `authSage #5A7258`, `authSageDark #4A5F49`, `authError #C0392B`. Tokens live in `apps/app/lib/theme.ts`; no hex literals in components.
- All copy is lowercase pixel-style: `jematala`, `login`, `register`, `verify`, `resend code`, placeholders `username...`, `password...`, `email...`, `password again...`, `code...`.
- Font: Jersey 10 via `fonts.family` from `@/app/theme` (never a raw font-family string).
- No new dependencies. Plain RN `Image` for the paw (NOT expo-image).
- Wordmark: rendered text, 52px, thick 4px underline via border, `authSage`.
- The repo has **no test runner**. Verification per task = `bun run typecheck:app` (run from the repo root `/home/markq/Projects/hackathon`) plus the manual checks written into the task. Final gate = `bun run check` + the manual flow in Task 9.
- All `bun` commands in this plan run from the repo root.
- Commit after every task.
- **Human prerequisite (not a code task):** the Clerk instance must have the *username* attribute enabled (login is by username) and email required at sign-up. Verify in the Clerk dashboard before Task 6; if missing, enable it there. No code change involved.

---

### Task 1: Auth color tokens + paw asset

**Files:**
- Modify: `apps/app/lib/theme.ts` (colors object, after the `creamText` entry at ~line 31)
- Create: `apps/app/assets/images/paw.png` (copied binary)

**Interfaces:**
- Produces: `colors.authCream`, `colors.authSage`, `colors.authSageDark`, `colors.authError` exported from `apps/app/lib/theme.ts` — every later task imports these via `import { colors } from "@/lib/theme"`.

- [ ] **Step 1: Add the four tokens to the colors object**

In `apps/app/lib/theme.ts`, inside `export const colors = { ... } as const`, insert after the `creamText: "#F2EAD3",` line:

```ts
  // Auth screens (landing / login / register / verify) — sampled from mocks
  authCream: "#FDEDD4",
  authSage: "#5A7258",
  authSageDark: "#4A5F49",
  authError: "#C0392B",
```

- [ ] **Step 2: Copy the paw sprite into assets**

```bash
cp "/mnt/c/Users/quach/Downloads/a0adfbdb6954b9bb74e1ac82b1d67bcecf2c8aaf.png" \
   /home/markq/Projects/hackathon/apps/app/assets/images/paw.png
```

Verify: `file apps/app/assets/images/paw.png` → `PNG image data, 32 x 32, 8-bit/color RGBA`. (If the Downloads file has moved, ask the user for the paw PNG — do not substitute another asset.)

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck:app`
Expected: exit 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/app/lib/theme.ts apps/app/assets/images/paw.png
git commit -m "feat(app): add auth theme tokens and paw sprite"
```

---

### Task 2: `sage` Button variant

**Files:**
- Modify: `apps/app/components/Button.tsx` (whole file shown below)

**Interfaces:**
- Consumes: `colors.authSage/authSageDark/authCream` from Task 1.
- Produces: `<Button label="login" variant="sage" onPress={...} disabled={...} />` — sage fill, cream label, 6px radius, min width 140, pressed/hovered → `authSageDark`. Existing `primary`/`subtle` variants must be visually unchanged (used by other screens).

- [ ] **Step 1: Replace `apps/app/components/Button.tsx` with:**

```tsx
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts } from "@/app/theme";
import { colors as authColors } from "@/lib/theme";

type ButtonVariant = "primary" | "subtle" | "sage";

type ButtonProps = {
  label: string;
  variant?: ButtonVariant;
} & ComponentProps<typeof Pressable>;

export function Button({ label, style, variant = "primary", ...props }: ButtonProps) {
  const isSubtle = variant === "subtle";
  const isSage = variant === "sage";
  return (
    <Pressable
      style={(state) => {
        // hovered exists on react-native-web only; RN core types omit it
        const { hovered, pressed } = state as { pressed: boolean; hovered?: boolean };
        return [
          styles.button,
          isSage ? styles.sage : isSubtle ? styles.subtle : styles.primary,
          isSage && (pressed || hovered) ? styles.sageActive : null,
          !isSage && pressed ? styles.pressed : null,
          typeof style === "function" ? style(state) : style,
        ];
      }}
      {...props}
    >
      <Text
        style={[
          styles.label,
          isSage ? styles.labelSage : isSubtle ? styles.labelSubtle : styles.labelPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 0,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  subtle: {
    backgroundColor: colors.card,
    borderColor: colors.primaryDark,
  },
  sage: {
    backgroundColor: authColors.authSage,
    borderColor: authColors.authSage,
    borderRadius: 6,
    minWidth: 140,
  },
  sageActive: {
    backgroundColor: authColors.authSageDark,
    borderColor: authColors.authSageDark,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    fontFamily: fonts.family,
    fontSize: fonts.sizes.md,
    fontWeight: "700",
  },
  labelPrimary: {
    color: colors.white,
  },
  labelSubtle: {
    color: colors.primaryDark,
  },
  labelSage: {
    color: authColors.authCream,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck:app`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/app/components/Button.tsx
git commit -m "feat(app): add sage button variant for auth screens"
```

---

### Task 3: Auth chrome — `PawScatter` + `AuthScreen`

**Files:**
- Create: `apps/app/components/auth/PawScatter.tsx`
- Create: `apps/app/components/auth/AuthScreen.tsx`

**Interfaces:**
- Consumes: `colors.authCream/authSage` (Task 1), `fonts` from `@/app/theme`, `assets/images/paw.png` (Task 1).
- Produces: `<AuthScreen>{formContent}</AuthScreen>` — renders cream full-bleed background, safe area, paw scatter, centered 380px-max column with the `jematala` wordmark on top and `children` beneath. `<PawScatter />` is internal to it (but exported for reuse).

- [ ] **Step 1: Create `apps/app/components/auth/PawScatter.tsx`:**

```tsx
import type { DimensionValue, ImageStyle } from "react-native";
import { Image, Platform, StyleSheet, View } from "react-native";

const PAW = require("../../assets/images/paw.png");

type PawSpot = {
  left: DimensionValue;
  bottom: number;
  size: number;
  rotate: string;
};

// Fixed layout (deterministic — no per-render randomness), lower third of the
// screen, arrangement matched to the mock.
const LAYOUT: PawSpot[] = [
  { left: "6%", bottom: 28, size: 48, rotate: "-18deg" },
  { left: "28%", bottom: 8, size: 56, rotate: "8deg" },
  { left: "34%", bottom: 108, size: 44, rotate: "-6deg" },
  { left: "56%", bottom: 62, size: 40, rotate: "16deg" },
  { left: "64%", bottom: 172, size: 52, rotate: "-10deg" },
  { left: "82%", bottom: 124, size: 48, rotate: "12deg" },
  { left: "88%", bottom: 14, size: 44, rotate: "-4deg" },
];

// react-native-web passes this through to the DOM; keeps the pixel art crisp
const pixelated =
  Platform.OS === "web" ? ({ imageRendering: "pixelated" } as unknown as ImageStyle) : null;

export function PawScatter() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {LAYOUT.map((paw, index) => (
        <Image
          key={index}
          source={PAW}
          style={[
            styles.paw,
            pixelated,
            {
              bottom: paw.bottom,
              height: paw.size,
              left: paw.left,
              transform: [{ rotate: paw.rotate }],
              width: paw.size,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  paw: {
    opacity: 0.45,
    position: "absolute",
  },
});
```

- [ ] **Step 2: Create `apps/app/components/auth/AuthScreen.tsx`:**

```tsx
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fonts } from "@/app/theme";
import { colors } from "@/lib/theme";

import { PawScatter } from "./PawScatter";

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen}>
      <PawScatter />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <View style={styles.column}>
          <View style={styles.wordmarkWrap}>
            <Text style={styles.wordmark}>jematala</Text>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.authCream,
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  column: {
    alignSelf: "center",
    flex: 1,
    justifyContent: "center",
    maxWidth: 380,
    paddingBottom: 96,
    paddingHorizontal: 24,
    width: "100%",
  },
  wordmarkWrap: {
    alignSelf: "center",
    borderBottomWidth: 4,
    borderColor: colors.authSage,
    marginBottom: 40,
    paddingBottom: 2,
  },
  wordmark: {
    color: colors.authSage,
    fontFamily: fonts.family,
    fontSize: 52,
    lineHeight: 52,
  },
});
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck:app`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/app/components/auth/PawScatter.tsx apps/app/components/auth/AuthScreen.tsx
git commit -m "feat(app): add AuthScreen chrome with wordmark and paw scatter"
```

---

### Task 4: Form primitives — `PixelInput`, `FormError`, `clerkError`

**Files:**
- Create: `apps/app/components/auth/PixelInput.tsx`
- Create: `apps/app/components/auth/FormError.tsx`
- Create: `apps/app/components/auth/clerkError.ts`

**Interfaces:**
- Consumes: `colors.authCream/authSage/authError` (Task 1), `fonts` from `@/app/theme`.
- Produces:
  - `<PixelInput placeholder="username..." value={v} onChangeText={f} hasError={bool} ... />` — accepts every `TextInput` prop plus `hasError?: boolean`.
  - `<FormError message={string | null} />` — renders nothing when message is null.
  - `clerkErrorMessage(err: unknown): string` — extracts `errors[0].longMessage ?? errors[0].message`, falls back to `"something went wrong — try again"`.

- [ ] **Step 1: Create `apps/app/components/auth/PixelInput.tsx`:**

```tsx
import type { ComponentProps } from "react";
import { StyleSheet, TextInput } from "react-native";

import { fonts } from "@/app/theme";
import { colors } from "@/lib/theme";

type PixelInputProps = {
  hasError?: boolean;
} & ComponentProps<typeof TextInput>;

export function PixelInput({ hasError = false, style, ...props }: PixelInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.authSage}
      style={[styles.input, hasError ? styles.error : null, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.authCream,
    borderColor: colors.authSage,
    borderRadius: 8,
    borderWidth: 2,
    color: colors.authSage,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.md,
    height: 48,
    marginBottom: 12,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  error: {
    borderColor: colors.authError,
  },
});
```

- [ ] **Step 2: Create `apps/app/components/auth/FormError.tsx`:**

```tsx
import { StyleSheet, Text } from "react-native";

import { fonts } from "@/app/theme";
import { colors } from "@/lib/theme";

export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return <Text style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.authError,
    fontFamily: fonts.family,
    fontSize: fonts.sizes.sm,
    marginTop: 8,
    textAlign: "center",
  },
});
```

- [ ] **Step 3: Create `apps/app/components/auth/clerkError.ts`:**

```ts
type ClerkErrorShape = {
  errors?: { longMessage?: string; message?: string }[];
};

export function clerkErrorMessage(err: unknown): string {
  const first = (err as ClerkErrorShape)?.errors?.[0];
  return first?.longMessage ?? first?.message ?? "something went wrong — try again";
}
```

- [ ] **Step 4: Typecheck**

Run: `bun run typecheck:app`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/app/components/auth/PixelInput.tsx apps/app/components/auth/FormError.tsx apps/app/components/auth/clerkError.ts
git commit -m "feat(app): add auth form primitives (PixelInput, FormError, clerkError)"
```

---

### Task 5: Landing screen in `app/index.tsx`

**Files:**
- Modify: `apps/app/app/index.tsx` (whole file shown below)

**Interfaces:**
- Consumes: `AuthScreen` (Task 3), `Button` `variant="sage"` (Task 2), `colors.authCream/authSage` (Task 1).
- Produces: `/` renders the landing when signed out; keeps the existing signed-in redirect to `/(app)/map` and the loading state.

- [ ] **Step 1: Replace `apps/app/app/index.tsx` with:**

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck:app`
Expected: exit 0.

- [ ] **Step 3: Manual verify (web)**

Run: `bun run dev`, press `w` (or open the printed localhost URL) while signed out.
Expected: cream page, underlined `jematala` wordmark, stacked `login`/`register` sage buttons, 7 muted paw prints across the lower third. Hovering a button darkens it. Clicking `login` navigates to the (still old) sign-in page.

- [ ] **Step 4: Commit**

```bash
git add apps/app/app/index.tsx
git commit -m "feat(app): render pixel-art landing screen for signed-out users"
```

---

### Task 6: Custom login screen

**Files:**
- Modify: `apps/app/app/(auth)/sign-in.tsx` (whole file shown below — currently a one-line re-export)
- Delete: `apps/app/app/(auth)/sign-in.web.tsx`, `apps/app/app/(auth)/sign-in.native.tsx`

**Interfaces:**
- Consumes: `AuthScreen`, `PixelInput`, `FormError`, `clerkErrorMessage`, `Button variant="sage"`; Clerk `useSignIn`.
- Produces: `/sign-in` route — username + password + `login` submit button. On success: `setActive` then `router.replace("/(app)/map")`.

- [ ] **Step 1: Replace `apps/app/app/(auth)/sign-in.tsx` with:**

```tsx
import { useSignIn } from "@clerk/expo";
import { useRouter } from "expo-router";
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
```

- [ ] **Step 2: Delete the platform splits**

```bash
git rm apps/app/app/"(auth)"/sign-in.web.tsx apps/app/app/"(auth)"/sign-in.native.tsx
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck:app`
Expected: exit 0.

- [ ] **Step 4: Manual verify (web)**

With the dev server running, go landing → `login`.
Expected: wordmark + `username...`/`password...` inputs + `login` button in the mock's style. Submitting a wrong password shows a red error line under the form. Logging in with a valid username+password account lands on the map. (If the Clerk instance rejects username identifiers, stop and flag the Clerk dashboard prerequisite from Global Constraints.)

- [ ] **Step 5: Commit**

```bash
git add apps/app/app/"(auth)"/sign-in.tsx
git commit -m "feat(app): replace Clerk prebuilt sign-in with custom pixel login screen"
```

---

### Task 7: Custom register screen

**Files:**
- Modify: `apps/app/app/(auth)/sign-up.tsx` (whole file shown below — currently a one-line re-export, which mistakenly points at `sign-in.web`)
- Delete: `apps/app/app/(auth)/sign-up.web.tsx`, `apps/app/app/(auth)/sign-up.native.tsx`

**Interfaces:**
- Consumes: same primitives as Task 6; Clerk `useSignUp`.
- Produces: `/sign-up` route — email + username + password + password again + `register` submit button. On success: `prepareEmailAddressVerification` then `router.push("/(auth)/verify")` (Task 8 creates that route; until then the push 404s — noted in verify step).

- [ ] **Step 1: Replace `apps/app/app/(auth)/sign-up.tsx` with:**

```tsx
import { useSignUp } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { clerkErrorMessage } from "@/components/auth/clerkError";
import { FormError } from "@/components/auth/FormError";
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
      router.push("/(auth)/verify");
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
```

- [ ] **Step 2: Delete the platform splits**

```bash
git rm apps/app/app/"(auth)"/sign-up.web.tsx apps/app/app/"(auth)"/sign-up.native.tsx
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck:app`
Expected: exit 0.

- [ ] **Step 4: Manual verify (web)**

Landing → `register`. Expected: the four inputs + `register` button; mismatched passwords turn the confirm input's border red and submitting shows "passwords don't match" without any network call. Do NOT complete a real registration yet — the verify route doesn't exist until Task 8.

- [ ] **Step 5: Commit**

```bash
git add apps/app/app/"(auth)"/sign-up.tsx
git commit -m "feat(app): replace Clerk prebuilt sign-up with custom pixel register screen"
```

---

### Task 8: Verify screen (6-digit code)

**Files:**
- Create: `apps/app/app/(auth)/verify.tsx`
- Modify: `apps/app/app/_layout.tsx:100-101` (add one `Stack.Screen` line beside the existing auth entries)

**Interfaces:**
- Consumes: same primitives; the in-flight `signUp` resumed via `useSignUp` (Clerk client holds it across navigation from Task 7's `router.push("/(auth)/verify")`).
- Produces: `/verify` route. Redirects to `/` if no sign-up is in flight. On successful code: `setActive` → `/(app)/map`.

- [ ] **Step 1: Create `apps/app/app/(auth)/verify.tsx`:**

```tsx
import { useSignUp } from "@clerk/expo";
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
```

- [ ] **Step 2: Register the route in the root stack**

In `apps/app/app/_layout.tsx`, after the line `<Stack.Screen name="(auth)/sign-up" />` (line ~101), add:

```tsx
            <Stack.Screen name="(auth)/verify" />
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck:app`
Expected: exit 0.

- [ ] **Step 4: Manual verify (web) — full register flow**

Landing → `register` → real throwaway email + new username + matching passwords → `register`.
Expected: verify screen shows `we emailed a code to <that address>`; a wrong 6-digit code shows a red error; `resend code` flips to `sent! (30)` and counts down; the real emailed code auto-submits on the 6th digit and lands on the map. Refreshing `/verify` when signed out redirects to the landing.

- [ ] **Step 5: Commit**

```bash
git add apps/app/app/"(auth)"/verify.tsx apps/app/app/_layout.tsx
git commit -m "feat(app): add 6-digit email verification screen"
```

---

### Task 9: Cleanup + final gate

**Files:**
- Delete: `apps/app/lib/clerkAppearance.ts` (only ever imported by the deleted `.web` auth files)
- Delete: `apps/app/app/auth/index.tsx` (superseded stub route; remove the `auth/` directory if it becomes empty)

**Interfaces:**
- Consumes: everything above.
- Produces: a clean tree passing `bun run check`, with the full auth flow manually verified on web and native.

- [ ] **Step 1: Delete the dead files**

```bash
git rm apps/app/lib/clerkAppearance.ts apps/app/app/auth/index.tsx
```

- [ ] **Step 2: Confirm nothing still references them**

```bash
grep -rn "clerkAppearance\|AUTH_PAGE_CSS" /home/markq/Projects/hackathon/apps/app --include="*.ts" --include="*.tsx" | grep -v node_modules
```

Expected: no output.

- [ ] **Step 3: Full check**

Run: `bun run check`
Expected: lint, format check, and all four typechecks pass. If `oxfmt` flags formatting, run `bun run format` and re-check.

- [ ] **Step 4: Manual verify — full flow, both platforms**

- Web (`bun run dev`, press `w`): landing → register → verify (wrong code, resend, real code) → map → sign out → landing → login by username → map. Wrong-password error shows in red.
- Native (Expo Go / dev build from the same server): repeat the flow; confirm paws render, keyboard doesn't cover inputs (KeyboardAvoidingView), and safe areas hold on a notched device.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(app): remove Clerk prebuilt auth styling and stub auth route"
```
