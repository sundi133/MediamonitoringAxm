import { MediaMentionData } from "../components/MediaMention";

export interface SentimentDataPoint {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

export interface SentimentDistribution {
  name: string;
  value: number;
  fill: string;
}

/**
 * Generate sentiment trend data from mentions grouped by date
 */
export function generateSentimentTrendData(
  mentions: MediaMentionData[],
  days: number = 7,
): SentimentDataPoint[] {
  if (mentions.length === 0) {
    // Return empty data for the last 7 days
    return generateEmptyTrendData(days);
  }

  // Group mentions by date
  const mentionsByDate = new Map<string, MediaMentionData[]>();

  mentions.forEach((mention) => {
    const date = new Date(mention.publishedDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    if (!mentionsByDate.has(date)) {
      mentionsByDate.set(date, []);
    }
    mentionsByDate.get(date)!.push(mention);
  });

  // Generate data points for each date
  const dataPoints: SentimentDataPoint[] = [];

  // Get the last N days
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const dayMentions = mentionsByDate.get(dateStr) || [];

    dataPoints.push({
      date: dateStr,
      positive: dayMentions.filter((m) => m.sentiment === "positive").length,
      negative: dayMentions.filter((m) => m.sentiment === "negative").length,
      neutral: dayMentions.filter((m) => m.sentiment === "neutral").length,
    });
  }

  return dataPoints;
}

/**
 * Generate empty trend data for when there are no mentions
 */
function generateEmptyTrendData(days: number): SentimentDataPoint[] {
  const dataPoints: SentimentDataPoint[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    dataPoints.push({
      date: dateStr,
      positive: 0,
      negative: 0,
      neutral: 0,
    });
  }

  return dataPoints;
}

/**
 * Generate sentiment distribution data for pie chart
 */
export function generateSentimentDistribution(
  mentions: MediaMentionData[],
): SentimentDistribution[] {
  if (mentions.length === 0) {
    return [
      { name: "Positive", value: 0, fill: "#10b981" },
      { name: "Neutral", value: 0, fill: "#6b7280" },
      { name: "Negative", value: 0, fill: "#ef4444" },
    ];
  }

  const positive = mentions.filter((m) => m.sentiment === "positive").length;
  const negative = mentions.filter((m) => m.sentiment === "negative").length;
  const neutral = mentions.filter((m) => m.sentiment === "neutral").length;

  return [
    { name: "Positive", value: positive, fill: "#10b981" },
    { name: "Neutral", value: neutral, fill: "#6b7280" },
    { name: "Negative", value: negative, fill: "#ef4444" },
  ];
}
