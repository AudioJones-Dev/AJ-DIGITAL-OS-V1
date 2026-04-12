import type { UiTheme } from "./theme-types.js";

export const AJ_DIGITAL_RAW_PALETTE = {
  aiBlue: "#00A4FF",
  aiIndigo: "#1C3F99",
  accentOrange: "#FF4500",
  accentGold: "#FFC857",
  surface900: "#0B1020",
  surface800: "#121A33",
  surface700: "#15213F",
  surface600: "#1E2A3A",
  textPrimary: "#E6EDF3",
  textSecondary: "#9FB3C8",
  textMuted: "#6B7C93",
  success: "#22C55E",
} as const;

export const AJ_DIGITAL_DARK_THEME: UiTheme = {
  id: "aj-digital-dark",
  displayName: "AJ Digital Dark",
  mode: "dark",
  colors: {
    background: AJ_DIGITAL_RAW_PALETTE.surface900,
    panel: AJ_DIGITAL_RAW_PALETTE.surface800,
    card: AJ_DIGITAL_RAW_PALETTE.surface700,
    elevated: AJ_DIGITAL_RAW_PALETTE.surface600,
    border: "rgba(159, 179, 200, 0.16)",
    borderStrong: "rgba(159, 179, 200, 0.28)",
    textPrimary: AJ_DIGITAL_RAW_PALETTE.textPrimary,
    textSecondary: AJ_DIGITAL_RAW_PALETTE.textSecondary,
    textMuted: AJ_DIGITAL_RAW_PALETTE.textMuted,
    interactivePrimary: AJ_DIGITAL_RAW_PALETTE.aiBlue,
    interactivePrimaryHover: "#34B6FF",
    interactiveSecondary: AJ_DIGITAL_RAW_PALETTE.aiIndigo,
    success: AJ_DIGITAL_RAW_PALETTE.success,
    warning: AJ_DIGITAL_RAW_PALETTE.accentGold,
    error: AJ_DIGITAL_RAW_PALETTE.accentOrange,
    link: AJ_DIGITAL_RAW_PALETTE.aiBlue,
    aiGradientStart: AJ_DIGITAL_RAW_PALETTE.aiBlue,
    aiGradientEnd: AJ_DIGITAL_RAW_PALETTE.aiIndigo,
  },
  typography: {
    fontFamily: "\"Segoe UI\", Inter, ui-sans-serif, system-ui, sans-serif",
    fontMonoFamily: "\"Cascadia Code\", \"SFMono-Regular\", Consolas, monospace",
  },
  radius: {
    panel: "24px",
    card: "18px",
    pill: "999px",
  },
  shadow: {
    panel: "0 20px 40px rgba(0, 0, 0, 0.28)",
    glow: "0 0 0 1px rgba(0, 164, 255, 0.10), 0 12px 30px rgba(0, 164, 255, 0.12)",
  },
};
