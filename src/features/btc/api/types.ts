export type Currency = 'USD' | 'EUR';

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'live'
  | 'polling'
  | 'reconnecting'
  | 'error'
  | 'disconnected';

export interface NormalizedTicker {
  symbol: 'BTC';
  currency: Currency;
  price: number;
  changePercent24h: number | null;
  timestamp: number;
  lastUpdated: string;
}

export interface PriceSnapshot {
  ticker: NormalizedTicker | null;
  state: ConnectionState;
  isLive: boolean;
  source: string;
  error?: string;
}

export interface PriceProvider {
  readonly name: string;
  fetchTicker(currency: Currency): Promise<NormalizedTicker>;
  streamTicker?(
    currency: Currency,
    onData: (ticker: NormalizedTicker) => void,
    onError: (error: Error) => void,
  ): () => void;
}
