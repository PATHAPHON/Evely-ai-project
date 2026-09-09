// micro-baht per token (1 THB = 1_000_000 micro-baht)
// ponytail: hardcoded — update when provider prices change
//   OpenRouter google/gemini-3.1-flash-lite: blended rate ~$0.055/M tokens × 36 THB/USD ≈ 2 µ฿/token
export const TOKEN_COST_MICROBAHT = {
  openrouter: 2, // chat, grammar, word-detail, translate routes
} as const;

// ponytail: flat per-call estimate, not metered — google/chirp-3 via
// OpenRouter bills per audio minute ($0.016/min), not per token, and clips here are short
// (<=~10s). VERIFY against actual OpenRouter audio pricing.
export const STT_COST_MICROBAHT = 500;

export const DAILY_BUDGET_MICROBAHT = {
  free: 20_000,    // 0.02 THB
  premium: 50_000, // 0.05 THB
} as const;
