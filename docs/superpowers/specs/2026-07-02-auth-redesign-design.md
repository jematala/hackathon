# Auth Redesign — Landing, Login, Register, Verify

**Date:** 2026-07-02
**Status:** Approved
**Scope:** apps/app only. Replaces the pre-auth surfaces (landing, sign-in, sign-up) with fully custom screens matching the provided pixel-art mocks.

## Overview

Jematala currently redirects signed-out users straight to Clerk's prebuilt sign-in UI (`<SignIn>` on web, `<AuthView>` on native). This redesign introduces a landing screen and replaces both auth screens with custom React Native components driven by Clerk's `useSignIn`/`useSignUp` hooks, matching the three supplied mocks (Landing / Login / Register). One cross-platform implementation serves native and web via React Native Web.

Note: the supplied mock frame labels were swapped; the confirmed intent is:
- **Login** = username + password (2 fields)
- **Register** = email + username + password + password again (4 fields)

## Goals

- Landing screen: "jematala" wordmark, `login` and `register` buttons, paw-print scatter.
- Custom login and register forms in the same visual system.
- A matching email-verification screen (6-digit code) completing the register flow.
- Single cross-platform implementation; delete the `.web.tsx`/`.native.tsx` auth splits and `lib/clerkAppearance.ts`.
- Web layout (no mock provided): same screens with a width-capped column, designed at my discretion.

## Non-goals

- Password reset / forgot-password flow.
- Any change to post-auth screens (map, quests, profile, studio).
- Dark mode.

## Routing & flow

- The landing renders directly in `apps/app/app/index.tsx` for signed-out users (no redirect). A separate `(auth)/index.tsx` is impossible: route groups add no URL segment, so it would collide with `app/index.tsx` at `/`.
- New verification route: `apps/app/app/(auth)/verify.tsx`.
- Landing `login` → `router.push("/(auth)/sign-in")`; `register` → `router.push("/(auth)/sign-up")`. Back returns to landing.
- Register success with verification required → `router.push("/(auth)/verify")`. The in-progress `signUp` is held by Clerk's client, so `useSignUp` on the verify screen resumes it; if someone lands on `/verify` with no sign-up in flight, redirect to the landing.
- `sign-in.tsx` / `sign-up.tsx` become single cross-platform files (no platform splits).
- On successful auth: `setActive({ session })` then redirect to `/(app)/map` (same behavior as today via `app/index.tsx`).

### Deletions

- `apps/app/app/(auth)/sign-in.web.tsx`, `sign-in.native.tsx`, `sign-up.web.tsx`, `sign-up.native.tsx`
- `apps/app/lib/clerkAppearance.ts`
- Stub route `apps/app/app/auth/index.tsx`

### Clerk prerequisite

Login is by **username**. The Clerk instance must have the *username* attribute enabled (and email required at sign-up). Verify in the Clerk dashboard before implementation; if username sign-in is not enabled, enable it (no code change required).

## Visual system

Colors sampled from the mocks; added as tokens to `apps/app/lib/theme.ts` (not hardcoded in components):

| Token | Value | Use |
|---|---|---|
| `authCream` | `#FDEDD4` | Screen background, button label text, input fill |
| `authSage` | `#5A7258` | Wordmark, button fill, input borders, placeholder/input text |
| `authSageDark` | `#4A5F49` | Button pressed/hover state |
| Error text | existing `danger`-family red (`#C0392B`) | Form error messages |

