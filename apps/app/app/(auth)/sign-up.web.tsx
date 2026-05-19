import { SignUp } from "@clerk/expo/web";

export default function SignUpPage() {
  return <SignUp fallbackRedirectUrl="/(tabs)/map" signInUrl="/sign-in" />;
}
