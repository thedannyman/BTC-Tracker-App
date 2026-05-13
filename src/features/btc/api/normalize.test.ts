import { describe, expect, it } from 'vitest';
import { normalizeTicker, shouldEmitTicker } from './normalize';

describe('normalizeTicker', () => {
  it('normalizes string/number inputs', () => {
    const out = normalizeTicker({ price: '50000.12', changePercent24h: 2.5, timestamp: 1710000000, currency: 'usd' });
    expect(out.price).toBe(50000.12);
    expect(out.currency).toBe('USD');
    expect(out.timestamp).toBe(1710000000_000);
  });

  it('supports millisecond timestamps', () => {
    const out = normalizeTicker({ price: 1, timestamp: 1710000000000, currency: 'EUR' });
    expect(out.timestamp).toBe(1710000000000);
  });

  it('throws for invalid price and currency', () => {
    expect(() => normalizeTicker({ price: 'abc', currency: 'USD' })).toThrow();
    expect(() => normalizeTicker({ price: 1, currency: 'JPY' })).toThrow();
  });
});

describe('shouldEmitTicker', () => {
  const base = normalizeTicker({ price: 100, changePercent24h: 1, timestamp: 1710000000, currency: 'USD' });

  it('emits when no previous ticker', () => {
    expect(shouldEmitTicker(null, base)).toBe(true);
  });

  it('does not emit for tiny delta', () => {
    const next = { ...base, price: 100.001, lastUpdated: base.lastUpdated };
    expect(shouldEmitTicker(base, next)).toBe(false);
  });

  it('emits on change%, currency and lastUpdated changes', () => {
    expect(shouldEmitTicker(base, { ...base, changePercent24h: 1.2 })).toBe(true);
    expect(shouldEmitTicker(base, { ...base, currency: 'EUR' })).toBe(true);
    expect(shouldEmitTicker(base, { ...base, lastUpdated: '2026-01-01T00:00:01Z' })).toBe(true);
  });
});
