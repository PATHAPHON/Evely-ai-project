/** Percentage of the daily AI budget spent so far, clamped to [0, 100]. */
export function computeUsagePct(spent: number, limit: number): number {
  return Math.min(100, Math.round((spent / limit) * 100) || 0);
}

/** Tailwind text-color class for a usage percentage (green→yellow→red). */
export function usageTextColor(pct: number): string {
  if (pct >= 90) return 'text-incorrect';
  if (pct >= 70) return 'text-warning';
  return 'text-primary';
}

/** Tailwind background-color class for a usage percentage bar. */
export function usageBarColor(pct: number): string {
  if (pct >= 90) return 'bg-incorrect';
  if (pct >= 70) return 'bg-warning';
  return 'bg-primary';
}
