import { describe, it, expect } from 'vitest';
import { computeFitDimensions } from './computeFitDimensions';

describe('computeFitDimensions', () => {
  it('constrains by width when source is wider than container', () => {
    const result = computeFitDimensions(1920, 1080, 800, 600);
    expect(result.width).toBe(800);
    expect(result.height).toBeCloseTo(450);
  });

  it('constrains by height when source is taller than container', () => {
    const result = computeFitDimensions(1080, 1920, 800, 600);
    expect(result.height).toBe(600);
    expect(result.width).toBeCloseTo(337.5);
  });

  it('preserves aspect ratio for square source in landscape container', () => {
    const result = computeFitDimensions(500, 500, 800, 400);
    expect(result.height).toBe(400);
    expect(result.width).toBe(400);
  });

  it('preserves aspect ratio for square source in portrait container', () => {
    const result = computeFitDimensions(500, 500, 400, 800);
    expect(result.width).toBe(400);
    expect(result.height).toBe(400);
  });

  it('fills container exactly when aspect ratios match', () => {
    const result = computeFitDimensions(1920, 1080, 960, 540);
    expect(result.width).toBeCloseTo(960);
    expect(result.height).toBeCloseTo(540);
  });

  it('never exceeds container bounds', () => {
    const result = computeFitDimensions(4000, 3000, 300, 200);
    expect(result.width).toBeLessThanOrEqual(300);
    expect(result.height).toBeLessThanOrEqual(200);
  });
});
