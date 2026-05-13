import { describe, expect, it, vi } from 'vitest';
import { LivePriceClient } from './livePriceClient';
import { normalizeTicker } from './normalize';
import { PriceProvider } from './types';

const t = (price: number, ts = 1710000000) => normalizeTicker({ price, timestamp: ts, currency: 'USD' });

describe('LivePriceClient', () => {
  it('prefers websocket and emits connecting early', () => {
    const streamTicker = vi.fn((_c, onData) => {
      onData(t(100));
      return () => {};
    });
    const p1: PriceProvider = { name: 'p1', fetchTicker: vi.fn(), streamTicker };
    const p2: PriceProvider = { name: 'p2', fetchTicker: vi.fn() };
    const client = new LivePriceClient({ providers: [p1, p2], emitThrottleMs: 0 });
    const seen: string[] = [];
    client.subscribe((s) => seen.push(s.state));
    client.start();
    expect(seen[0]).toBe('connecting');
    expect(seen).toContain('live');
  });

  it('falls back to polling and switches provider with backoff on errors', async () => {
    vi.useFakeTimers();
    const p1: PriceProvider = { name: 'p1', fetchTicker: vi.fn().mockRejectedValue(new Error('x')), streamTicker: vi.fn((_c, _d, onErr) => { onErr(new Error('down')); return () => {}; }) };
    const p2: PriceProvider = { name: 'p2', fetchTicker: vi.fn().mockResolvedValue(t(101)) };
    const client = new LivePriceClient({ providers: [p1, p2], basePollMs: 1000, emitThrottleMs: 0 });
    const states: string[] = [];
    client.subscribe((s) => states.push(s.state));
    client.start();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();
    expect(p2.fetchTicker).toHaveBeenCalled();
    expect(states).toContain('polling');
    vi.useRealTimers();
  });

  it('throttles repeated state emissions and suppresses unnecessary ticker emits', () => {
    const p1: PriceProvider = { name: 'p1', fetchTicker: vi.fn(), streamTicker: vi.fn((_c, onData) => { onData(t(100)); onData(t(100)); return () => {}; }) };
    const p2: PriceProvider = { name: 'p2', fetchTicker: vi.fn() };
    const client = new LivePriceClient({ providers: [p1, p2], emitThrottleMs: 1000 });
    const snapshots: number[] = [];
    client.subscribe((s) => { if (s.ticker) snapshots.push(s.ticker.price); });
    client.start();
    expect(snapshots.length).toBe(1);
  });

  it('marks stream stale as reconnecting after timeout', async () => {
    vi.useFakeTimers();
    let push: ((x: any) => void) | undefined;
    const p1: PriceProvider = { name: 'p1', fetchTicker: vi.fn(), streamTicker: vi.fn((_c, onData) => { push = onData; return () => {}; }) };
    const p2: PriceProvider = { name: 'p2', fetchTicker: vi.fn() };
    const client = new LivePriceClient({ providers: [p1, p2], staleAfterMs: 500, emitThrottleMs: 0 });
    const states: string[] = [];
    client.subscribe((s) => states.push(s.state));
    client.start();
    push?.(t(100));
    await vi.advanceTimersByTimeAsync(600);
    expect(states).toContain('reconnecting');
    vi.useRealTimers();
  });
});
