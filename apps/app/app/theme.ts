export const colors = {
  background: "#F0EDE4",
  surface: "#F5F0E8",
  card: "#FAF7EF",
  primary: "#4A7C59",
  primaryDark: "#3A6347",
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
} as const;

export const fonts = {
  family: "Jersey10" as const,
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
