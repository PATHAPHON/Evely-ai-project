/**
 * Validates a conversation topic string.
 * Accepts the string if its trimmed length is between 2 and 100 characters inclusive.
 */
export function validateTopic(topic: string): boolean {
  const trimmed = topic.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
}
