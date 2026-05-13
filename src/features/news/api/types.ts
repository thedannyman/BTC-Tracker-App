export type RawCryptoNewsItem = {
  title?: string;
  source_info?: { name?: string };
  source?: string;
  provider?: string;
  published_on?: number;
  publishedAt?: string;
  url?: string;
  link?: string;
};

export type NormalizedNewsItem = {
  id: string;
  title: string;
  source: string;
  publishedAt: Date;
  url: string;
};
