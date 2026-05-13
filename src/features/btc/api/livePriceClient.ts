import { shouldEmitTicker } from './normalize';
import { CoinbaseProvider, CoinGeckoProvider } from './providers';
import { ConnectionState, Currency, NormalizedTicker, PriceSnapshot, PriceProvider, ProviderError } from './types';

interface LivePriceClientOptions {
  currency?: Currency;
  basePollMs?: number;
  maxBackoffMs?: number;
  emitThrottleMs?: number;
  staleAfterMs?: number;
  jitterRatio?: number;
  providers?: [PriceProvider, PriceProvider];
}

type Listener = (snapshot: PriceSnapshot) => void;

export class LivePriceClient {
  private currency: Currency;
  private basePollMs: number;
  private maxBackoffMs: number;
  private emitThrottleMs: number;
  private staleAfterMs: number;
  private jitterRatio: number;
  private providers: [PriceProvider, PriceProvider];
  private failoverCount = 0;

  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private staleTimer: ReturnType<typeof setTimeout> | null = null;
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
    this.staleAfterMs = options.staleAfterMs ?? 5_000;
    this.jitterRatio = options.jitterRatio ?? 0.25;
    this.providers = options.providers ?? [new CoinbaseProvider(), new CoinGeckoProvider()];
  }

  start(): void { this.transition('connecting'); this.providers[0].streamTicker ? this.attachStream(this.providers[0]) : (this.transition('polling'), this.schedulePoll(0)); }
  stop(): void { this.stopStream?.(); if (this.timer) clearTimeout(this.timer); if (this.staleTimer) clearTimeout(this.staleTimer); this.transition('disconnected'); }
  subscribe(listener: Listener): () => void { this.listeners.add(listener); if (this.snapshot) listener(this.snapshot); return () => this.listeners.delete(listener); }

  private attachStream(provider: PriceProvider): void {
    this.transition('connecting', provider.name);
    this.stopStream = provider.streamTicker?.(this.currency, (ticker) => {
      this.failCount = 0;
      this.activeProviderIndex = 0;
      this.handleTicker(ticker, provider.name, 'live', true);
    }, () => {
      this.transition('reconnecting', provider.name);
      this.schedulePoll(0);
    }) ?? null;
  }

  private computeBackoffMs(retryAfterMs?: number): number {
    if (retryAfterMs && retryAfterMs > 0) return Math.min(retryAfterMs, this.maxBackoffMs);
    const base = Math.min(this.basePollMs * 2 ** this.failCount, this.maxBackoffMs);
    const jitter = base * this.jitterRatio * Math.random();
    return Math.round(base + jitter);
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
      const typed = error instanceof ProviderError ? error : new ProviderError('Unknown polling error');
      const fallbackIndex = this.activeProviderIndex === 0 ? 1 : 0;
      if (fallbackIndex < this.providers.length && fallbackIndex !== this.activeProviderIndex) {
        this.activeProviderIndex = fallbackIndex;
        this.failoverCount += 1;
      }
      const delay = this.computeBackoffMs(typed.retryAfterMs);
      this.transition('error', provider.name, typed.message);
      this.schedulePoll(delay);
    }
  }

  private schedulePoll(delayMs: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.transition('polling', this.providers[this.activeProviderIndex].name); void this.pollOnce(); }, delayMs);
  }

  private armStaleTimer(): void {
    if (this.staleTimer) clearTimeout(this.staleTimer);
    this.staleTimer = setTimeout(() => {
      if (this.snapshot?.state === 'live') this.transition('reconnecting', this.snapshot.source, 'stale stream');
    }, this.staleAfterMs);
  }

  private handleTicker(ticker: NormalizedTicker, source: string, state: ConnectionState, isLive: boolean): void {
    if (!shouldEmitTicker(this.currentTicker, ticker)) return;
    this.currentTicker = ticker;
    this.transition(state, source, undefined, ticker, isLive);
    this.armStaleTimer();
  }

  private transition(state: ConnectionState, source = this.providers[this.activeProviderIndex].name, error?: string, ticker = this.currentTicker, isLive = false): void {
    const now = Date.now();
    if (now - this.lastEmitAt < this.emitThrottleMs && state === this.snapshot?.state && !error) return;
    this.snapshot = { ticker, state, isLive, source, error, meta: { failoverCount: this.failoverCount, consecutiveFailures: this.failCount } };
    this.lastEmitAt = now;
    this.listeners.forEach((listener) => listener(this.snapshot!));
  }
}
