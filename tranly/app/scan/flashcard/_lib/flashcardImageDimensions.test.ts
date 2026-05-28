import { describe, it, expect } from 'vitest';
import { flashcardImageDimensions } from './flashcardImageDimensions';

describe('flashcardImageDimensions', () => {
  it('scales a landscape image to fit viewport width', () => {
    // 1920x1080 image in a 400x800 viewport
    const result = flashcardImageDimensions(1920, 1080, 400, 800);
    // Max height = 800 * 0.6 = 480
    // Fit to width: width=400, height=400/(1920/1080)=225
    // 225 < 480, so width-constrained
    expect(result.width).toBe(400);
    expect(result.height).toBeCloseTo(225);
  });

  it('constrains by max height when image is tall', () => {
    // 1080x1920 (portrait) image in a 400x600 viewport
    const result = flashcardImageDimensions(1080, 1920, 400, 600);
    // Max height = 600 * 0.6 = 360
    // Fit to width: width=400, height=400/(1080/1920)=711.1
    // 711.1 > 360, so height-constrained
    expect(result.height).toBe(360);
    expect(result.width).toBeCloseTo(360 * (1080 / 1920));
  });

  it('preserves aspect ratio for a square image', () => {
    const result = flashcardImageDimensions(500, 500, 300, 800);
    // Max height = 800 * 0.6 = 480
    // Fit to width: width=300, height=300
    // 300 < 480, so width-constrained
    expect(result.width).toBe(300);
    expect(result.height).toBe(300);
  });

  it('never exceeds 60% viewport height', () => {
    const result = flashcardImageDimensions(100, 2000, 400, 600);
    // Max height = 360
    // Fit to width: width=400, height=400/(100/2000)=8000
    // 8000 > 360, so height-constrained
    expect(result.height).toBe(360);
    expect(result.height).toBeLessThanOrEqual(600 * 0.6);
  });

  it('maintains aspect ratio when constrained by height', () => {
    const naturalWidth = 800;
    const naturalHeight = 1200;
    const result = flashcardImageDimensions(naturalWidth, naturalHeight, 400, 500);
    // Max height = 300
    // Fit to width: width=400, height=400/(800/1200)=600
    // 600 > 300, so height-constrained
    const expectedAspectRatio = naturalWidth / naturalHeight;
    const resultAspectRatio = result.width / result.height;
    expect(resultAspectRatio).toBeCloseTo(expectedAspectRatio);
  });

  it('maintains aspect ratio when constrained by width', () => {
    const naturalWidth = 1600;
    const naturalHeight = 900;
    const result = flashcardImageDimensions(naturalWidth, naturalHeight, 350, 800);
    const expectedAspectRatio = naturalWidth / naturalHeight;
    const resultAspectRatio = result.width / result.height;
    expect(resultAspectRatio).toBeCloseTo(expectedAspectRatio);
  });
});
