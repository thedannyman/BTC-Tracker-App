const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('de-DE', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const btcFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 8,
});

export const formatCurrencyEur = (value: number): string => currencyFormatter.format(value);

export const formatPercent = (value: number): string => percentFormatter.format(value / 100);

export const formatBtc = (value: number): string => `${btcFormatter.format(value)} BTC`;
