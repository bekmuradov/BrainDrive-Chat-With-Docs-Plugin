import { getCssVariable } from "./getCssVariable";

/**
 * Check if the current theme is dark
 */
export function isDarkTheme(): boolean {
  const theme = getCssVariable('--bg-color');
  // Dark themes typically have dark background colors
  return theme.includes('#1') || theme.includes('#2') || theme.includes('rgb(1') || theme.includes('rgb(2');
}
