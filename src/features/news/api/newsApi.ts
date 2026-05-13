import { NormalizedNewsItem, RawCryptoNewsItem } from './types';

const CRYPTOCOMPARE_NEWS_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
const MAX_NEWS_ITEMS = 12;

const normalizeNews = (items: RawCryptoNewsItem[]): NormalizedNewsItem[] => {
  return items
    .map((item) => {
      const title = item.title?.trim() ?? '';
      const source = item.source_info?.name ?? item.source ?? item.provider ?? 'Unbekannt';
      const publishedAtEpochSeconds = item.published_on;
      const publishedAtIso = item.publishedAt;
      const publishedAt = publishedAtEpochSeconds
        ? new Date(publishedAtEpochSeconds * 1000)
        : publishedAtIso
          ? new Date(publishedAtIso)
          : new Date();
      const url = item.url ?? item.link ?? '#';

      return {
        id: `${source}-${publishedAt.getTime()}-${title}`,
        title,
        source,
        publishedAt,
        url,
      };
    })
    .filter((item) => item.title.length > 0)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, MAX_NEWS_ITEMS);
};

export const fetchCryptoNews = async (): Promise<NormalizedNewsItem[]> => {
  const response = await fetch(CRYPTOCOMPARE_NEWS_URL, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`News API Fehler (${response.status})`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload?.Data)) {
    throw new Error('Unerwartetes News-Format.');
  }

  return normalizeNews(payload.Data as RawCryptoNewsItem[]);
};
