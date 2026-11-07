// Design tokens for Listing Photos Generator.
// The components in this folder read these tokens. Nothing content bearing
// lives here, only colour, spacing, type, and radius values. Admin copy
// lives in src/config/site-copy.ts, never in a component.

export const tokens = {
  colors: {
    background: "#FBF7F4",
    surface: "#FFFFFF",
    surfaceAlt: "#F3EDEA",
    ink: "#23272F",
    muted: "#6B7280",
    border: "#E5E0DC",
    primary: "#1B2A4A",
    primaryText: "#FFFFFF",
    accent: "#D9A441",
    success: "#2E7D32",
    successBg: "#E6F4EA",
    warning: "#8A5A00",
    warningBg: "#FFF4D6",
    danger: "#B3261E",
    dangerBg: "#FDECEA",
    infoBg: "#E8EEF7",
  },
  radii: {
    small: 6,
    medium: 10,
    large: 16,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  fonts: {
    title: "Georgia, 'Times New Roman', serif",
    body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  maxWidth: 1080,
} as const;

export type Tokens = typeof tokens;
