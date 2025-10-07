/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse(jsonString: string, fallback: any = null): any {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return fallback;
  }
}
