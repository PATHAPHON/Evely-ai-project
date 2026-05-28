/**
 * Formats the current card position relative to total cards.
 *
 * @param current - Current card position (1-based)
 * @param total - Total number of cards
 * @returns Formatted string in "current/total" format
 *
 * Requirements: 1.4
 */
export function formatProgress(current: number, total: number): string {
  return `${current}/${total}`;
}
