import { SignUp } from "@clerk/expo/web";

export default function SignUpPage() {
  return <SignUp fallbackRedirectUrl="/map" signInUrl="/sign-in" />;
}
