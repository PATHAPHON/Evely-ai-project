// micro-baht per token (1 THB = 1_000_000 micro-baht)
// ponytail: hardcoded — update when provider prices change
//   OpenRouter llama-3.1-8b-instruct: ~$0.055/M tokens × 36 THB/USD ≈ 2 µ฿/token
//   KKU API (deepseek-v4-flash): internal/subsidised — verify actual cost with KKU
export const TOKEN_COST_MICROBAHT = {
  openrouter: 2, // chat route
  kku: 1,        // grammar + word-detail routes — VERIFY with KKU pricing
} as const;

export const DAILY_BUDGET_MICROBAHT = {
  free: 20_000,    // 0.02 THB
  premium: 50_000, // 0.05 THB
} as const;
