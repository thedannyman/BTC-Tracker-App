import { describe, expect, it } from 'vitest';
import { mapSnapshotToViewModel } from './livePriceStore';
import { normalizeTicker } from '../api/normalize';

describe('mapSnapshotToViewModel', () => {
  const ticker = normalizeTicker({ price: 12345.678, changePercent24h: 1.234, timestamp: 1710000000, currency: 'USD' });

  it('maps online state and formatting', () => {
    const vm = mapSnapshotToViewModel({ ticker, state: 'live', isLive: true, source: 'x' });
    expect(vm.liveIndicator).toBe('online');
    expect(vm.priceText).toContain('12,345.68');
    expect(vm.changeText).toBe('1.23%');
  });

  it('maps degraded/offline and empty ticker placeholders', () => {
    expect(mapSnapshotToViewModel({ ticker: null, state: 'polling', isLive: false, source: 'x' }).liveIndicator).toBe('degraded');
    const off = mapSnapshotToViewModel({ ticker: null, state: 'error', isLive: false, source: 'x' });
    expect(off.liveIndicator).toBe('offline');
    expect(off.priceText).toBe('—');
  });
});
