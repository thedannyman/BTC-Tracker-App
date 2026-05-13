import { Currency, NormalizedTicker } from './types';

interface RawTickerInput {
  price: number | string;
  changePercent24h?: number | string | null;
  timestamp?: number | string | Date;
  currency: string;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toTimestampMs = (value?: number | string | Date): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value > 1e12 ? value : value * 1_000;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric > 1e12 ? numeric : numeric * 1_000;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
};

const formatLastUpdated = (timestampMs: number): string => {
  return new Date(timestampMs).toISOString().replace(/\.\d{3}Z$/, 'Z');
};

export const normalizeTicker = (input: RawTickerInput): NormalizedTicker => {
  const price = toNumber(input.price);
  if (price === null) {
    throw new Error('Ticker normalization failed: invalid price payload.');
  }

  const currency = (input.currency || 'USD').toUpperCase() as Currency;
  if (currency !== 'USD' && currency !== 'EUR') {
    throw new Error(`Ticker normalization failed: unsupported currency "${input.currency}".`);
  }

  const changeValue = toNumber(input.changePercent24h);
  const timestamp = toTimestampMs(input.timestamp);

  return {
    symbol: 'BTC',
    currency,
    price,
    changePercent24h: changeValue,
    timestamp,
    lastUpdated: formatLastUpdated(timestamp),
  };
};

export const shouldEmitTicker = (
  previous: NormalizedTicker | null,
  next: NormalizedTicker,
  epsilon = 0.01,
): boolean => {
  if (!previous) return true;

  const priceDelta = Math.abs(previous.price - next.price);
  const changeDelta = Math.abs((previous.changePercent24h ?? 0) - (next.changePercent24h ?? 0));

  return (
    priceDelta >= epsilon ||
    changeDelta >= 0.01 ||
    previous.currency !== next.currency ||
    previous.lastUpdated !== next.lastUpdated
  );
};
