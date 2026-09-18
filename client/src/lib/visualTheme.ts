export type VisualTheme = "cyber" | "cartoon";

export const VISUAL_THEME_KEY = "nexo-visual-theme";
export const DEFAULT_VISUAL_THEME: VisualTheme = "cyber";

export function readVisualTheme(): VisualTheme {
  try {
    const stored = window.localStorage.getItem(VISUAL_THEME_KEY);
    return stored === "cyber" || stored === "cartoon"
      ? stored
      : DEFAULT_VISUAL_THEME;
  } catch {
    return DEFAULT_VISUAL_THEME;
  }
}

export function saveVisualTheme(theme: VisualTheme): boolean {
  try {
    window.localStorage.setItem(VISUAL_THEME_KEY, theme);
    return true;
  } catch {
    // Theme selection still works when browser storage is unavailable.
    return false;
  }
}

export function applyVisualTheme(theme: VisualTheme) {
  document.documentElement.dataset.visualTheme = theme;
}
