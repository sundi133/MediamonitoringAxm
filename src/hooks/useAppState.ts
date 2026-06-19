import { useState, useMemo, useEffect, useCallback } from "react";
import { MediaMentionData } from "../components/MediaMention";
import { Alert } from "../components/AlertsPanel";
import {
  mockAlerts,
  initialKeywords,
  initialSources,
  mockMentions,
} from "../data/mockData";
import { tavilyService } from "../services/tavilyService";
import { settingsService } from "../services/settingsService";
import { dataService } from "../services/dataService";
import { MonitoringSource } from "../types/settings";
import { toast } from "sonner@2.0.3";

export function useAppState(accessToken: string | null, userId: string | null) {
  // Start with mock data to show dashboard content immediately
  const [mentions, setMentions] = useState<MediaMentionData[]>(mockMentions);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [sources, setSources] = useState(initialSources);
  const [searchTerm, setSearchTerm] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<
    "all" | "positive" | "negative" | "neutral"
  >("all");
  const [timeRange, setTimeRange] = useState<"hour" | "day" | "week" | "month">(
    "day",
  );
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [searchProgress, setSearchProgress] = useState({
    current: 0,
    total: 0,
    currentKeyword: "",
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  // Track recent scan articles separately for Reports tab
  const [recentScanMentions, setRecentScanMentions] = useState<
    MediaMentionData[]
  >([]);
  // Track search report and query for Media Inquiry tab
  const [searchReport, setSearchReport] = useState<string | null>(null);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>("");
  const [isStreamingReport, setIsStreamingReport] = useState(false);

  const filteredMentions = useMemo(() => {
    return mentions.filter((mention) => {
      const matchesSearch =
        searchTerm === "" ||
        mention.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mention.snippet.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mention.source.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSentiment =
        sentimentFilter === "all" || mention.sentiment === sentimentFilter;

      return matchesSearch && matchesSentiment;
    });
  }, [mentions, searchTerm, sentimentFilter]);

  // Calculate metrics based on ALL mentions
  const metrics = useMemo(() => {
    const totalMentions = mentions.length;
    const negativeMentions = mentions.filter(
      (m) => m.sentiment === "negative",
    ).length;
    const avgSentiment =
      mentions.length > 0
        ? mentions.reduce((sum, m) => sum + m.sentimentScore, 0) /
          mentions.length
        : 0;
    const activeAlerts = alerts.filter((a) => !a.dismissed).length;

    return {
      totalMentions,
      negativeMentions,
      sentimentScore: avgSentiment,
      alertsCount: activeAlerts,
    };
  }, [mentions, alerts]);

  // Calculate metrics based on FILTERED mentions for dashboard views
  const filteredMetrics = useMemo(() => {
    const totalMentions = filteredMentions.length;
    const negativeMentions = filteredMentions.filter(
      (m) => m.sentiment === "negative",
    ).length;
    const avgSentiment =
      filteredMentions.length > 0
        ? filteredMentions.reduce((sum, m) => sum + m.sentimentScore, 0) /
          filteredMentions.length
        : 0;
    const activeAlerts = alerts.filter((a) => !a.dismissed).length;

    return {
      totalMentions,
      negativeMentions,
      sentimentScore: avgSentiment,
      alertsCount: activeAlerts,
    };
  }, [filteredMentions, alerts]);

  const handleDeleteMention = (id: string) => {
    setMentions(mentions.filter((m) => m.id !== id));
  };

  const handleDismissAlert = (id: string) => {
    setAlerts(
      alerts.map((alert) =>
        alert.id === id ? { ...alert, dismissed: true } : alert,
      ),
    );
  };

  // Fetch mentions from Tavily API
  const fetchMentions = useCallback(
    async (
      keywordsToFetch: string[] = keywords,
      timeRangeToUse: "hour" | "day" | "week" | "month" = timeRange,
    ) => {
      if (keywordsToFetch.length === 0) {
        return;
      }

      // Keep existing mentions - we'll merge new results with them
      setLoading(true);
      setSearchProgress({
        current: 0,
        total: keywordsToFetch.length,
        currentKeyword: "",
      });

      try {
        const newMentions = await tavilyService.fetchMediaMentions(
          keywordsToFetch,
          timeRangeToUse,
          (current, total, currentKeyword) => {
            setSearchProgress({ current, total, currentKeyword });
          },
        );

        // Merge new results with existing mentions (deduplicate by URL)
        setMentions((prevMentions) => {
          const existingUrls = new Set(prevMentions.map((m) => m.url));
          const newUniqueMentions = newMentions.filter(
            (m) => !existingUrls.has(m.url),
          );
          const mergedMentions = [...newUniqueMentions, ...prevMentions];
          // Sort by date (newest first)
          return mergedMentions.sort(
            (a, b) =>
              new Date(b.publishedAt).getTime() -
              new Date(a.publishedAt).getTime(),
          );
        });
        setLastFetchTime(new Date());

        // Generate alerts for high negative mentions
        const negativeMentions = newMentions.filter(
          (m) => m.sentiment === "negative",
        );
        if (negativeMentions.length > 3) {
          const newAlert: Alert = {
            id: `alert-${Date.now()}`,
            title: "High Volume of Negative Mentions Detected",
            message: `Found ${negativeMentions.length} negative mentions in recent news. Keywords: ${keywordsToFetch.join(", ")}`,
            severity: negativeMentions.length > 8 ? "high" : "medium",
            source: "Media Monitor",
            timestamp: new Date().toISOString(),
            dismissed: false,
            relatedMentions: negativeMentions.map((m) => m.id),
          };

          setAlerts((prev) => [newAlert, ...prev]);
          toast.warning(
            `Alert: ${negativeMentions.length} negative mentions found!`,
          );
        }

        toast.success(`Fetched ${newMentions.length} media mentions`);
      } catch (error) {
        console.error("Failed to fetch mentions:", error);
        toast.error("Failed to fetch media mentions. Please try again.");
      } finally {
        setLoading(false);
        setSearchProgress({ current: 0, total: 0, currentKeyword: "" });
      }
    },
    [keywords, timeRange],
  );

  // Don't auto-fetch on initial load to prevent rate limiting
  // User can manually refresh to fetch data
  const [hasInitializedFetch, setHasInitializedFetch] = useState(false);

  useEffect(() => {
    // Only auto-fetch if user has manually refreshed at least once
    if (keywords.length > 0 && hasInitializedFetch) {
      fetchMentions(keywords);
    }
  }, [fetchMentions, hasInitializedFetch]);

  // Manual refresh function
  const refreshMentions = () => {
    setHasInitializedFetch(true);
    fetchMentions(keywords, timeRange);
  };

  // Enhanced refresh function with dynamic keyword extraction
  const refreshMentionsEnhanced = useCallback(async () => {
    if (!accessToken) {
      toast.error("Please login to refresh");
      return;
    }

    setHasInitializedFetch(true);
    setLoading(true);
    setSearchProgress({
      current: 0,
      total: 1,
      currentKeyword: "Searching latest Assam news...",
    });

    try {
      // Search for general "issues" in Assam to get today's latest news
      console.log("🔍 Searching for latest Assam news...");
      const todayArticles = await tavilyService.searchByQuery(
        "issues news",
        "day", // Only today's news
      );

      console.log(`📰 Found ${todayArticles.length} latest articles`);

      // Merge new results with existing mentions (deduplicate by URL)
      setMentions((prevMentions) => {
        const existingUrls = new Set(prevMentions.map((m) => m.url));
        const newUniqueMentions = todayArticles.filter(
          (m) => !existingUrls.has(m.url),
        );
        const mergedMentions = [...newUniqueMentions, ...prevMentions];
        // Sort by date (newest first)
        return mergedMentions.sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime(),
        );
      });
      setLastFetchTime(new Date());

      // Update recent scan mentions for Reports tab (only latest search results)
      setRecentScanMentions(todayArticles);

      // Generate alerts for high negative mentions
      const negativeMentions = todayArticles.filter(
        (m) => m.sentiment === "negative",
      );
      if (negativeMentions.length > 3) {
        const newAlert: Alert = {
          id: `alert-${Date.now()}`,
          title: "High Volume of Negative Mentions Detected",
          message: `Found ${negativeMentions.length} negative mentions in today's Assam news`,
          severity: negativeMentions.length > 8 ? "high" : "medium",
          source: "Media Monitor",
          timestamp: new Date().toISOString(),
          dismissed: false,
          relatedMentions: negativeMentions.map((m) => m.id),
        };

        setAlerts((prev) => [newAlert, ...prev]);
        toast.warning(
          `Alert: ${negativeMentions.length} negative mentions found!`,
        );
      }

      toast.success(`✅ Fetched ${todayArticles.length} latest articles`);
    } catch (error) {
      console.error("Failed to fetch latest news:", error);
      toast.error("Failed to fetch latest news. Please try again.");
    } finally {
      setLoading(false);
      setSearchProgress({ current: 0, total: 0, currentKeyword: "" });
    }
  }, [accessToken]);

  // Handle time range change and auto-refresh
  const handleTimeRangeChange = useCallback(
    (newTimeRange: "hour" | "day" | "week" | "month") => {
      setTimeRange(newTimeRange);
      // Note: Time range is now just a filter for display, not for fetching
      // Users should use the search box to fetch new data
    },
    [],
  );

  // Load user settings on mount
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!accessToken || !userId) {
        console.log("No user logged in, using default settings");
        setSettingsLoaded(true);
        return;
      }

      const settings = await settingsService.loadSettings(accessToken);
      if (settings) {
        if (settings.keywords && settings.keywords.length > 0) {
          setKeywords(settings.keywords);
        }
        if (settings.sources && settings.sources.length > 0) {
          setSources(settings.sources);
        }
      }
      setSettingsLoaded(true);
    };

    loadUserSettings();
  }, [accessToken, userId]);

  // Load user data (mentions and alerts) on mount
  useEffect(() => {
    const loadUserData = async () => {
      if (!accessToken || !userId) {
        console.log("No user logged in, using mock data");
        setDataLoaded(true);
        return;
      }

      const data = await dataService.loadData(accessToken);
      if (data) {
        if (data.mentions && data.mentions.length > 0) {
          setMentions(data.mentions);
        }
        if (data.alerts && data.alerts.length > 0) {
          setAlerts(data.alerts);
        }
        if (data.lastFetchTime) {
          setLastFetchTime(new Date(data.lastFetchTime));
        }
        console.log("User data loaded successfully");
      }
      setDataLoaded(true);
    };

    loadUserData();
  }, [accessToken, userId]);

  // Save settings whenever they change
  useEffect(() => {
    if (!settingsLoaded || !accessToken || !userId) {
      return;
    }

    const saveUserSettings = async () => {
      const success = await settingsService.saveSettings(
        accessToken,
        keywords,
        sources,
      );
      if (success) {
        console.log("Settings auto-saved successfully");
      }
    };

    // Debounce saves to avoid too many requests
    const timeoutId = setTimeout(saveUserSettings, 1000);
    return () => clearTimeout(timeoutId);
  }, [keywords, sources, accessToken, userId, settingsLoaded]);

  // Save data (mentions and alerts) whenever they change
  useEffect(() => {
    if (!dataLoaded || !accessToken || !userId) {
      return;
    }

    const saveUserData = async () => {
      const success = await dataService.saveData(
        accessToken,
        mentions,
        alerts,
        lastFetchTime,
      );
      if (success) {
        console.log("Data auto-saved successfully");
      }
    };

    // Debounce saves to avoid too many requests
    const timeoutId = setTimeout(saveUserData, 2000);
    return () => clearTimeout(timeoutId);
  }, [mentions, alerts, lastFetchTime, accessToken, userId, dataLoaded]);

  // Update keywords and fetch new mentions
  const updateKeywords = useCallback(
    (newKeywords: string[]) => {
      setKeywords(newKeywords);
      if (newKeywords.length > 0) {
        // Small delay to allow state update
        setTimeout(() => fetchMentions(newKeywords, timeRange), 100);
      }
      // Don't clear mentions when keywords are empty - keep accumulated results
    },
    [fetchMentions, timeRange],
  );

  // Update sources wrapper
  const updateSources = useCallback((newSources: MonitoringSource[]) => {
    setSources(newSources);
  }, []);

  // AI-powered search in Mentions tab
  const handleAiSearch = useCallback(
    async (
      description: string,
      searchTimeRange: "hour" | "day" | "week" | "month" = "day",
    ) => {
      if (!description.trim()) {
        toast.error("Please describe what you want to monitor");
        return;
      }

      if (!accessToken) {
        toast.error("Please login to use AI search");
        return;
      }

      // Update the time range state to match the search
      setTimeRange(searchTimeRange);

      console.log(`🕐 Searching with time range: ${searchTimeRange}`);

      // Keep existing mentions - we'll merge new results with them
      // This allows Timeline to continue showing data during searches

      setLoading(true);
      setSearchProgress({
        current: 0,
        total: 2,
        currentKeyword: "Generating keywords with AI...",
      });

      try {
        // Step 1: Generate keywords from user description using LLM + Tavily search
        console.log(
          "🤖 Step 1: Searching articles and generating smart keywords...",
        );
        setSearchProgress({
          current: 0,
          total: 2,
          currentKeyword: "Searching for articles & generating keywords...",
        });

        // Use smart keyword generation - searches Tavily first for real articles
        const result = await settingsService.generateKeywordsSmart(
          accessToken,
          description,
          true,
        );
        const generatedKeywords = result.keywords;

        if (!generatedKeywords || generatedKeywords.length === 0) {
          toast.error("Failed to generate keywords from description");
          setLoading(false);
          setSearchProgress({ current: 0, total: 0, currentKeyword: "" });
          return;
        }

        console.log(
          `✨ Generated ${generatedKeywords.length} smart keywords:`,
          generatedKeywords,
        );
        const searchContext = result.usedSearch
          ? " (based on real articles)"
          : "";
        toast.info(
          `Generated ${generatedKeywords.length} keywords${searchContext}`,
        );

        // Step 2: Search for all generated keywords
        setSearchProgress({
          current: 1,
          total: generatedKeywords.length + 1,
          currentKeyword: "Searching keywords...",
        });

        const allMentions: MediaMentionData[] = [];

        for (let i = 0; i < generatedKeywords.length; i++) {
          const keyword = generatedKeywords[i];

          setSearchProgress({
            current: i + 2,
            total: generatedKeywords.length + 1,
            currentKeyword: keyword,
          });

          try {
            const keywordMentions = await tavilyService.fetchMediaMentions(
              [keyword],
              searchTimeRange, // Use the detected/default time range
              () => {}, // No progress callback for individual keywords
            );

            // Add new unique mentions
            keywordMentions.forEach((mention) => {
              if (!allMentions.some((m) => m.url === mention.url)) {
                allMentions.push(mention);
              }
            });

            console.log(
              `✅ Searched "${keyword}": found ${keywordMentions.length} articles (${allMentions.length} total unique)`,
            );
          } catch (error) {
            console.error(`❌ Failed to search keyword "${keyword}":`, error);
          }
        }

        // Sort by published date (newest first)
        allMentions.sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime(),
        );

        console.log(
          `📊 Total articles before filtering: ${allMentions.length}`,
        );

        // Step 3: Filter irrelevant articles using AI
        setSearchProgress({
          current: generatedKeywords.length + 1,
          total: generatedKeywords.length + 1,
          currentKeyword: "Filtering irrelevant results...",
        });

        let filteredMentions = allMentions;

        if (allMentions.length > 0) {
          try {
            console.log("🔍 Filtering out irrelevant articles using AI...");
            const filtered = await settingsService.filterIrrelevantArticles(
              accessToken,
              allMentions,
              description,
            );

            if (filtered && filtered.length > 0) {
              filteredMentions = filtered;
              console.log(
                `✨ Filtered down to ${filteredMentions.length} relevant articles (removed ${allMentions.length - filteredMentions.length} irrelevant)`,
              );

              if (allMentions.length - filteredMentions.length > 0) {
                toast.info(
                  `Removed ${allMentions.length - filteredMentions.length} irrelevant articles`,
                );
              }
            } else {
              console.log(
                "⚠️ Filtering returned no results, keeping all articles",
              );
            }
          } catch (error) {
            console.error("❌ Failed to filter articles, keeping all:", error);
            // Keep all articles if filtering fails
          }
        }

        // Merge new results with existing mentions (deduplicate by URL)
        setMentions((prevMentions) => {
          const existingUrls = new Set(prevMentions.map((m) => m.url));
          const newUniqueMentions = filteredMentions.filter(
            (m) => !existingUrls.has(m.url),
          );
          const mergedMentions = [...newUniqueMentions, ...prevMentions];
          // Sort by date (newest first)
          return mergedMentions.sort(
            (a, b) =>
              new Date(b.publishedAt).getTime() -
              new Date(a.publishedAt).getTime(),
          );
        });
        setLastFetchTime(new Date());

        // Update recent scan mentions for Reports tab (only latest search results)
        setRecentScanMentions(filteredMentions);

        // Step 4: Generate comprehensive report from filtered articles
        if (filteredMentions.length > 0) {
          setSearchProgress({
            current: generatedKeywords.length + 1,
            total: generatedKeywords.length + 2,
            currentKeyword: "Generating comprehensive report...",
          });

          try {
            console.log(
              "📝 Generating comprehensive report from filtered articles...",
            );

            // Start with empty report that will be populated via streaming
            setSearchReport("");
            setCurrentSearchQuery(description);
            setIsStreamingReport(true);

            let streamedContent = "";

            const report = await settingsService.generateSearchReport(
              accessToken,
              description,
              filteredMentions,
              (chunk: string) => {
                // Update report incrementally as chunks arrive
                streamedContent += chunk;
                setSearchReport(streamedContent);
                console.log(
                  "📊 Streaming chunk received, total length:",
                  streamedContent.length,
                );
              },
            );

            if (report) {
              // Final update to ensure we have the complete report
              setSearchReport(report);
              console.log(
                `✅ Report generated successfully (${report.length} characters)`,
              );
            } else {
              console.warn(
                "⚠️ Failed to generate report, will show articles instead",
              );
              setSearchReport(null);
            }
          } catch (error) {
            console.error("❌ Failed to generate report:", error);
            setSearchReport(null);
          } finally {
            setIsStreamingReport(false);
          }
        }

        // Generate alerts for high negative mentions
        const negativeMentions = filteredMentions.filter(
          (m) => m.sentiment === "negative",
        );
        if (negativeMentions.length > 3) {
          const newAlert: Alert = {
            id: `alert-${Date.now()}`,
            title: "Search Results: Negative Mentions Detected",
            message: `Found ${negativeMentions.length} negative mentions based on your search. ${generatedKeywords.length} keywords searched: ${generatedKeywords.join(", ")}`,
            severity: negativeMentions.length > 10 ? "high" : "medium",
            source: "Media Monitor",
            timestamp: new Date().toISOString(),
            dismissed: false,
            relatedMentions: negativeMentions.slice(0, 5).map((m) => m.id),
          };

          setAlerts((prev) => [newAlert, ...prev]);
          toast.warning(
            `Alert: ${negativeMentions.length} negative mentions found!`,
          );
        }

        toast.success(
          `✅ Analysis complete: ${filteredMentions.length} articles found and report generated`,
        );
      } catch (error) {
        console.error("Failed to perform search:", error);
        toast.error("Search failed. Please try again.");
      } finally {
        setLoading(false);
        setSearchProgress({ current: 0, total: 0, currentKeyword: "" });
      }
    },
    [accessToken],
  );

  return {
    mentions,
    alerts,
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
    setKeywords: updateKeywords,
    setSources: updateSources,
    setSearchTerm,
    setSentimentFilter,
    setTimeRange: handleTimeRangeChange,
    handleDeleteMention,
    handleDismissAlert,
    refreshMentions,
    refreshMentionsEnhanced,
    handleAiSearch,
    searchReport,
    currentSearchQuery,
    setSearchReport,
    setCurrentSearchQuery,
    isStreamingReport,
  };
}
