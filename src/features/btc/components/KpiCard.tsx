import React from 'react';

export type KpiTrend = 'positive' | 'negative' | 'neutral';

export interface KpiCardProps {
  label: string;
  value: string;
  trend?: KpiTrend;
  sparklinePoints?: number[];
}

const trendClassName: Record<KpiTrend, string> = {
  positive: 'kpi-card--positive',
  negative: 'kpi-card--negative',
  neutral: 'kpi-card--neutral',
};

const MiniSparkline: React.FC<{ points: number[] }> = ({ points }) => {
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
    <svg className="kpi-sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  trend = 'neutral',
  sparklinePoints = [],
}) => (
  <article className={`kpi-card ${trendClassName[trend]}`}>
    <header className="kpi-card__label">{label}</header>
    <strong className="kpi-card__value">{value}</strong>
    <MiniSparkline points={sparklinePoints} />
  </article>
);
