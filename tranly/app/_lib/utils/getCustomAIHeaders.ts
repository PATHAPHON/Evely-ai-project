/**
 * Reads custom AI configuration from localStorage and returns
 * headers to include in API requests when values are present.
 */
export function getCustomAIHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const headers: Record<string, string> = {};

  try {
    const apiKey = localStorage.getItem('tarnly:ai-api-key');
    const model = localStorage.getItem('tarnly:ai-model');

    if (apiKey) {
      headers['x-custom-api-key'] = apiKey;
    }
    if (model) {
      headers['x-custom-model'] = model;
    }
  } catch {
    // localStorage may be unavailable (e.g. private browsing)
  }

  return headers;
}
