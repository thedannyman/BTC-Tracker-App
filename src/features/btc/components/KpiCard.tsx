import React, { useId } from 'react';

export type KpiTrend = 'positive' | 'negative' | 'neutral';

export interface KpiCardProps {
  label: string;
  value: string;
  trend?: KpiTrend;
  sparklinePoints?: number[];
  detail?: string;
}

const trendClassName: Record<KpiTrend, string> = {
  positive: 'kpi-card--positive',
  negative: 'kpi-card--negative',
  neutral: 'kpi-card--neutral',
};

const sparklineTrendLabel: Record<KpiTrend, string> = {
  positive: 'positiver Trend',
  negative: 'negativer Trend',
  neutral: 'seitwärts Trend',
};

const MiniSparkline: React.FC<{ points: number[]; trend: KpiTrend; labelId: string }> = ({ points, trend, labelId }) => {
  if (points.length < 2) return null;

  const width = 120;
  const height = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg className="kpi-sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={labelId}>
      <title id={labelId}>{sparklineTrendLabel[trend]}</title>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  trend = 'neutral',
  sparklinePoints = [],
  detail,
}) => {
  const sparklineId = useId();

  return (
    <article className={`kpi-card ${trendClassName[trend]}`} aria-label={`KPI ${label}`}>
      <header className="kpi-card__label">{label}</header>
      <strong className="kpi-card__value">{value}</strong>
      {detail ? <p className="kpi-card__detail">{detail}</p> : null}
      <MiniSparkline points={sparklinePoints} trend={trend} labelId={sparklineId} />
    </article>
  );
};
