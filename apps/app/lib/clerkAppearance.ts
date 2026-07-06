const FONT = '"Jersey10_400Regular", "Jersey 10", monospace';

// Mirrors the active palette in apps/app/lib/theme.ts (cork board + paper notes)
const C = {
  cork: "#D2B689",
  corkEdge: "#A88F5F",
  corkShadow: "#7E6A3F",
  paper: "#F4ECCC",
  paperSoft: "#FAF3DF",
  paperEdge: "#DDD3A8",
  sage: "#7A8F65",
  sageDark: "#5A7258",
  sageDarker: "#384730",
  ink: "#3E3528",
  inkSoft: "#6B5E50",
  inkSofter: "#8C7F70",
  cream: "#F2EAD3",
  danger: "#C75A4C",
};

export const clerkAppearance = {
  variables: {
    colorPrimary: C.sageDark,
    colorBackground: C.paper,
    colorInputBackground: C.paperSoft,
    colorInputText: C.ink,
    colorText: C.ink,
    colorTextSecondary: C.inkSoft,
    colorDanger: C.danger,
    fontFamily: FONT,
    fontSize: "18px",
    borderRadius: "2px",
  },
  elements: {
    rootBox: { width: "100%" },
    card: {
      borderRadius: 0,
      border: "none",
      boxShadow: "none",
      background: "transparent",
      padding: "20px 28px 28px",
      margin: 0,
      width: "100%",
    },
    formButtonPrimary: {
      fontFamily: FONT,
      fontSize: "20px",
      letterSpacing: "2px",
      backgroundColor: C.sageDark,
      border: `2px solid ${C.sageDarker}`,
      borderRadius: 2,
      boxShadow: "none",
      color: C.cream,
      textTransform: "none",
    },
    formFieldInput: {
      fontFamily: FONT,
      fontSize: "18px",
      backgroundColor: C.paperSoft,
      border: `2px solid ${C.paperEdge}`,
      borderRadius: 2,
      color: C.ink,
    },
    formFieldLabel: {
      fontFamily: FONT,
      fontSize: "16px",
      color: C.ink,
      fontWeight: "700",
      letterSpacing: "1px",
    },
    headerTitle: {
      display: "none",
    },
    headerSubtitle: {
      fontFamily: FONT,
      color: C.inkSoft,
      fontSize: "16px",
    },
    socialButtonsBlockButton: {
      border: `2px solid ${C.paperEdge}`,
      borderRadius: 2,
      fontFamily: FONT,
      fontSize: "17px",
      background: C.paperSoft,
      color: C.ink,
    },
    socialButtonsBlockButtonText: { fontFamily: FONT, color: C.ink },
    footerActionLink: {
      fontFamily: FONT,
      color: C.sageDark,
      fontSize: "17px",
      fontWeight: "700",
    },
    footerActionText: {
      fontFamily: FONT,
      color: C.inkSoft,
      fontSize: "17px",
    },
    footer: {
      background: "transparent",
      borderTop: `1px dashed ${C.paperEdge}`,
      padding: "14px 0 0",
      rowGap: "10px",
      gap: "10px",
    },
    footerAction: {
      margin: 0,
      padding: 0,
    },
    dividerLine: { background: C.paperEdge },
    dividerText: { fontFamily: FONT, color: C.inkSofter, letterSpacing: "2px" },
    identityPreviewText: { fontFamily: FONT, color: C.ink },
    identityPreviewEditButton: { fontFamily: FONT, color: C.sageDark },
    otpCodeFieldInput: {
      fontFamily: FONT,
      border: `2px solid ${C.paperEdge}`,
      borderRadius: 2,
      background: C.paperSoft,
    },
    alternativeMethodsBlockButton: {
      border: `2px solid ${C.paperEdge}`,
      borderRadius: 2,
      fontFamily: FONT,
      fontSize: "17px",
      background: C.paperSoft,
      color: C.ink,
    },
    formResendCodeLink: { fontFamily: FONT, color: C.sageDark },
    formFieldErrorText: { fontFamily: FONT, color: C.danger },
    formFieldSuccessText: { fontFamily: FONT },
    alertText: { fontFamily: FONT, color: C.ink },
    badge: { fontFamily: FONT },
  },
} as const;

export const AUTH_PAGE_CSS = `
  .auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${C.cork};
    background-image:
      radial-gradient(circle at 25% 35%, rgba(126, 106, 63, 0.22) 1px, transparent 2px),
      radial-gradient(circle at 75% 65%, rgba(126, 106, 63, 0.18) 1.5px, transparent 2.5px),
      radial-gradient(circle at 55% 20%, rgba(168, 143, 95, 0.25) 1px, transparent 1.8px),
      radial-gradient(circle at 15% 80%, rgba(126, 106, 63, 0.16) 1px, transparent 2px);
    background-size: 32px 32px, 44px 44px, 28px 28px, 38px 38px;
    padding: 32px 24px;
    box-sizing: border-box;
  }

  .auth-wrap {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: ${C.paper};
    border: 2px solid ${C.paperEdge};
    border-radius: 2px;
    box-shadow:
      4px 6px 18px rgba(62, 53, 40, 0.35),
      1px 2px 5px rgba(62, 53, 40, 0.2);
  }

  .auth-pin {
    position: absolute;
    top: -16px;
    left: 50%;
    transform: translateX(-50%) rotate(-8deg);
    z-index: 2;
    pointer-events: none;
    filter: drop-shadow(2px 3px 4px rgba(62, 53, 40, 0.45));
  }

  .auth-header {
    padding: 40px 28px 20px;
    text-align: center;
    border-bottom: 1px dashed ${C.paperEdge};
  }

  .auth-title {
    font-family: ${FONT};
    font-size: 52px;
    line-height: 1;
    color: ${C.sageDarker};
    margin: 0;
    letter-spacing: 6px;
  }

  .auth-tagline {
    font-family: ${FONT};
    font-size: 16px;
    color: ${C.inkSoft};
    margin: 10px 0 0;
    letter-spacing: 2px;
  }

  .cl-formButtonPrimary:hover {
    background-color: ${C.sageDarker} !important;
  }
  .cl-formButtonPrimary:active {
    background-color: #2A3623 !important;
  }
  .cl-formFieldInput:focus {
    border-color: ${C.sage} !important;
    outline: none !important;
  }
  .cl-socialButtonsBlockButton:hover {
    border-color: ${C.sage} !important;
    background: ${C.paperSoft} !important;
  }
  .cl-footer {
    gap: 10px !important;
    row-gap: 10px !important;
    padding: 14px 0 0 !important;
  }
  .cl-footer > * {
    margin: 0 !important;
  }
  .cl-footerAction {
    margin: 0 !important;
    padding: 0 !important;
  }

  @media (max-width: 480px) {
    .auth-page { padding: 20px 16px; }
    .auth-title { font-size: 42px; letter-spacing: 4px; }
  }
`;
