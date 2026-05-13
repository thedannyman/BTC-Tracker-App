import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { fetchCryptoNews } from '../api/newsApi';
import { NormalizedNewsItem } from '../api/types';

const REFRESH_INTERVAL_MS = 45_000;

const formatAbsolute = (date: Date): string => {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatRelative = (date: Date): string => {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 1) {
    return 'gerade eben';
  }

  if (Math.abs(diffMinutes) < 60) {
    return `vor ${diffMinutes} Min.`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return `vor ${diffHours} Std.`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `vor ${diffDays} Tagen`;
};

const statusColor = (newsTime: Date): string => {
  const ageMinutes = (Date.now() - newsTime.getTime()) / 60000;

  if (ageMinutes <= 30) return '#16a34a';
  if (ageMinutes <= 120) return '#eab308';
  return '#94a3b8';
};

export default function LiveNewsPanel(): ReactElement {
  const [items, setItems] = useState<NormalizedNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const loadNews = async () => {
    try {
      setError(null);
      const news = await fetchCryptoNews();
      setItems(news);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'News konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNews();

    const intervalId = window.setInterval(() => {
      void loadNews();
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const visibleItems = useMemo(() => (showAll ? items : items.slice(0, 5)), [items, showAll]);

  return (
    <section aria-label="Live Krypto News" style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Live News</h2>
        <button type="button" onClick={() => setShowAll((prev) => !prev)}>
          {showAll ? 'Weniger anzeigen' : 'Alle News anzeigen'}
        </button>
      </header>

      {isLoading && <p>Lade aktuelle Nachrichten …</p>}

      {!isLoading && error && (
        <div role="alert">
          <p>Fehler: {error}</p>
          <button type="button" onClick={() => void loadNews()}>
            Erneut laden
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {visibleItems.map((item) => (
            <li key={item.id} style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
              <a href={item.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: statusColor(item.publishedAt),
                    }}
                  />
                  <strong>{item.source}</strong>
                  <time dateTime={item.publishedAt.toISOString()} title={formatAbsolute(item.publishedAt)}>
                    {formatRelative(item.publishedAt)}
                  </time>
                </div>
                <p style={{ margin: 0 }}>{item.title}</p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