- **Typography:** Jersey 10 (already global). Wordmark is rendered text — lowercase "jematala", 52px, `authSage`, with a thick underline (border-bottom style element, not text-decoration, to match the mock's chunky rule).
- **Buttons:** solid `authSage` fill, `authCream` label, slight corner rounding per mock (~6px), fixed width (~140px on mobile), pressed/hover → `authSageDark`.
- **Inputs:** `authCream` fill, 2px `authSage` border, ~8px rounding, centered `authSage` placeholder/entry text, ~48px tall, full column width.
- **Paw prints:** the user's 32×32 solid-sage RGBA PNG, copied to `apps/app/assets/images/paw.png`. Rendered at **0.45 opacity** over the cream background, which reproduces the mock's muted `#B1B49B`. Scattered 5–7 times across the lower third with **fixed** positions/rotations/scales (a hardcoded layout array — deterministic, no per-render randomness). Rendered with plain React Native `Image` (no new deps); `imageRendering: "pixelated"` style on web keeps edges sharp — native has no smoothing control, and at 0.45 opacity the slight resampling blur is invisible.

## Components

New directory `apps/app/components/auth/`:

- **`AuthScreen.tsx`** — shared chrome: cream full-bleed background, safe area, centered content column, "jematala" wordmark, paw scatter anchored to the bottom. Props: `children` (form content below the wordmark).
- **`PawScatter.tsx`** — absolutely-positioned paw `<Image>`s from the fixed layout array. On web the scatter spans the full viewport width; on mobile it matches the mock's arrangement.
- **`PixelInput.tsx`** — styled TextInput per the input spec above. Props: placeholder, value/onChangeText, secureTextEntry, autoCapitalize, keyboardType, error state (border shifts to danger red).
- Buttons reuse the existing `components/Button.tsx`, extended (or given a variant) to accept the `authSage`/`authCream` colorway if its current styling doesn't already match.

## Screens

### Landing — `app/index.tsx` (signed-out state)
Wordmark centered slightly above the vertical middle; `login` and `register` buttons stacked beneath (login first), ~12px gap; paw scatter below. No inputs, no header.

### Login — `(auth)/sign-in.tsx`
Wordmark, then `username…` and `password…` inputs, then a `login` submit button (mock omits it; a submit affordance is required — same style as landing buttons). Uses `useSignIn`: `signIn.create({ identifier: username, password })` → `setActive`. Pending state disables the button and swaps the label to `logging in…`.

### Register — `(auth)/sign-up.tsx`
Wordmark, then `email…`, `username…`, `password…`, `password again…` inputs, then a `register` submit button. Client-side check: passwords must match before calling Clerk. Uses `useSignUp`: `signUp.create({ emailAddress, username, password })`.

After `signUp.create`, call `prepareEmailAddressVerification({ strategy: "email_code" })` and navigate to `/(auth)/verify`. If the Clerk instance has verification disabled, `setActive` and go straight to the map.

### Verify — `(auth)/verify.tsx`
Same `AuthScreen` chrome (wordmark + paw scatter). Content:
- A one-line prompt under the wordmark in `authSage`: `we emailed a code to <address>` (address from the in-flight `signUp.emailAddress`).
- A single `PixelInput` for the code: placeholder `code…`, centered text, numeric keypad (`keyboardType="number-pad"`, `inputMode="numeric"`, `autoComplete="one-time-code"`), `maxLength={6}`, wide letter-spacing so the six digits read as a code.
- A `verify` submit button (same button style). Submits `attemptEmailAddressVerification({ code })`; on `status === "complete"` → `setActive` → `/(app)/map`. Auto-submits when the sixth digit is entered.
- A small underlined `resend code` text link in `authSage` beneath the button; tapping re-runs `prepareEmailAddressVerification` and disables itself for 30 seconds (label shows `sent!` then a countdown).
- Wrong/expired code errors use the standard error line.

## Error handling

- Clerk API errors (wrong password, username taken, weak password, bad code) render as a small centered error line in danger red directly under the form, using the message from `error.errors[0].longMessage ?? .message`.
- Submit buttons disable while a request is pending.
- Password-mismatch on register is caught client-side with the same error line ("passwords don't match").

## Web layout (no mock — designer's discretion)

Identical code path via React Native Web. The content column is capped at **380px** and horizontally centered; vertical rhythm matches mobile. The paw scatter spans the full viewport bottom so wide screens don't feel empty. Buttons get a hover state (`authSageDark` fill); inputs rely on the browser focus ring plus their 2px sage border (RN Web's TextInput has no hover facility). No separate web components.

## Testing / verification

- No test infrastructure exists in the repo; verification is manual.
- Web: run the app (`bun run dev`), exercise landing → register (new throwaway account) → verify screen (real emailed code, plus a wrong-code attempt and a resend) → sign out → login by username. Confirm error states (wrong password, mismatched passwords).
- Native: same flow in Expo Go / dev build; confirm paw rendering stays sharp and safe areas hold on a notched device.
- `bun run check` (lint + format + typecheck) must pass.
