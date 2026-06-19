import { Header } from "./Header";
import { MentionsTab } from "./MentionsTab";
import { TimelineTab } from "./TimelineTab";
import { useAppState } from "../hooks/useAppState";
import { useAuth } from "../contexts/AuthContext";
import { Toaster } from "./ui/sonner";
import { useState } from "react";

export function AuthenticatedApp() {
  const { accessToken, user } = useAuth();

  const {
    mentions,
    keywords,
    sources,
    searchTerm,
    sentimentFilter,
    timeRange,
    filteredMentions,
    metrics,
    filteredMetrics,
    loading,
    lastFetchTime,
    searchProgress,
    recentScanMentions,
    searchReport,
    currentSearchQuery,
    isStreamingReport,
    setKeywords,
    setSources,
    setSearchTerm,
    setSentimentFilter,
    setTimeRange,
    handleDeleteMention,
    refreshMentions,
    refreshMentionsEnhanced,
    handleAiSearch,
  } = useAppState(accessToken, user?.id || null);

  // Determine if there are active filters
  const hasActiveFilters = searchTerm !== "" || sentimentFilter !== "all";

  // Generate filter description
  const getFilterDescription = () => {
    const parts = [];
    if (searchTerm) parts.push(`search: \"${searchTerm}\"`);
    if (sentimentFilter !== "all") parts.push(`sentiment: ${sentimentFilter}`);
    return parts.join(", ");
  };

  // State for highlighted mention
  const [highlightedMentionId, setHighlightedMentionId] = useState<
    string | null
  >(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"inquiry" | "timeline">("inquiry");

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 min-h-0">
        {/* Keep both tabs mounted but hide inactive one to preserve state during ongoing searches */}
        <div className={activeTab === "inquiry" ? "h-full" : "hidden"}>
          <MentionsTab
            filteredMentions={filteredMentions}
            searchTerm={searchTerm}
            sentimentFilter={sentimentFilter}
            timeRange={timeRange}
            loading={loading}
            lastFetchTime={lastFetchTime}
            searchProgress={searchProgress}
            highlightedMentionId={highlightedMentionId}
            searchReport={searchReport}
            currentSearchQuery={currentSearchQuery}
            isStreamingReport={isStreamingReport}
            onSearchChange={setSearchTerm}
            onSentimentFilterChange={setSentimentFilter}
            onTimeRangeChange={setTimeRange}
            onDeleteMention={handleDeleteMention}
            onRefresh={refreshMentionsEnhanced}
            onAiSearch={handleAiSearch}
          />
        </div>

        <div
          className={
            activeTab === "timeline" ? "h-full overflow-y-auto" : "hidden"
          }
        >
          <div className="container mx-auto px-6 py-6 pb-12">
            <TimelineTab
              mentions={mentions}
              onDeleteMention={handleDeleteMention}
              loading={loading}
            />
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
