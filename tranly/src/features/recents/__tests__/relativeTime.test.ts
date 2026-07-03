import { describe, it, expect } from 'vitest';
import { relativeTimeTh } from '../utils/relativeTime';

describe('relativeTimeTh', () => {
  const now = new Date('2026-07-02T12:00:00Z');

  it('returns "เมื่อวาน" for a timestamp ~30 hours ago', () => {
    const then = new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString();
    expect(relativeTimeTh(then, now)).toBe('เมื่อวาน');
  });

  it('returns "N วันที่ผ่านมา" for a timestamp ~50 hours ago', () => {
    const then = new Date(now.getTime() - 50 * 60 * 60 * 1000).toISOString();
    expect(relativeTimeTh(then, now)).toBe('2 วันที่ผ่านมา');
  });
});
