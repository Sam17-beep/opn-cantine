import { describe, it, expect } from 'vitest';
import { computeStanding, startOfYearInZone } from './leaderboard';

const totals = (entries: Record<string, number>) =>
  Object.entries(entries).map(([cardNumber, total]) => ({ cardNumber, total }));

describe('startOfYearInZone', () => {
  it('returns Jan 1 midnight Toronto (EST, UTC-5) as a UTC instant', () => {
    const start = startOfYearInZone(new Date('2026-10-20T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-01-01T05:00:00.000Z');
  });

  it('keeps the previous year while it is still Dec 31 in Toronto', () => {
    // 03:00 UTC on Jan 1 is 22:00 on Dec 31 in Toronto.
    const start = startOfYearInZone(new Date('2027-01-01T03:00:00Z'));
    expect(start.toISOString()).toBe('2026-01-01T05:00:00.000Z');
  });

  it('rolls over at Toronto midnight, not UTC midnight', () => {
    const start = startOfYearInZone(new Date('2027-01-01T05:00:00Z'));
    expect(start.toISOString()).toBe('2027-01-01T05:00:00.000Z');
  });
});

describe('computeStanding', () => {
  it('reports the gap to the next strictly higher total', () => {
    const standing = computeStanding(totals({ a: 50, b: 30, c: 20 }), 'c');
    expect(standing).toEqual({
      rank: 3,
      participants: 3,
      total: 20,
      tied: false,
      gapToNext: 10,
      leadOverNext: null,
    });
  });

  it('shares a rank on ties and skips the next one (1, 2, 2, 4)', () => {
    const t = totals({ a: 50, b: 30, c: 30, d: 10 });
    expect(computeStanding(t, 'b')).toMatchObject({ rank: 2, tied: true, gapToNext: 20 });
    expect(computeStanding(t, 'c')).toMatchObject({ rank: 2, tied: true, gapToNext: 20 });
    expect(computeStanding(t, 'd')).toMatchObject({ rank: 4, tied: false, gapToNext: 20 });
  });

  it('gives the leader their lead over the next lower total', () => {
    expect(computeStanding(totals({ a: 50, b: 38.5 }), 'a')).toMatchObject({
      rank: 1,
      gapToNext: null,
      leadOverNext: 11.5,
    });
  });

  it('measures a tied leader against the next strictly lower total', () => {
    expect(computeStanding(totals({ a: 50, b: 50, c: 20 }), 'a')).toMatchObject({
      rank: 1,
      tied: true,
      leadOverNext: 30,
    });
  });

  it('has no lead to report when alone', () => {
    expect(computeStanding(totals({ a: 5 }), 'a')).toMatchObject({
      rank: 1,
      participants: 1,
      leadOverNext: null,
    });
  });

  it('does not rank or count zero spending', () => {
    const t = totals({ a: 5, b: 0 });
    expect(computeStanding(t, 'b')).toBeNull();
    expect(computeStanding(t, 'a')?.participants).toBe(1);
    expect(computeStanding(t, 'missing')).toBeNull();
  });

  it('compares in cents so float sums still tie', () => {
    const standing = computeStanding(totals({ a: 0.1 + 0.2, b: 0.3 }), 'a');
    expect(standing).toMatchObject({ rank: 1, tied: true, total: 0.3, leadOverNext: null });
  });
});
