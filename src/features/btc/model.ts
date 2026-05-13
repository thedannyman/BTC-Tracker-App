export interface KpiCard {
  label: string
  value: string
  delta: string
  positive: boolean
}

export const btcKpis: KpiCard[] = [
  { label: 'BTC Price', value: '$67,420', delta: '+2.8%', positive: true },
  { label: '24h Volume', value: '$28.4B', delta: '-1.2%', positive: false },
  { label: 'Market Cap', value: '$1.32T', delta: '+1.5%', positive: true },
]

export const chartPoints = [42, 50, 45, 57, 60, 58, 64, 67]
