import { LivePriceClient } from '../api/livePriceClient';
import { ConnectionState, Currency, PriceSnapshot } from '../api/types';

export interface LivePriceViewModel {
  priceText: string;
  changeText: string;
  lastUpdated: string;
  currency: Currency;
  liveIndicator: 'online' | 'degraded' | 'offline';
  connectionState: ConnectionState;
}

const liveStateToIndicator = (state: ConnectionState): LivePriceViewModel['liveIndicator'] => {
  if (state === 'live') return 'online';
  if (state === 'polling' || state === 'reconnecting') return 'degraded';
  return 'offline';
};

export const mapSnapshotToViewModel = (snapshot: PriceSnapshot): LivePriceViewModel => ({
  priceText:
    snapshot.ticker?.price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) ?? '—',
  changeText:
    snapshot.ticker?.changePercent24h == null ? '—' : `${snapshot.ticker.changePercent24h.toFixed(2)}%`,
  lastUpdated: snapshot.ticker?.lastUpdated ?? '—',
  currency: snapshot.ticker?.currency ?? 'USD',
  liveIndicator: liveStateToIndicator(snapshot.state),
  connectionState: snapshot.state,
});

export const createLivePriceStore = (currency: Currency = 'USD') => {
  const client = new LivePriceClient({ currency });
  return {
    start: () => client.start(),
    stop: () => client.stop(),
    subscribe: client.subscribe.bind(client),
  };
};
