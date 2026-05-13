import { normalizeTicker } from './normalize';
import { Currency, NormalizedTicker, PriceProvider } from './types';

export class CoinbaseProvider implements PriceProvider {
  readonly name = 'coinbase';

  async fetchTicker(currency: Currency): Promise<NormalizedTicker> {
    const res = await fetch(`https://api.coinbase.com/v2/prices/BTC-${currency}/spot`);
    if (!res.ok) {
      throw new Error(`Coinbase fetch failed (${res.status}).`);
    }

    const body = await res.json();
    return normalizeTicker({
      price: body?.data?.amount,
      currency,
      timestamp: Date.now(),
    });
  }

  streamTicker(
    currency: Currency,
    onData: (ticker: NormalizedTicker) => void,
    onError: (error: Error) => void,
  ): () => void {
    const product = `BTC-${currency}`;
    const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'subscribe',
          channels: [{ name: 'ticker', product_ids: [product] }],
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string);
        if (payload.type !== 'ticker') return;

        const ticker = normalizeTicker({
          price: payload.price,
          changePercent24h: payload.open_24h
            ? ((Number(payload.price) - Number(payload.open_24h)) / Number(payload.open_24h)) * 100
            : null,
          currency,
          timestamp: payload.time,
        });

        onData(ticker);
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Unknown websocket parsing error.'));
      }
    };

    ws.onerror = () => onError(new Error('Coinbase websocket connection failed.'));
    ws.onclose = () => onError(new Error('Coinbase websocket closed.'));

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'unsubscribe',
            channels: [{ name: 'ticker', product_ids: [product] }],
          }),
        );
      }
      ws.close();
    };
  }
}

export class CoinGeckoProvider implements PriceProvider {
  readonly name = 'coingecko';

  async fetchTicker(currency: Currency): Promise<NormalizedTicker> {
    const mappedCurrency = currency.toLowerCase();
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${mappedCurrency}&include_24hr_change=true&include_last_updated_at=true`,
    );

    if (!res.ok) {
      throw new Error(`CoinGecko fetch failed (${res.status}).`);
    }

    const body = await res.json();
    const node = body?.bitcoin;

    return normalizeTicker({
      price: node?.[mappedCurrency],
      changePercent24h: node?.[`${mappedCurrency}_24h_change`],
      timestamp: node?.last_updated_at,
      currency,
    });
  }
}
