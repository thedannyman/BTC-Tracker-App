import { describe, expect, it, vi } from 'vitest';
import { CoinbaseProvider, CoinGeckoProvider } from './providers';

describe('providers', () => {
  it('coinbase fetch parses payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { amount: '100.5' } }) }));
    const out = await new CoinbaseProvider().fetchTicker('USD');
    expect(out.price).toBe(100.5);
  });

  it('coingecko fetch parses payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ bitcoin: { usd: 200, usd_24h_change: 2, last_updated_at: 1710000000 } }) }));
    const out = await new CoinGeckoProvider().fetchTicker('USD');
    expect(out.changePercent24h).toBe(2);
  });

  it('throws on http errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(new CoinbaseProvider().fetchTicker('USD')).rejects.toThrow();
    await expect(new CoinGeckoProvider().fetchTicker('USD')).rejects.toThrow();
  });

  it('coinbase websocket parses ticker and handles close/error', () => {
    class MockWebSocket {
      static OPEN = 1;
      static last: MockWebSocket;
      readyState = 1;
      onopen: (() => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;
      send = vi.fn();
      close = vi.fn();
      constructor() { MockWebSocket.last = this; }
    }
    vi.stubGlobal('WebSocket', MockWebSocket as any);

    const onData = vi.fn();
    const onErr = vi.fn();
    const stop = new CoinbaseProvider().streamTicker!('USD', onData, onErr);
    const ws = MockWebSocket.last;

    ws.onopen?.();
    ws.onmessage?.({ data: JSON.stringify({ type: 'ticker', price: '100', open_24h: '80', time: '2026-01-01T00:00:00Z' }) });
    expect(onData).toHaveBeenCalledTimes(1);

    ws.onerror?.();
    ws.onclose?.();
    expect(onErr).toHaveBeenCalled();

    stop();
    expect(ws.close).toHaveBeenCalled();
  });
});
