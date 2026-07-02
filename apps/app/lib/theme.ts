export const colors = {
  // Page background — matches the warm cream map base
  pageBg: "#F2EAD3",
  pageBgSoft: "#FAF3DF",

  // Sage greens — frame, buttons, primary accent
  sage: "#7A8F65",
  sageDark: "#4D5E40",
  sageDarker: "#384730",
  sageLight: "#9FB287",

  // Cork board
  cork: "#D2B689",
  corkEdge: "#A88F5F",
  corkShadow: "#7E6A3F",

  // Paper note fills (pale, soft, AC vibe)
  paperCream: "#F4ECCC",
  paperYellow: "#F7E8B0",
  paperBlue: "#D8E2E5",
  paperGreen: "#DDE9CC",
  paperPink: "#F0D4D0",
  paperEdge: "#D9CFA5",

  // Ink (text on paper / on cream)
  ink: "#3E3528",
  inkSoft: "#6B5E50",
  inkSofter: "#8C7F70",

  // Cream text on dark sage
  creamText: "#F2EAD3",

  // Auth screens (landing / login / register / verify) — sampled from mocks
  authCream: "#FDEDD4",
  authSage: "#5A7258",
  authSageDark: "#4A5F49",
  authError: "#C0392B",

  // Flower pin palette
  pinYellow: "#F2C84B",
  pinYellowDark: "#B68A20",
  pinPink: "#E589A0",
  pinPinkDark: "#A14860",
  pinGreen: "#7AB35C",
  pinGreenDark: "#3E7032",
  pinBlue: "#5D8FBF",
  pinBlueDark: "#2C5780",
  pinRed: "#C75A4C",
  pinRedDark: "#7E2A22",
} as const;

export const paperPalette = [
  { fill: colors.paperCream, edge: "#DDD3A8" },
  { fill: colors.paperYellow, edge: "#DCC080" },
  { fill: colors.paperBlue, edge: "#9DAFB3" },
  { fill: colors.paperGreen, edge: "#A8B895" },
  { fill: colors.paperPink, edge: "#C9A7A1" },
] as const;

export const pinPalette = [
  { fill: colors.pinYellow, accent: colors.pinYellowDark },
  { fill: colors.pinPink, accent: colors.pinPinkDark },
  { fill: colors.pinGreen, accent: colors.pinGreenDark },
  { fill: colors.pinBlue, accent: colors.pinBlueDark },
  { fill: colors.pinRed, accent: colors.pinRedDark },
] as const;

export type PaperTone = (typeof paperPalette)[number];
export type PinTone = (typeof pinPalette)[number];

function hashString(value: string, seed = 5381): number {
  let h = seed;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) + h + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function paperForAuthor(authorId: string): PaperTone {
  return paperPalette[hashString(authorId, 5381) % paperPalette.length];
}

export function pinForAuthor(authorId: string): PinTone {
  return pinPalette[hashString(authorId, 7919) % pinPalette.length];
}

export function expiresInLabel(expiresAtIso: string): string {
  const diff = new Date(expiresAtIso).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}
