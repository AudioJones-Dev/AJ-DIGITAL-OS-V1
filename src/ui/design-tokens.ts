import type { UiTheme } from "./theme-types.js";

/**
 * Audio Jones — Editorial Intelligence Systems.
 * Dark-first. Signal-yellow is semantic, not decorative.
 * Canonical token values live in design-system/tokens/; this mirrors them
 * for the local web shell's `--ui-*` variables.
 */
export const AJ_DIGITAL_RAW_PALETTE = {
  signal: "#E8FF5A",
  signalInk: "#080808",
  data: "#4DACFF",
  critical: "#FF4545",
  warning: "#FFB340",
  success: "#3DFFB0",
  base: "#080808",
  surface1: "#0F0F0F",
  surface2: "#161616",
  surface3: "#1E1E1E",
  textPrimary: "#F2F2F2",
  textSecondary: "#A8A8A8",
  textMuted: "#6E6E6E",
  border: "#222222",
  borderStrong: "#333333",
} as const;

export const AJ_DIGITAL_DARK_THEME: UiTheme = {
  id: "aj-digital-dark",
  displayName: "Audio Jones — Editorial Intelligence Systems",
  mode: "dark",
  colors: {
    background: AJ_DIGITAL_RAW_PALETTE.base,
    panel: AJ_DIGITAL_RAW_PALETTE.surface1,
    card: AJ_DIGITAL_RAW_PALETTE.surface2,
    elevated: AJ_DIGITAL_RAW_PALETTE.surface3,
    border: AJ_DIGITAL_RAW_PALETTE.border,
    borderStrong: AJ_DIGITAL_RAW_PALETTE.borderStrong,
    textPrimary: AJ_DIGITAL_RAW_PALETTE.textPrimary,
    textSecondary: AJ_DIGITAL_RAW_PALETTE.textSecondary,
    textMuted: AJ_DIGITAL_RAW_PALETTE.textMuted,
    interactivePrimary: AJ_DIGITAL_RAW_PALETTE.signal,
    interactivePrimaryHover: "#F0FF8A",
    interactiveSecondary: AJ_DIGITAL_RAW_PALETTE.data,
    success: AJ_DIGITAL_RAW_PALETTE.success,
    warning: AJ_DIGITAL_RAW_PALETTE.warning,
    error: AJ_DIGITAL_RAW_PALETTE.critical,
    link: AJ_DIGITAL_RAW_PALETTE.data,
    // Retained for data-viz accents only — NOT used as a decorative UI gradient.
    aiGradientStart: AJ_DIGITAL_RAW_PALETTE.signal,
    aiGradientEnd: AJ_DIGITAL_RAW_PALETTE.data,
  },
  typography: {
    fontDisplayFamily: "\"Syne\", \"DM Sans\", ui-sans-serif, system-ui, sans-serif",
    fontFamily: "\"DM Sans\", ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontMonoFamily: "\"DM Mono\", ui-monospace, \"SFMono-Regular\", Consolas, monospace",
  },
  radius: {
    panel: "8px",
    card: "8px",
    pill: "999px",
  },
  shadow: {
    // Dark-first: hierarchy from surfaces + borders. Shadow only for overlays.
    panel: "0 16px 40px rgba(0, 0, 0, 0.55)",
    glow: "none",
  },
};
