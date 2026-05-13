import { btcKpis, chartPoints } from '../features/btc/model'
import { btcNews } from '../features/news/model'
import { useTheme } from '../features/theme/themeStore'
import './app-layout.css'

const chartPath = chartPoints
  .map((point, index) => {
    const x = String(index * 42 + 16)
    const y = String(120 - point)
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  })
  .join(' ')

export const AppLayout = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="app-shell">
      <aside className="nav-panel">
        <h1>BTC Tracker</h1>
        <nav>
          <a href="#">Dashboard</a>
          <a href="#">Portfolio</a>
          <a href="#">Alerts</a>
          <a href="#">Settings</a>
        </nav>
        <button type="button" onClick={toggleTheme}>
          Theme: {theme}
        </button>
      </aside>

      <main className="content-panel">
        <section className="kpi-grid">
          {btcKpis.map((kpi) => (
            <article key={kpi.label} className="card">
              <p>{kpi.label}</p>
              <h2>{kpi.value}</h2>
              <span className={kpi.positive ? 'up' : 'down'}>{kpi.delta}</span>
            </article>
          ))}
        </section>

        <section className="chart-card card">
          <h3>Price Trend</h3>
          <svg viewBox="0 0 320 120" role="img" aria-label="Bitcoin trend chart">
            <path d={chartPath} />
          </svg>
        </section>
      </main>

      <aside className="news-panel">
        <h3>Latest News</h3>
        {btcNews.map((item) => (
          <article key={item.title} className="news-item">
            <h4>{item.title}</h4>
            <p>
              {item.source} · {item.time}
            </p>
          </article>
        ))}
      </aside>
    </div>
  )
}
