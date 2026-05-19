import { SignIn } from "@clerk/expo/web";

export default function SignInPage() {
  return <SignIn fallbackRedirectUrl="/(tabs)/map" signUpUrl="/sign-up" />;
}
