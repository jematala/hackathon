export const colors = {
  background: "#F0EDE4",
  surface: "#F5F0E8",
  card: "#FAF7EF",
  parchment: "#F0E6D0",
  parchmentDark: "#E8D9B8",
  primary: "#4A7C59",
  primaryDark: "#3A6347",
  primaryLight: "#6B9F77",
  accent: "#8B6914",
  accentLight: "#A8852E",
  danger: "#C0392B",
  text: "#2D2D2D",
  textSecondary: "#6B6B6B",
  textLight: "#999999",
  border: "#D4C9A8",
  borderDark: "#B8A88A",
  white: "#FFFFFF",
  black: "#000000",
  // Sticker vibrant palette
  stickerRed: "#D94F4F",
  stickerBlue: "#4A7CBF",
  stickerGreen: "#4A8C5C",
  stickerYellow: "#F4D03F",
  stickerPurple: "#8B5CF6",
  stickerOrange: "#E8843A",
  stickerPink: "#E884A8",
  stickerCyan: "#4ABFBF",
};

export const fonts = {
  family: "Jersey10",
  sizes: {
    xs: 16,
    sm: 18,
    md: 20,
    lg: 22,
    xl: 24,
    title: 28,
    heading: 32,
  } as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  none: 0,
} as const;

export const pixelBorder = {
  borderWidth: 2,
  borderColor: colors.borderDark,
  borderRadius: 0,
} as const;

export const pixelBorderDark = {
  borderWidth: 2,
  borderColor: colors.text,
  borderRadius: 0,
} as const;

export const stickerPalette = [
  colors.stickerRed,
  colors.stickerBlue,
  colors.stickerGreen,
  colors.stickerYellow,
  colors.stickerPurple,
  colors.stickerOrange,
  colors.stickerPink,
  colors.stickerCyan,
];
