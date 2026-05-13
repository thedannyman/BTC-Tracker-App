import { shouldEmitTicker } from './normalize';
import { CoinbaseProvider, CoinGeckoProvider } from './providers';
import { ConnectionState, Currency, NormalizedTicker, PriceSnapshot, PriceProvider } from './types';

interface LivePriceClientOptions {
  currency?: Currency;
  basePollMs?: number;
  maxBackoffMs?: number;
  emitThrottleMs?: number;
  providers?: [PriceProvider, PriceProvider];
}

type Listener = (snapshot: PriceSnapshot) => void;

export class LivePriceClient {
  private currency: Currency;
  private basePollMs: number;
  private maxBackoffMs: number;
  private emitThrottleMs: number;
  private providers: [PriceProvider, PriceProvider];

  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopStream: (() => void) | null = null;
  private currentTicker: NormalizedTicker | null = null;
  private activeProviderIndex = 0;
  private failCount = 0;
  private lastEmitAt = 0;
  private snapshot: PriceSnapshot | null = null;

  constructor(options: LivePriceClientOptions = {}) {
    this.currency = options.currency ?? 'USD';
    this.basePollMs = options.basePollMs ?? 1_000;
    this.maxBackoffMs = options.maxBackoffMs ?? 30_000;
    this.emitThrottleMs = options.emitThrottleMs ?? 250;
    this.providers = options.providers ?? [new CoinbaseProvider(), new CoinGeckoProvider()];
  }

  start(): void {
    this.transition('connecting');

    const primary = this.providers[0];
    if (primary.streamTicker) {
      this.attachStream(primary);
      return;
    }

    this.transition('polling');
    this.schedulePoll(0);
  }

  stop(): void {
    this.stopStream?.();
    this.stopStream = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.transition('disconnected');
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.snapshot) listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  private attachStream(provider: PriceProvider): void {
    this.transition('connecting', provider.name);
    this.stopStream = provider.streamTicker?.(
      this.currency,
      (ticker) => {
        this.failCount = 0;
        this.activeProviderIndex = 0;
        this.handleTicker(ticker, provider.name, 'live', true);
      },
      () => {
        this.stopStream?.();
        this.stopStream = null;
        this.transition('reconnecting', provider.name);
        this.schedulePoll(0);
      },
    ) ?? null;
  }

  private async pollOnce(): Promise<void> {
    const provider = this.providers[this.activeProviderIndex];
    try {
      const ticker = await provider.fetchTicker(this.currency);
      this.failCount = 0;
      this.handleTicker(ticker, provider.name, 'polling', false);
      this.schedulePoll(this.basePollMs);
    } catch (error) {
      this.failCount += 1;
      const fallbackIndex = this.activeProviderIndex === 0 ? 1 : 0;
      const canFallback = fallbackIndex < this.providers.length;
      if (canFallback) this.activeProviderIndex = fallbackIndex;

      const delay = Math.min(this.basePollMs * 2 ** this.failCount, this.maxBackoffMs);
      this.transition('error', provider.name, error instanceof Error ? error.message : 'Unknown polling error');
      this.schedulePoll(delay);
    }
  }

  private schedulePoll(delayMs: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.transition('polling', this.providers[this.activeProviderIndex].name);
      void this.pollOnce();
    }, delayMs);
  }

  private handleTicker(
    ticker: NormalizedTicker,
    source: string,
    state: ConnectionState,
    isLive: boolean,
  ): void {
    if (!shouldEmitTicker(this.currentTicker, ticker)) return;

    this.currentTicker = ticker;
    this.transition(state, source, undefined, ticker, isLive);
  }

  private transition(
    state: ConnectionState,
    source = this.providers[this.activeProviderIndex].name,
    error?: string,
    ticker = this.currentTicker,
    isLive = false,
  ): void {
    const now = Date.now();
    if (now - this.lastEmitAt < this.emitThrottleMs && state === this.snapshot?.state && !error) {
      return;
    }

    if (!ticker) return;

    this.snapshot = { ticker, state, isLive, source, error };
    this.lastEmitAt = now;

    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}
