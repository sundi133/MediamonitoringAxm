import { MediaMentionData } from "../types";
import { ChatInterface } from "./ChatInterface";

interface MentionsTabProps {
  filteredMentions: MediaMentionData[];
  searchTerm: string;
  sentimentFilter: "all" | "positive" | "negative" | "neutral";
  timeRange: "day" | "week" | "month";
  loading?: boolean;
  lastFetchTime?: Date | null;
  searchProgress?: { current: number; total: number; currentKeyword: string };
  highlightedMentionId?: string | null;
  searchReport?: string | null;
  currentSearchQuery?: string;
  isStreamingReport?: boolean;
  onSearchChange: (term: string) => void;
  onSentimentFilterChange: (
    filter: "all" | "positive" | "negative" | "neutral",
  ) => void;
  onTimeRangeChange: (range: "day" | "week" | "month") => void;
  onDeleteMention: (id: string) => void;
  onRefresh?: () => void;
  onAiSearch?: (
    description: string,
    timeRange?: "hour" | "day" | "week" | "month",
  ) => Promise<void>;
}

export function MentionsTab({
  filteredMentions,
  loading = false,
  highlightedMentionId,
  searchReport,
  currentSearchQuery,
  searchProgress,
  isStreamingReport,
  onDeleteMention,
  onAiSearch,
}: MentionsTabProps) {
  const handleSearch = async (
    query: string,
    timeRange?: "hour" | "day" | "week" | "month",
  ) => {
    if (onAiSearch) {
      await onAiSearch(query, timeRange);
    }
  };

  return (
    <ChatInterface
      onSearch={handleSearch}
      searchReport={searchReport || undefined}
      currentSearchQuery={currentSearchQuery}
      filteredMentions={filteredMentions}
      loading={loading}
      onDeleteMention={onDeleteMention}
      highlightedMentionId={highlightedMentionId}
      searchProgress={searchProgress}
      isStreamingReport={isStreamingReport}
    />
  );
}
