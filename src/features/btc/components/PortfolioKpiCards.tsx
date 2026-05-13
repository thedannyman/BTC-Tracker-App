import React, { useEffect, useMemo, useState } from 'react';
import { computePortfolioKpis, type PortfolioKpis } from '../domain/portfolio';
import { formatBtc, formatCurrencyEur, formatPercent } from '../utils/format';
import type { LivePriceStream } from '../live/priceStream';
import { KpiCard, type KpiTrend } from './KpiCard';

interface PortfolioKpiCardsProps {
  holdingsBtc: number;
  buyInPriceEur: number;
  initialLivePriceEur: number;
  livePriceStream: LivePriceStream;
}

interface KpiViewModel {
  label: string;
  value: string;
  trend: KpiTrend;
}

const buildKpiViewModels = (kpis: PortfolioKpis): KpiViewModel[] => {
  const pnlTrend: KpiTrend = kpis.gewinnVerlustEur > 0 ? 'positive' : kpis.gewinnVerlustEur < 0 ? 'negative' : 'neutral';

  return [
    { label: 'Bestand', value: formatBtc(kpis.bestandBtc), trend: 'neutral' },
    { label: 'Buy-in', value: formatCurrencyEur(kpis.buyInEur), trend: 'neutral' },
    { label: 'Investiert', value: formatCurrencyEur(kpis.investiertEur), trend: 'neutral' },
    { label: 'Aktueller Wert', value: formatCurrencyEur(kpis.aktuellerWertEur), trend: pnlTrend },
    { label: 'Gewinn / Verlust', value: formatCurrencyEur(kpis.gewinnVerlustEur), trend: pnlTrend },
    { label: 'Rendite', value: formatPercent(kpis.renditeProzent), trend: pnlTrend },
  ];
};

export const PortfolioKpiCards: React.FC<PortfolioKpiCardsProps> = ({
  holdingsBtc,
  buyInPriceEur,
  initialLivePriceEur,
  livePriceStream,
}) => {
  const [livePriceEur, setLivePriceEur] = useState(initialLivePriceEur);
  const [priceHistory, setPriceHistory] = useState<number[]>([initialLivePriceEur]);

  useEffect(() => livePriceStream.subscribe((nextPrice) => {
    setLivePriceEur(nextPrice);
    setPriceHistory((prev) => [...prev.slice(-19), nextPrice]);
  }), [livePriceStream]);

  const kpis = useMemo(() => computePortfolioKpis({ holdingsBtc, buyInPriceEur, livePriceEur }), [holdingsBtc, buyInPriceEur, livePriceEur]);
  const kpiCards = useMemo(() => buildKpiViewModels(kpis), [kpis]);

  return (
    <section className="kpi-grid" aria-label="Portfolio KPIs" aria-live="polite">
      {kpiCards.map((kpi) => (
        <KpiCard
          key={kpi.label}
          label={kpi.label}
          value={kpi.value}
          trend={kpi.trend}
          sparklinePoints={priceHistory}
          detail={`Livepreis: ${formatCurrencyEur(livePriceEur)}`}
        />
      ))}
    </section>
  );
};
