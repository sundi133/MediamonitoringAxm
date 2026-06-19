import { useState, useMemo, useEffect } from "react";
import { MediaMentionData } from "../types";
import {
  TrendingUp,
  Search,
  Clock,
  Hash,
  Flame,
  BarChart3,
  Calendar,
  AlertTriangle,
  Filter,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MentionCard } from "./MentionCard";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "./ui/button";
import { ReportModal } from "./ReportModal";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { settingsService } from "../services/settingsService";
import { useAuth } from "../contexts/AuthContext";

interface TimelineTabProps {
  mentions: MediaMentionData[];
  onDeleteMention: (id: string) => void;
  loading: boolean;
}

type TimeFilter = 1 | 7 | 14 | 30 | 90 | 180 | 365 | 730 | "1h";
type SentimentFilter = "all" | "positive" | "negative" | "neutral";

// Helper to format relative time
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

// Top Issues Card Component - Shows both Positive and Negative
function TopIssuesCard({ mentions }: { mentions: MediaMentionData[] }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const topNegative = useMemo(
    () =>
      mentions
        .filter((m) => m.sentiment === "negative")
        .sort(
          (a, b) =>
            new Date(b.publishedAt || b.publishedDate).getTime() -
            new Date(a.publishedAt || a.publishedDate).getTime(),
        )
        .slice(0, 10),
    [mentions],
  );

  const topPositive = useMemo(
    () =>
      mentions
        .filter((m) => m.sentiment === "positive")
        .sort(
          (a, b) =>
            new Date(b.publishedAt || b.publishedDate).getTime() -
            new Date(a.publishedAt || a.publishedDate).getTime(),
        )
        .slice(0, 10),
    [mentions],
  );

  if (mentions.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-h-[500px] overflow-y-auto p-2"
          >
            {/* Negative Section - Red tinted */}
            <div className="m-3 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="w-4 h-4 text-red-500" />
                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                  Top 10 Negative News
                </span>
              </div>

              <div className="space-y-1.5 p-2">
                {topNegative.length === 0 ? (
                  <p className="py-4 text-xs text-slate-400 text-center">
                    No negative news detected
                  </p>
                ) : (
                  topNegative.map((mention, idx) => (
                    <a
                      key={mention.id}
                      href={mention.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex mb-2 items-start gap-2.5 p-2.5 bg-red-50 dark:bg-red-950/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-all group border border-red-100 dark:border-red-900/30"
                    >
                      <span className="text-xs font-bold text-red-500 w-5 flex-shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-snug line-clamp-2 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">
                          {mention.title || "Untitled"}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          <span className="text-[10px]">
                            {formatTimeAgo(
                              new Date(
                                mention.publishedAt || mention.publishedDate,
                              ),
                            )}
                          </span>
                          <span className="mx-1 text-[10px]"> </span>
                          <span className="text-red-500 text-[10px]">
                            {mention.source || "Unknown"}
                          </span>
                        </p>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>

            {/* Positive Section - Green tinted */}
            <div className="m-3 mt-2 p-2">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                  Top 10 Positive News
                </span>
              </div>

              <div className="space-y-1.5">
                {topPositive.length === 0 ? (
                  <p className="py-4 text-xs text-slate-400 text-center">
                    No positive news detected
                  </p>
                ) : (
                  topPositive.map((mention, idx) => (
                    <a
                      key={mention.id}
                      href={mention.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex mb-2 items-start gap-2.5 p-2.5 bg-green-50 dark:bg-green-950/40 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/60 transition-all group border border-green-200 dark:border-green-800/40"
                    >
                      <span className="text-xs font-bold text-green-600 w-5 flex-shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-medium text-slate-800 dark:text-slate-200 leading-snug line-clamp-2 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
                          {mention.title || "Untitled"}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          <span className="text-[10px]">
                            {formatTimeAgo(
                              new Date(
                                mention.publishedAt || mention.publishedDate,
                              ),
                            )}
                          </span>
                          <span className="mx-1 text-[10px]"> </span>
                          <span className="text-green-600 text-[10px]">
                            {mention.source || "Unknown"}
                          </span>
                        </p>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed state */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full py-2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Expand ↓
        </button>
      )}
    </div>
  );
}

export function TimelineTab({
  mentions,
  onDeleteMention,
  loading,
}: TimelineTabProps) {
  const { accessToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [trendSearchQuery, setTrendSearchQuery] = useState("");
  const [selectedTrend, setSelectedTrend] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(7);
  const [sentimentFilter, setSentimentFilter] =
    useState<SentimentFilter>("all");
  const [showCriticalAlerts, setShowCriticalAlerts] = useState(true);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // AI Cleaning state
  const [cleanedTrends, setCleanedTrends] = useState<string[] | null>(null);
  const [isCleaningTrends, setIsCleaningTrends] = useState(false);

  // Reset cleaned trends when data or time filter changes to force recalculation
  useEffect(() => {
    setCleanedTrends(null);
  }, [mentions.length, timeFilter]);

  // Common stop words to filter out
  const stopWords = useMemo(
    () =>
      new Set([
        "the",
        "be",
        "to",
        "of",
        "and",
        "a",
        "in",
        "that",
        "have",
        "i",
        "it",
        "for",
        "not",
        "on",
        "with",
        "he",
        "as",
        "you",
        "do",
        "at",
        "this",
        "but",
        "his",
        "by",
        "from",
        "they",
        "we",
        "say",
        "her",
        "she",
        "or",
        "an",
        "will",
        "my",
        "one",
        "all",
        "would",
        "there",
        "their",
        "what",
        "so",
        "up",
        "out",
        "if",
        "about",
        "who",
        "get",
        "which",
        "go",
        "me",
        "when",
        "make",
        "can",
        "like",
        "time",
        "no",
        "just",
        "him",
        "know",
        "take",
        "people",
        "into",
        "year",
        "your",
        "good",
        "some",
        "could",
        "them",
        "see",
        "other",
        "than",
        "then",
        "now",
        "look",
        "only",
        "come",
        "its",
        "over",
        "think",
        "also",
        "back",
        "after",
        "use",
        "two",
        "how",
        "our",
        "work",
        "first",
        "well",
        "way",
        "even",
        "new",
        "want",
        "because",
        "any",
        "these",
        "give",
        "day",
        "most",
        "us",
        "is",
        "are",
        "was",
        "were",
        "has",
        "had",
        "been",
        "media",
        "monitor",
        "news",
        "report",
        "video",
        "photo",
        "image",
        "click",
        "read",
        "more",
        "assam",
        // Expanded stop words (verbs, adverbs, generic news terms)
        "took",
        "often",
        "said",
        "says",
        "saying",
        "reported",
        "reports",
        "reporting",
        "stated",
        "stating",
        "according",
        "officials",
        "official",
        "police",
        "department",
        "state",
        "government",
        "india",
        "indian",
        "district",
        "region",
        "area",
        "areas",
        "place",
        "places",
        "city",
        "town",
        "village",
        "today",
        "yesterday",
        "tomorrow",
        "days",
        "week",
        "weeks",
        "month",
        "months",
        "years",
        "recent",
        "recently",
        "late",
        "later",
        "latest",
        "early",
        "earlier",
        "times",
        "high",
        "low",
        "big",
        "small",
        "large",
        "many",
        "much",
        "less",
        "few",
        "several",
        "various",
        "numerous",
        "multiple",
        "every",
        "each",
        "another",
        "such",
        "same",
        "different",
        "similar",
        "still",
        "yet",
        "already",
        "ever",
        "never",
        "always",
        "usually",
        "sometimes",
        "perhaps",
        "maybe",
        "likely",
        "unlikely",
        "possible",
        "possibly",
        "probable",
        "probably",
        "due",
        "while",
        "whilst",
        "during",
        "before",
        "until",
        "till",
        "through",
        "throughout",
        "via",
        "without",
        "within",
        "between",
        "among",
        "amongst",
        "upon",
        "onto",
        "above",
        "below",
        "under",
        "across",
        "along",
        "around",
        "behind",
        "beside",
        "beyond",
        "down",
        "inside",
        "near",
        "off",
        "outside",
        "toward",
        "towards",
        "breaking",
        "update",
        "updates",
        "live",
        "exclusive",
        "special",
        "coverage",
        "story",
        "stories",
        "article",
        "articles",
        "post",
        "posts",
        "comment",
        "comments",
        "opinion",
        "opinions",
        "editorial",
        "editorials",
        "analysis",
        "review",
        "reviews",
        "interview",
        "interviews",
        "gallery",
        "galleries",
        "watch",
        "listen",
        "link",
        "links",
        "website",
        "websites",
        "page",
        "pages",
        "site",
        "sites",
        "web",
        "net",
        "online",
        "digital",
        "social",
        "network",
        "networks",
        "platform",
        "platforms",
        "app",
        "apps",
        "application",
        "applications",
        "user",
        "users",
        "account",
        "accounts",
        "profile",
        "profiles",
        "group",
        "groups",
        "take",
        "takes",
        "taking",
        "taken",
        "get",
        "gets",
        "getting",
        "got",
        "gotten",
        "make",
        "makes",
        "making",
        "made",
        "doing",
        "did",
        "done",
        "goes",
        "going",
        "went",
        "gone",
        "comes",
        "coming",
        "came",
        "sees",
        "seeing",
        "saw",
        "seen",
        "looks",
        "looking",
        "looked",
        "wants",
        "wanting",
        "wanted",
        "gives",
        "giving",
        "gave",
        "given",
        "uses",
        "using",
        "used",
        "finds",
        "finding",
        "found",
        "tells",
        "telling",
        "told",
        "asks",
        "asking",
        "asked",
        "works",
        "working",
        "worked",
        "seems",
        "seeming",
        "seemed",
        "feels",
        "feeling",
        "felt",
        "tries",
        "trying",
        "tried",
        "leaves",
        "leaving",
        "left",
        "calls",
        "calling",
        "called",
        // More noise words
        "amid",
        "amidst",
        "following",
        "ahead",
        "versus",
        "versus",
        "vs",
        "via",
        "per",
        "pre",
        "post",
        "sub",
        "supra",
        "infra",
        "inter",
        "intra",
        "extra",
        "ultra",
        "micro",
        "macro",
        "multi",
        "poly",
        "semi",
        "hemi",
        "demi",
        "pan",
        "omni",
        "auto",
        "anti",
        "contra",
        "counter",
        "pro",
        "co",
        "com",
        "con",
        "col",
        "cor",
        "de",
        "dis",
        "di",
        "dif",
        "ex",
        "e",
        "ef",
        "in",
        "im",
        "il",
        "ir",
        "un",
        "non",
        "a",
        "an",
        "ab",
        "abs",
        "ad",
        "ac",
        "af",
        "ag",
        "al",
        "an",
        "ap",
        "ar",
        "as",
        "at",
        "be",
        "bi",
        "bis",
        "circum",
        "cis",
        "de",
        "de",
        "di",
        "dis",
        "dif",
        "duo",
        "du",
        "d",
        "e",
        "ex",
        "ef",
        "em",
        "en",
        "epi",
        "ep",
        "equi",
        "equ",
        "eu",
        "ev",
        "exo",
        "extra",
        "extro",
        "fore",
        "geo",
        "hemi",
        "hepta",
        "hex",
        "hexa",
        "holo",
        "homo",
        "homeo",
        "hyper",
        "hypo",
        "ide",
        "ideo",
        "idio",
        "in",
        "im",
        "il",
        "ir",
        "infra",
        "inter",
        "intra",
        "intro",
        "iso",
        "kil",
        "kilo",
        "macr",
        "macro",
        "magn",
        "magni",
        "mal",
        "male",
        "mega",
        "megal",
        "meta",
        "met",
        "micro",
        "mid",
        "milli",
        "min",
        "mini",
        "mis",
        "mit",
        "mon",
        "mono",
        "multi",
        "mult",
        "nan",
        "nano",
        "neo",
        "ne",
        "non",
        "nov",
        "ob",
        "oc",
        "of",
        "op",
        "oct",
        "octa",
        "octo",
        "omni",
        "pan",
        "pant",
        "panto",
        "para",
        "par",
        "penta",
        "pent",
        "per",
        "peri",
        "poly",
        "post",
        "pre",
        "pro",
        "prot",
        "proto",
        "pseudo",
        "pseud",
        "quadr",
        "quadri",
        "quart",
        "quin",
        "quint",
        "re",
        "retro",
        "se",
        "semi",
        "sept",
        "septi",
        "sex",
        "sext",
        "sub",
        "suc",
        "suf",
        "sug",
        "sup",
        "sur",
        "sus",
        "super",
        "supra",
        "sur",
        "sym",
        "syn",
        "syl",
        "sys",
        "tele",
        "tel",
        "trans",
        "tran",
        "tra",
        "tri",
        "ultra",
        "un",
        "uni",
        "vice",
        "with",
      ]),
    [],
  );

  // Extract keywords and enrich mentions with them if missing
  const enrichedMentions = useMemo(() => {
    return mentions.map((mention) => {
      if (mention.keywords && mention.keywords.length > 0) return mention;

      const text =
        `${mention.title || ""} ${mention.snippet || ""}`.toLowerCase();
      // Remove special chars and split
      const words = text.replace(/[^\w\s]/g, "").split(/\s+/);

      const filteredWords = words
        .filter((word) => word.length > 3)
        .filter((word) => !stopWords.has(word) && !/^\d+$/.test(word));

      // distinct keywords
      const uniqueKeywords = Array.from(new Set(filteredWords)).slice(0, 5);
      return { ...mention, keywords: uniqueKeywords };
    });
  }, [mentions, stopWords]);

  // Extract trending topics from all mentions (title + snippet)
  // And calculate velocity (change vs previous period)
  const trendingTopics = useMemo(() => {
    const currentCounts: Record<string, number> = {};
    const previousCounts: Record<string, number> = {};
    const displayForms: Record<string, string> = {}; // Store best display version (capitalized)

    // Helper to process text into meaningful tokens
    const extractTokens = (text: string) => {
      // Clean text but keep case, replace special chars with space
      const cleanText = text.replace(/[^\w\s-]/g, " ");
      const tokens = cleanText.split(/\s+/);

      return tokens.filter((token) => {
        const lower = token.toLowerCase();

        // Basic filtering
        if (lower.length < 3) return false; // Too short
        if (/^\d+$/.test(lower)) return false; // Numeric
        if (stopWords.has(lower)) return false; // Stop word

        // Smart filtering heuristics

        // 1. If it's capitalized (Title Case), it's likely good, keep it
        const isCapitalized =
          token[0] === token[0].toUpperCase() &&
          token[0] !== token[0].toLowerCase();
        if (isCapitalized) return true;

        // 2. If lowercase, apply stricter rules to reduce noise
        if (lower.length < 4) return false; // Short lowercase words often noise

        // 3. Remove common verb/adverb endings from lowercase words
        if (lower.endsWith("ing")) return false;
        if (lower.endsWith("ly")) return false;
        if (lower.endsWith("ed")) return false;
        if (lower.endsWith("ment")) return false; // often generic

        return true;
      });
    };

    const now = new Date();
    const currentCutoff = new Date(
      now.getTime() -
        (timeFilter === "1h"
          ? 60 * 60 * 1000
          : (typeof timeFilter === "number" ? timeFilter : 1) *
            24 *
            60 *
            60 *
            1000),
    );
    const previousCutoff = new Date(
      now.getTime() -
        (timeFilter === "1h"
          ? 2 * 60 * 60 * 1000
          : (typeof timeFilter === "number" ? timeFilter : 1) *
            2 *
            24 *
            60 *
            60 *
            1000),
    );

    enrichedMentions.forEach((mention) => {
      const date = new Date(mention.publishedAt || mention.publishedDate);
      const text = `${mention.title || ""} ${mention.snippet || ""}`;
      // Use improved token extraction that respects case
      const tokens = extractTokens(text);

      if (date >= currentCutoff) {
        tokens.forEach((token) => {
          const key = token.toLowerCase();
          currentCounts[key] = (currentCounts[key] || 0) + 1;

          // Store capitalized version if seen, to improve display
          if (
            !displayForms[key] ||
            (token[0] === token[0].toUpperCase() &&
              token[0] !== token[0].toLowerCase())
          ) {
            displayForms[key] = token;
          }
        });
      } else if (date >= previousCutoff && date < currentCutoff) {
        tokens.forEach((token) => {
          const key = token.toLowerCase();
          previousCounts[key] = (previousCounts[key] || 0) + 1;
        });
      }
    });

    // Get all trends with count > 1 in current period
    const rawTrends = Object.entries(currentCounts)
      .filter(([keyword, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .map(([keyword, count]) => {
        const prevCount = previousCounts[keyword] || 0;
        let trend: "up" | "down" | "stable" = "stable";
        if (count > prevCount) trend = "up";
        else if (count < prevCount) trend = "down";

        // Use stored display form or Title Case fallback
        const displayKeyword =
          displayForms[keyword] ||
          keyword.charAt(0).toUpperCase() + keyword.slice(1);

        return { keyword: displayKeyword, count, prevCount, trend };
      });

    return rawTrends;
  }, [enrichedMentions, stopWords, timeFilter]);

  // AI Cleaning Effect
  useEffect(() => {
    // Only clean if we have trends and they changed significantly
    if (trendingTopics.length > 0 && !isCleaningTrends) {
      const topTrends = trendingTopics.slice(0, 30).map((t) => t.keyword);
      // Simple check to avoid re-cleaning same data if not needed
      // (In production, use deep comparison or stable ID)

      const cleanWithAI = async () => {
        setIsCleaningTrends(true);
        try {
          if (accessToken) {
            const cleaned = await settingsService.cleanTrends(
              accessToken,
              topTrends,
            );
            if (cleaned) {
              setCleanedTrends(cleaned);
            }
          }
        } catch (e) {
          console.error("Failed to clean trends:", e);
        } finally {
          setIsCleaningTrends(false);
        }
      };

      // Debounce the call
      const timer = setTimeout(cleanWithAI, 2000);
      return () => clearTimeout(timer);
    }
  }, [trendingTopics.length]); // Re-run when count changes significantly

  // Merge cleaned trends with counts
  const displayTrends = useMemo(() => {
    if (!cleanedTrends) return trendingTopics;

    // Map cleaned keywords back to their counts/trends
    // Note: LLM might return new/merged phrases, so matching is fuzzy
    const filtered = trendingTopics.filter((t) => {
      // Check if this keyword is present in cleaned list (case insensitive)
      // We prioritize the LLM's judgment. If it's not in the cleaned list, it's noise.
      return cleanedTrends.some(
        (c) =>
          c.toLowerCase() === t.keyword.toLowerCase() ||
          c.toLowerCase().includes(t.keyword.toLowerCase()),
      );
    });

    return filtered.filter((t) =>
      t.keyword.toLowerCase().includes(trendSearchQuery.toLowerCase()),
    );
  }, [trendingTopics, cleanedTrends, trendSearchQuery]);

  // Time-filtered enriched mentions (for use before filteredMentions is defined)
  const timeFilteredMentions = useMemo(() => {
    let filtered = [...enrichedMentions];
    const now = new Date();

    if (timeFilter === "1h") {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      filtered = filtered.filter(
        (m) => new Date(m.publishedAt || m.publishedDate) >= oneHourAgo,
      );
    } else {
      const cutoffDate = new Date(
        now.getTime() -
          (typeof timeFilter === "number" ? timeFilter : 7) *
            24 *
            60 *
            60 *
            1000,
      );
      filtered = filtered.filter(
        (m) => new Date(m.publishedAt || m.publishedDate) >= cutoffDate,
      );
    }

    return filtered;
  }, [enrichedMentions, timeFilter]);

  // Compute topics by sentiment (positive vs negative associations) - NOW RESPECTS TIME FILTER
  const sentimentTopics = useMemo(() => {
    const topicSentimentScores: Record<
      string,
      { positive: number; negative: number; neutral: number; total: number }
    > = {};

    timeFilteredMentions.forEach((mention) => {
      const keywords = mention.keywords || [];
      const sentiment = mention.sentiment;

      keywords.forEach((keyword) => {
        const key = keyword.toLowerCase();
        // Skip stopWords (including "assam" since app is built for Assam)
        if (stopWords.has(key)) return;

        if (!topicSentimentScores[key]) {
          topicSentimentScores[key] = {
            positive: 0,
            negative: 0,
            neutral: 0,
            total: 0,
          };
        }
        topicSentimentScores[key].total += 1;
        if (sentiment === "positive") topicSentimentScores[key].positive += 1;
        else if (sentiment === "negative")
          topicSentimentScores[key].negative += 1;
        else topicSentimentScores[key].neutral += 1;
      });
    });

    // Get topics where positive sentiment is DOMINANT (more positive than negative)
    const positiveTopics = Object.entries(topicSentimentScores)
      .filter(
        ([_, scores]) => scores.positive > scores.negative && scores.total >= 2,
      )
      .map(([keyword, scores]) => ({
        keyword: keyword.charAt(0).toUpperCase() + keyword.slice(1),
        count: scores.positive,
        total: scores.total,
        ratio: scores.positive / scores.total,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get topics where negative sentiment is DOMINANT (more negative than positive)
    const negativeTopics = Object.entries(topicSentimentScores)
      .filter(
        ([_, scores]) => scores.negative > scores.positive && scores.total >= 2,
      )
      .map(([keyword, scores]) => ({
        keyword: keyword.charAt(0).toUpperCase() + keyword.slice(1),
        count: scores.negative,
        total: scores.total,
        ratio: scores.negative / scores.total,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { positiveTopics, negativeTopics };
  }, [timeFilteredMentions, stopWords]);

  // Filter mentions based on search or selected trend
  const filteredMentions = useMemo(() => {
    let filtered = [...enrichedMentions];

    const now = new Date();
    // Handle '1h' special case
    if (timeFilter === "1h") {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      filtered = filtered.filter(
        (m) => new Date(m.publishedAt || m.publishedDate) >= oneHourAgo,
      );
    } else {
      const cutoffDate = new Date(
        now.getTime() -
          (typeof timeFilter === "number" ? timeFilter : 7) *
            24 *
            60 *
            60 *
            1000,
      );
      filtered = filtered.filter(
        (m) => new Date(m.publishedAt || m.publishedDate) >= cutoffDate,
      );
    }

    if (selectedTrend) {
      filtered = filtered.filter(
        (m) =>
          (m.title || "").toLowerCase().includes(selectedTrend.toLowerCase()) ||
          (m.snippet || "")
            .toLowerCase()
            .includes(selectedTrend.toLowerCase()) ||
          m.keywords?.includes(selectedTrend),
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (m) =>
          (m.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.snippet || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.source || "").toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (sentimentFilter !== "all") {
      filtered = filtered.filter((m) => m.sentiment === sentimentFilter);
    }

    // Sort by date (newest first)
    return filtered.sort(
      (a, b) =>
        new Date(b.publishedAt || b.publishedDate).getTime() -
        new Date(a.publishedAt || a.publishedDate).getTime(),
    );
  }, [
    enrichedMentions,
    searchQuery,
    selectedTrend,
    timeFilter,
    sentimentFilter,
  ]);

  // Critical Alerts: Negative mentions in the last 24h
  const criticalAlerts = useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return enrichedMentions.filter(
      (m) =>
        m.sentiment === "negative" &&
        new Date(m.publishedAt || m.publishedDate) >= oneDayAgo,
    );
  }, [enrichedMentions]);

  // Group mentions by date
  const groupedMentions = useMemo(() => {
    const groups: Record<string, MediaMentionData[]> = {};

    filteredMentions.forEach((mention) => {
      const date = new Date(mention.publishedAt || mention.publishedDate);
      const dateKey = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(mention);
    });

    return groups;
  }, [filteredMentions]);

  // Calculate sentiment distribution for charts
  const sentimentData = useMemo(() => {
    if (filteredMentions.length === 0) return [];

    const positive = filteredMentions.filter(
      (m) => m.sentiment === "positive",
    ).length;
    const negative = filteredMentions.filter(
      (m) => m.sentiment === "negative",
    ).length;
    const neutral = filteredMentions.filter(
      (m) => m.sentiment === "neutral",
    ).length;

    return [
      { name: "Positive", value: positive, color: "#10b981" },
      { name: "Negative", value: negative, color: "#ef4444" },
      { name: "Neutral", value: neutral, color: "#64748b" },
    ].filter((item) => item.value > 0);
  }, [filteredMentions]);

  // Calculate mentions over time for trend chart
  const timelineData = useMemo(() => {
    if (filteredMentions.length === 0) return [];

    const dateCounts: Record<string, number> = {};
    filteredMentions.forEach((mention) => {
      const date = new Date(
        mention.publishedAt || mention.publishedDate,
      ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });

    return Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .slice(-(typeof timeFilter === "number" ? timeFilter : 7)); // Last 'timeFilter' dates
  }, [filteredMentions, timeFilter]);

  // Calculate topic summary
  const topicSummary = useMemo(() => {
    if (filteredMentions.length === 0) return null;

    const positive = filteredMentions.filter(
      (m) => m.sentiment === "positive",
    ).length;
    const negative = filteredMentions.filter(
      (m) => m.sentiment === "negative",
    ).length;
    const total = filteredMentions.length;

    const sentimentScore =
      total > 0 ? ((positive - negative) / total) * 100 : 0;

    let verdict: "positive" | "negative" | "mixed";
    let recommendation: string;

    if (sentimentScore > 20) {
      verdict = "positive";
      recommendation =
        "Strong positive momentum. Recommend amplifying key positive narratives through official channels.";
    } else if (sentimentScore < -20) {
      verdict = "negative";
      recommendation =
        "Critical negative sentiment detected. Immediate PR intervention and fact-checking required.";
    } else {
      verdict = "mixed";
      recommendation =
        "Sentiment is balanced. Continue monitoring for emerging polarising topics.";
    }

    return { sentimentScore, verdict, recommendation };
  }, [filteredMentions]);

  return (
    <div className="">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_260px] gap-6">
        {/* Left Sidebar - Trending Topics */}
        <div className="hidden lg:block lg:sticky lg:top-6 lg:self-start space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Trending Now
                </h3>
              </div>
              {isCleaningTrends && (
                <div className="flex items-center gap-1 text-[10px] text-indigo-500 animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  <span>AI Refining...</span>
                </div>
              )}
            </div>

            <div className="mb-3 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={trendSearchQuery}
                onChange={(e) => setTrendSearchQuery(e.target.value)}
                placeholder="Filter topics..."
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 thin-scrollbar">
              <button
                onClick={() => setSelectedTrend(null)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between group flex-shrink-0 ${
                  !selectedTrend
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span className="text-[13px] font-semibold">All Topics</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                  {timeFilteredMentions.length}
                </span>
              </button>

              {displayTrends.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  No matching topics found
                </div>
              ) : (
                displayTrends.map((trend) => (
                  <button
                    key={trend.keyword}
                    onClick={() => setSelectedTrend(trend.keyword)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors group flex-shrink-0 ${
                      selectedTrend === trend.keyword
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {trend.trend === "up" && (
                          <ArrowUpRight className="w-3 h-3 text-green-500 flex-shrink-0" />
                        )}
                        {trend.trend === "down" && (
                          <ArrowDownRight className="w-3 h-3 text-red-500 flex-shrink-0" />
                        )}
                        {trend.trend === "stable" && (
                          <Minus className="w-3 h-3 text-slate-300 flex-shrink-0" />
                        )}
                        <span className="text-xs font-medium capitalize truncate">
                          {trend.keyword}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                          {trend.count}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Top Negative Topics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Top 10 Negative Topics
              </h3>
            </div>
            <div className="space-y-1">
              {sentimentTopics.negativeTopics.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">
                  No negative topics
                </p>
              ) : (
                sentimentTopics.negativeTopics.map((topic, idx) => (
                  <button
                    key={topic.keyword}
                    onClick={() => setSelectedTrend(topic.keyword)}
                    className="w-full text-left p-2 bg-red-50 dark:bg-red-950/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors group border border-red-100 dark:border-red-900/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-red-500 w-4">
                        {idx + 1}.
                      </span>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate flex-1">
                        {topic.keyword}
                      </span>
                      <span className="text-[10px] bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded text-red-600 dark:text-red-400">
                        {topic.count}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Top Positive Topics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Top 10 Positive Topics
              </h3>
            </div>
            <div className="space-y-1">
              {sentimentTopics.positiveTopics.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">
                  No positive topics
                </p>
              ) : (
                sentimentTopics.positiveTopics.map((topic, idx) => (
                  <button
                    key={topic.keyword}
                    onClick={() => setSelectedTrend(topic.keyword)}
                    className="w-full text-left p-2 bg-green-50 dark:bg-green-950/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors group border border-green-200 dark:border-green-800/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-green-600 w-4">
                        {idx + 1}.
                      </span>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate flex-1">
                        {topic.keyword}
                      </span>
                      <span className="text-[10px] bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded text-green-600 dark:text-green-400">
                        {topic.count}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Timeline */}
        <div className="space-y-4 min-w-0 overflow-hidden">
          {/* Critical Alerts Banner */}
          <AnimatePresence>
            {showCriticalAlerts && criticalAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-4 relative overflow-hidden"
              >
                <div className="flex items-start gap-3 relative z-10">
                  <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
                        Critical Attention Required
                      </h3>
                      <button
                        onClick={() => setShowCriticalAlerts(false)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                      {criticalAlerts.length} high-impact negative mentions
                      detected in the last 24 hours.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls Bar */}
          <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-3 shadow-sm space-y-1.5">
            {/* Loading indicator - subtle, doesn't replace content */}
            {loading && (
              <div className="flex items-center justify-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 py-1">
                <div className="flex gap-1">
                  <motion.div
                    className="w-1.5 h-1.5 bg-indigo-500 rounded-full"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-1.5 h-1.5 bg-indigo-500 rounded-full"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: 0.15,
                    }}
                  />
                  <motion.div
                    className="w-1.5 h-1.5 bg-indigo-500 rounded-full"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                  />
                </div>
                <span className="font-medium">
                  Searching for new articles...
                </span>
              </div>
            )}
            {/* Search and Time */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
                  <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search mentions..."
                    className="w-full bg-transparent text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 flex-shrink-0">
                {/* Time Filter - Row 1 */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  {[
                    { value: "1h" as const, label: "1h" },
                    { value: 1 as const, label: "24h" },
                    { value: 7 as const, label: "7d" },
                    { value: 14 as const, label: "14d" },
                    { value: 30 as const, label: "30d" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTimeFilter(value)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        timeFilter === value
                          ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Time Filter - Row 2 */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  {[
                    { value: 90 as const, label: "3m" },
                    { value: 180 as const, label: "6m" },
                    { value: 365 as const, label: "1y" },
                    { value: 730 as const, label: "2y" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTimeFilter(value)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        timeFilter === value
                          ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sentiment Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <Filter className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-500 mr-1">
                Filter:
              </span>
              {(["all", "positive", "negative", "neutral"] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setSentimentFilter(filter)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                      sentimentFilter === filter
                        ? filter === "positive"
                          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                          : filter === "negative"
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                            : filter === "neutral"
                              ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                              : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400"
                        : "bg-transparent border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Timeline Content */}
          <AnimatePresence mode="wait">
            {filteredMentions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-20 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {loading ? "Searching for mentions..." : "No mentions found"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  {loading
                    ? "New articles will appear here once the search completes."
                    : searchQuery || selectedTrend || sentimentFilter !== "all"
                      ? "Try adjusting your filters or search terms to see more results."
                      : "Your timeline is empty. Mentions will appear here once data is collected."}
                </p>
                {!loading &&
                  (searchQuery ||
                    selectedTrend ||
                    sentimentFilter !== "all") && (
                    <Button
                      variant="link"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedTrend(null);
                        setSentimentFilter("all");
                      }}
                      className="mt-2 text-indigo-600 dark:text-indigo-400 text-xs"
                    >
                      Clear all filters
                    </Button>
                  )}
              </motion.div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedMentions).map(
                  ([dateKey, dateMentions]) => (
                    <motion.div
                      key={dateKey}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-4"
                    >
                      {/* Date Header */}
                      <div className="sticky top-[130px] sm:top-[120px] z-10 flex items-center justify-center pointer-events-none">
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm border border-slate-200/50 dark:border-slate-800/50 rounded-full px-4 py-1 flex items-center gap-2 pointer-events-auto">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {dateKey}
                          </span>
                          <span className="text-[10px] text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-2">
                            {dateMentions.length} mentions
                          </span>
                        </div>
                      </div>

                      {/* Articles for this date */}
                      <div className="space-y-4 relative px-2 sm:px-0">
                        {dateMentions.map((mention, index) => (
                          <motion.div
                            key={mention.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <MentionCard
                              mention={mention}
                              onDelete={onDeleteMention}
                              isHighlighted={false}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ),
                )}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar - Stats */}
        <div className="hidden lg:block lg:sticky lg:top-6 lg:self-start space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar">
          {/* Decision Summary Card (Moved to top of right sidebar for importance) */}
          {topicSummary && (
            <div
              className={`backdrop-blur-sm border rounded-xl p-5 shadow-sm transition-all ${
                topicSummary.verdict === "negative"
                  ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                  : topicSummary.verdict === "positive"
                    ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                    : "bg-white/80 dark:bg-slate-900/80 border-slate-200/50 dark:border-slate-800/50"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  AI Decision Brief
                </h3>
                {topicSummary.verdict === "negative" && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Sentiment Score
                  </span>
                  <div
                    className={`text-xl font-bold ${
                      topicSummary.sentimentScore > 0
                        ? "text-green-600"
                        : topicSummary.sentimentScore < 0
                          ? "text-red-600"
                          : "text-slate-600"
                    }`}
                  >
                    {topicSummary.sentimentScore > 0 ? "+" : ""}
                    {topicSummary.sentimentScore.toFixed(0)}
                  </div>
                </div>

                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-slate-100 dark:border-slate-800">
                  <p className="text-xs leading-relaxed font-medium text-slate-700 dark:text-slate-300">
                    "{topicSummary.recommendation}"
                  </p>
                </div>

                <Button
                  className="w-full h-8 text-xs"
                  variant={
                    topicSummary.verdict === "negative"
                      ? "destructive"
                      : "default"
                  }
                  onClick={() => setIsReportOpen(true)}
                >
                  Generate Full Report
                </Button>
              </div>
            </div>
          )}

          {/* Sentiment Analysis Card */}
          {sentimentData.length > 0 && (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-4">
                Sentiment Analysis
              </h3>
              <div
                style={{
                  width: "100%",
                  height: 140,
                  minWidth: 0,
                  minHeight: 140,
                }}
                className="mb-2 relative"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      itemStyle={{ fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center text for total */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <span className="block text-xl font-bold text-slate-900 dark:text-white">
                      {filteredMentions.length}
                    </span>
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider">
                      Total
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {sentimentData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600 dark:text-slate-400">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Top Issues Card - Twitter/X Trending Style */}
          <TopIssuesCard mentions={filteredMentions} />
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        mentions={filteredMentions}
        summary={topicSummary}
        trends={displayTrends}
        timeRange={typeof timeFilter === "number" ? timeFilter : 1}
      />
    </div>
  );
}
