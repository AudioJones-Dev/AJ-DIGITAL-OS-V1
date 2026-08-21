export interface UiSemanticColorTokens {
  background: string;
  panel: string;
  card: string;
  elevated: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  interactivePrimary: string;
  interactivePrimaryHover: string;
  interactiveSecondary: string;
  success: string;
  warning: string;
  error: string;
  link: string;
  aiGradientStart: string;
  aiGradientEnd: string;
}

export interface UiTypographyTokens {
  fontDisplayFamily: string;
  fontFamily: string;
  fontMonoFamily: string;
}

export interface UiRadiusTokens {
  panel: string;
  card: string;
  pill: string;
}

export interface UiShadowTokens {
  panel: string;
  glow: string;
}

export interface UiTheme {
  id: string;
  displayName: string;
  mode: "dark";
  colors: UiSemanticColorTokens;
  typography: UiTypographyTokens;
  radius: UiRadiusTokens;
  shadow: UiShadowTokens;
}
