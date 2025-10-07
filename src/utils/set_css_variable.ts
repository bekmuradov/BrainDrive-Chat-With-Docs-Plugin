/**
 * Set a CSS custom property value
 */
export function setCssVariable(variableName: string, value: string): void {
  document.documentElement.style.setProperty(variableName, value);
}
