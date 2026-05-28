import { describe, it, expect } from 'vitest';
import { blobToBase64 } from './blobToBase64';

describe('blobToBase64', () => {
  it('converts a text blob to base64 without the data URI prefix', async () => {
    const content = 'Hello, world!';
    const blob = new Blob([content], { type: 'text/plain' });

    const result = await blobToBase64(blob);

    // Verify it's valid base64 by decoding it
    const decoded = atob(result);
    expect(decoded).toBe(content);
  });

  it('converts a binary blob to base64', async () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 128, 64]);
    const blob = new Blob([bytes], { type: 'application/octet-stream' });

    const result = await blobToBase64(blob);

    // Verify the result does not contain the data URI prefix
    expect(result).not.toContain('data:');
    expect(result).not.toContain(';base64,');

    // Verify round-trip
    const decoded = atob(result);
    const decodedBytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      decodedBytes[i] = decoded.charCodeAt(i);
    }
    expect(decodedBytes).toEqual(bytes);
  });

  it('handles an empty blob', async () => {
    const blob = new Blob([], { type: 'text/plain' });

    const result = await blobToBase64(blob);

    expect(result).toBe('');
  });
});
