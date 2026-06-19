import { Card, CardContent } from "./ui/card";
import { MetricCards } from "./MetricCards";
import { MediaMentionData } from "./MediaMention";
import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { Filter, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { ArticleCard } from "./ArticleCard";
import { Button } from "./ui/button";

interface DashboardTabProps {
  metrics: {
    totalMentions: number;
    negativeMentions: number;
    sentimentScore: number;
    alertsCount: number;
  };
  mentions: MediaMentionData[];
  hasActiveFilters?: boolean;
  filterDescription?: string;
}

export function DashboardTab({
  metrics,
  mentions,
  hasActiveFilters = false,
  filterDescription = "",
}: DashboardTabProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [, setTick] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 12;

  // Update timestamp whenever mentions change
  useEffect(() => {
    setLastUpdate(new Date());
    setCurrentPage(1); // Reset to first page when mentions change
  }, [mentions]);

  // Force re-render every 5 seconds to update "X seconds ago" display
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Pagination logic
  const totalPages = Math.ceil(mentions.length / articlesPerPage);
  const startIndex = (currentPage - 1) * articlesPerPage;
  const endIndex = startIndex + articlesPerPage;
  const currentArticles = mentions.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Format last update time
  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 10) return "just now";
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;

    return date.toLocaleTimeString();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-medium text-muted-foreground">
            Last updated: {formatLastUpdate(lastUpdate)}
          </span>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl shadow-sm">
          <Filter className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            Dashboard showing filtered data: {filterDescription}
          </span>
          <Badge
            variant="secondary"
            className="ml-auto bg-white dark:bg-slate-800 shadow-sm"
          >
            {metrics.totalMentions} mentions
          </Badge>
        </div>
      )}

      <MetricCards {...metrics} />

      {/* Articles Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Latest Media Articles
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mentions.length > 0
                ? `Showing ${startIndex + 1}-${Math.min(endIndex, mentions.length)} of ${mentions.length} articles`
                : "No articles found"}
            </p>
          </div>
        </div>

        {mentions.length === 0 ? (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
            <CardContent className="text-center py-16">
              <div className="inline-flex p-4 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl mb-4">
                <Filter className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-muted-foreground">
                No articles available. Use Media Inquiry to fetch news.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  variant="outline"
                  className="flex items-center gap-2 rounded-xl shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page{" "}
                    <span className="font-semibold text-foreground">
                      {currentPage}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-foreground">
                      {totalPages}
                    </span>
                  </span>
                </div>

                <Button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  className="flex items-center gap-2 rounded-xl shadow-sm"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
