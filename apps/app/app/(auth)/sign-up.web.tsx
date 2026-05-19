import { SignUp } from "@clerk/expo/web";

import { APP_NAME, APP_TAGLINE } from "@/constants/app";
import { AUTH_PAGE_CSS, clerkAppearance } from "@/lib/clerkAppearance";

const FlowerPin = () => (
  <svg width="36" height="36" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(0 16 16)">
      <ellipse cx="16" cy="9" rx="4" ry="6.5" fill="#E589A0" />
    </g>
    <g transform="rotate(60 16 16)">
      <ellipse cx="16" cy="9" rx="4" ry="6.5" fill="#E589A0" />
    </g>
    <g transform="rotate(120 16 16)">
      <ellipse cx="16" cy="9" rx="4" ry="6.5" fill="#E589A0" />
    </g>
    <g transform="rotate(180 16 16)">
      <ellipse cx="16" cy="9" rx="4" ry="6.5" fill="#E589A0" />
    </g>
    <g transform="rotate(240 16 16)">
      <ellipse cx="16" cy="9" rx="4" ry="6.5" fill="#E589A0" />
    </g>
    <g transform="rotate(300 16 16)">
      <ellipse cx="16" cy="9" rx="4" ry="6.5" fill="#E589A0" />
    </g>
    <circle cx="16" cy="16" r="5" fill="#A14860" />
    <circle cx="17.5" cy="14.5" r="2" fill="#E589A0" opacity="0.55" />
  </svg>
);

export default function SignUpPage() {
  return (
    <>
      <style>{AUTH_PAGE_CSS}</style>
      <div className="auth-page">
        <div className="auth-wrap">
          <div className="auth-pin">
            <FlowerPin />
          </div>
          <div className="auth-header">
            <h1 className="auth-title">{APP_NAME.toUpperCase()}</h1>
            <p className="auth-tagline">{APP_TAGLINE}</p>
          </div>
          <SignUp appearance={clerkAppearance} fallbackRedirectUrl="/map" signInUrl="/sign-in" />
        </div>
      </div>
    </>
  );
}
