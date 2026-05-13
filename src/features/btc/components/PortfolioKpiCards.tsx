import React, { useEffect, useMemo, useState } from 'react';
import { computePortfolioKpis } from '../domain/portfolio';
import { formatBtc, formatCurrencyEur, formatPercent } from '../utils/format';
import type { LivePriceStream } from '../live/priceStream';
import { KpiCard } from './KpiCard';

interface PortfolioKpiCardsProps {
  holdingsBtc: number;
  buyInPriceEur: number;
  initialLivePriceEur: number;
  livePriceStream: LivePriceStream;
}

export const PortfolioKpiCards: React.FC<PortfolioKpiCardsProps> = ({
  holdingsBtc,
  buyInPriceEur,
  initialLivePriceEur,
  livePriceStream,
}) => {
  const [livePriceEur, setLivePriceEur] = useState(initialLivePriceEur);
  const [priceHistory, setPriceHistory] = useState<number[]>([initialLivePriceEur]);

  useEffect(() => {
    return livePriceStream.subscribe((nextPrice) => {
      setLivePriceEur(nextPrice);
      setPriceHistory((prev) => [...prev.slice(-19), nextPrice]);
    });
  }, [livePriceStream]);

  const kpis = useMemo(
    () =>
      computePortfolioKpis({
        holdingsBtc,
        buyInPriceEur,
        livePriceEur,
      }),
    [holdingsBtc, buyInPriceEur, livePriceEur],
  );

  const pnlTrend = kpis.gewinnVerlustEur > 0 ? 'positive' : kpis.gewinnVerlustEur < 0 ? 'negative' : 'neutral';

  return (
    <section className="kpi-grid" aria-label="Portfolio KPIs">
      <KpiCard label="Bestand" value={formatBtc(kpis.bestandBtc)} trend="neutral" sparklinePoints={priceHistory} />
      <KpiCard label="Buy-in" value={formatCurrencyEur(kpis.buyInEur)} trend="neutral" sparklinePoints={priceHistory} />
      <KpiCard label="Investiert" value={formatCurrencyEur(kpis.investiertEur)} trend="neutral" sparklinePoints={priceHistory} />
      <KpiCard label="Aktueller Wert" value={formatCurrencyEur(kpis.aktuellerWertEur)} trend={pnlTrend} sparklinePoints={priceHistory} />
      <KpiCard label="Gewinn / Verlust" value={formatCurrencyEur(kpis.gewinnVerlustEur)} trend={pnlTrend} sparklinePoints={priceHistory} />
      <KpiCard label="Rendite" value={formatPercent(kpis.renditeProzent)} trend={pnlTrend} sparklinePoints={priceHistory} />
    </section>
  );
};
