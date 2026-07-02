// micro-baht per token (1 THB = 1_000_000 micro-baht)
// ponytail: hardcoded — update when provider prices change
//   OpenRouter llama-3.1-8b-instruct: ~$0.055/M tokens × 36 THB/USD ≈ 2 µ฿/token
//   KKU API (deepseek-v4-flash): internal/subsidised — verify actual cost with KKU
export const TOKEN_COST_MICROBAHT = {
  openrouter: 2, // chat route
  kku: 1,        // grammar + word-detail routes — VERIFY with KKU pricing
} as const;

// ponytail: flat per-call estimate, not metered — whisper-large-v3 via
// OpenRouter bills per audio minute, not per token, and clips here are short
// (<=~10s). VERIFY against actual OpenRouter audio pricing.
export const STT_COST_MICROBAHT = 500;

export const DAILY_BUDGET_MICROBAHT = {
  free: 20_000,    // 0.02 THB
  premium: 50_000, // 0.05 THB
} as const;
