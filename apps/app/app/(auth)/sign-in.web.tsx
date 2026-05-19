import { SignIn } from "@clerk/expo/web";

export default function SignInPage() {
  return <SignIn fallbackRedirectUrl="/map" signUpUrl="/sign-up" />;
}
