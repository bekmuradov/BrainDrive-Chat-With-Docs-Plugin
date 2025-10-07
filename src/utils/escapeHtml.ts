/**
 * Escape HTML characters to prevent XSS
 */
export function escapeHtml(unsafe: string): string {
  const normalizedText = unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  const div = document.createElement('div');
  div.textContent = normalizedText;
  return div.innerHTML;
}
