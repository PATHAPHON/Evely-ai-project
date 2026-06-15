import { describe, it, expect } from 'vitest';
import { parsePartialChat } from './parsePartialChat';

describe('parsePartialChat', () => {
  it('returns empty on blank buffer', () => {
    expect(parsePartialChat('')).toEqual({ sentences: [] });
    expect(parsePartialChat('  ')).toEqual({ sentences: [] });
  });

  it('returns empty when no complete englishText yet', () => {
    const partial = '{ "sentences": [{ "englishText": "Hey, how are';
    expect(parsePartialChat(partial)).toEqual({ sentences: [] });
  });

  it('extracts one complete sentence', () => {
    const buf = `{
  "sentences": [
    {
      "englishText": "Hello!",
      "reading": "Hello!",
      "romanization": "Hello!",
      "translation": "สวัสดี!",
      "english": "Hello!"
    }
  ]
}`;
    const result = parsePartialChat(buf);
    expect(result.sentences).toHaveLength(1);
    expect(result.sentences[0].englishText).toBe('Hello!');
    expect(result.sentences[0].english).toBe('Hello!');
    expect(result.sentences[0].translation).toBe('สวัสดี!');
  });

  it('extracts first sentence when second is still partial', () => {
    const buf = `{
  "sentences": [
    {
      "englishText": "The weather is really nice today.",
      "translation": "วันนี้อากาศดีมากเลย"
    },
    {
      "englishText": "Do you want to go for a`;
    const result = parsePartialChat(buf);
    expect(result.sentences).toHaveLength(1);
    expect(result.sentences[0].englishText).toBe('The weather is really nice today.');
  });

  it('extracts multiple complete sentences', () => {
    const buf = `{
  "sentences": [
    { "englishText": "First sentence.", "translation": "ประโยคแรก", "english": "First sentence." },
    { "englishText": "Second sentence.", "translation": "ประโยคที่สอง", "english": "Second sentence." }
  ]
}`;
    const result = parsePartialChat(buf);
    expect(result.sentences).toHaveLength(2);
    expect(result.sentences[1].englishText).toBe('Second sentence.');
  });

  it('does not throw on garbage input', () => {
    expect(() => parsePartialChat('}{invalid[[')).not.toThrow();
  });

  it('does NOT count suggestion objects as sentences', () => {
    // Full buffer including suggestions — suggestions also use "englishText"
    const buf = `{
  "sentences": [
    { "englishText": "What did you do today?", "translation": "วันนี้ทำอะไร?", "english": "What did you do today?" }
  ],
  "suggestions": [
    { "englishText": "I studied a lot.", "translation": "ฉันเรียนหนักมาก" },
    { "englishText": "I met a friend.", "translation": "ฉันเจอเพื่อน" }
  ],
  "ended": false
}`;
    const result = parsePartialChat(buf);
    expect(result.sentences).toHaveLength(1);
    expect(result.sentences[0].englishText).toBe('What did you do today?');
  });

  it('stops at suggestions even when partial', () => {
    // Buffer where suggestions have started streaming but sentences are complete
    const buf = `{
  "sentences": [
    { "englishText": "That's great!", "translation": "ดีเลย!", "english": "That's great!" },
    { "englishText": "It sounds like a lot of fun.", "translation": "น่าสนุกเลย", "english": "It sounds like a lot of fun." }
  ],
  "suggestions": [
    { "englishText": "Yeah, I really en`;
    const result = parsePartialChat(buf);
    expect(result.sentences).toHaveLength(2);
  });

  it('handles escaped quotes inside englishText', () => {
    const buf = `{ "sentences": [{ "englishText": "He said \\"hello\\".", "translation": "เขาพูดว่า hello" }] }`;
    const result = parsePartialChat(buf);
    expect(result.sentences[0].englishText).toBe('He said "hello".');
  });
});
