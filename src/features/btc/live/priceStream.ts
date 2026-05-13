export type PriceListener = (priceEur: number) => void;

export interface LivePriceStream {
  subscribe: (listener: PriceListener) => () => void;
}

export class SimpleLivePriceStream implements LivePriceStream {
  private listeners = new Set<PriceListener>();

  subscribe(listener: PriceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(priceEur: number): void {
    for (const listener of this.listeners) {
      listener(priceEur);
    }
  }
}
