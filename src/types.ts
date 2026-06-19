export interface MediaMentionData {
  id: string;
  title: string;
  source: string;
  url: string;
  snippet: string;
  sentiment: "positive" | "negative" | "neutral";
  score?: number;
  sentimentScore?: number;
  publishedAt?: string;
  publishedDate: string;
  entities?: string[];
  keywords?: string[];
  image?: string; // og:image or article thumbnail
}
