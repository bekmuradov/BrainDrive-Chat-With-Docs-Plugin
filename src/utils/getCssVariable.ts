/**
 * Get a CSS custom property value
 */
export function getCssVariable(variableName: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
}
