/**
 * Validates whether a chat message is sendable.
 * Returns true if the message is non-empty after trimming and at most 500 characters.
 */
export function validateMessage(message: string): boolean {
  const trimmed = message.trim();
  return trimmed.length > 0 && trimmed.length <= 500;
}
