import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MediaMentionData } from "../types";
import {
  Download,
  TrendingUp,
  FileText,
  Loader2,
  FileDown,
  BarChart3,
  Lightbulb,
  Flame,
  Globe,
  AlertTriangle,
  Building2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Wand2,
  ChevronRight,
  RefreshCw,
  FileBarChart,
  ExternalLink,
} from "lucide-react";
import { carboneService } from "../services/carboneService";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentions: MediaMentionData[];
  summary: {
    sentimentScore: number;
    verdict: "positive" | "negative" | "mixed";
    recommendation: string;
  } | null;
  trends: { keyword: string; count: number }[];
  timeRange: number;
}

// Simple Donut Chart using SVG
const SimpleDonutChart = ({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) => {
  const total = positive + neutral + negative;
  if (total === 0)
    return <div className="text-center text-slate-400 py-4">No data</div>;

  const cx = 60,
    cy = 60,
    r = 45,
    innerR = 30;
  const posPercent = positive / total;
  const neuPercent = neutral / total;
  const negPercent = negative / total;

  const createArc = (
    startPercent: number,
    endPercent: number,
    color: string,
  ) => {
    if (endPercent - startPercent <= 0) return null;
    const startAngle = startPercent * 360 - 90;
    const endAngle = endPercent * 360 - 90;
    const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
    const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
    const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
    const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
    const x3 = cx + innerR * Math.cos((endAngle * Math.PI) / 180);
    const y3 = cy + innerR * Math.sin((endAngle * Math.PI) / 180);
    const x4 = cx + innerR * Math.cos((startAngle * Math.PI) / 180);
    const y4 = cy + innerR * Math.sin((startAngle * Math.PI) / 180);
    const largeArc = endPercent - startPercent > 0.5 ? 1 : 0;
    return (
      <path
        key={color}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`}
        fill={color}
      />
    );
  };

  let currentPercent = 0;
  const arcs: React.ReactNode[] = [];
  if (posPercent > 0) {
    arcs.push(
      createArc(currentPercent, currentPercent + posPercent, "#10B981"),
    );
    currentPercent += posPercent;
  }
  if (neuPercent > 0) {
    arcs.push(
      createArc(currentPercent, currentPercent + neuPercent, "#94A3B8"),
    );
    currentPercent += neuPercent;
  }
  if (negPercent > 0) {
    arcs.push(
      createArc(currentPercent, currentPercent + negPercent, "#F43F5E"),
    );
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {arcs}
        <text
          x="60"
          y="55"
          textAnchor="middle"
          fontSize="20"
          fontWeight="bold"
          fill="#1e293b"
        >
          {total}
        </text>
        <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#64748b">
          Total
        </text>
      </svg>
      <div className="flex gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-slate-600">
            {Math.round(posPercent * 100)}%
          </span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          <span className="text-slate-600">
            {Math.round(neuPercent * 100)}%
          </span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span className="text-slate-600">
            {Math.round(negPercent * 100)}%
          </span>
        </span>
      </div>
    </div>
  );
};

// Simple Score Gauge using SVG
const SimpleScoreGauge = ({ score }: { score: number }) => {
  const isPositive = score > 0;
  const isNegative = score < 0;
  const color = isPositive ? "#10B981" : isNegative ? "#F43F5E" : "#94A3B8";

  // Normalize score from -100...+100 to 0...180 degrees
  const normalizedScore = Math.max(0, Math.min(100, (score + 100) / 2));
  const angle = (normalizedScore / 100) * 180; // 0° = left (-100), 180° = right (+100)

  // SVG dimensions - centered layout
  const cx = 80,
    cy = 65,
    r = 50;
  const strokeW = 10;

  // Calculate endpoint for score arc using correct coordinate system
  // θ goes from 0 (left) to 180 (right), arc curves upward
  const endX = cx - r * Math.cos((angle * Math.PI) / 180);
  const endY = cy - r * Math.sin((angle * Math.PI) / 180);

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="160" height="100" viewBox="0 0 160 100">
        {/* Background arc - full semicircle */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Score arc - always use largeArc=0 since we're within 180° */}
        {angle > 0 && (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${endX} ${endY}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        )}
        {/* Score text */}
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          fill={color}
        >
          {score > 0 ? "+" : ""}
          {score.toFixed(0)}
        </text>
        {/* Label */}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="9" fill="#64748b">
          SENTIMENT SCORE
        </text>
      </svg>
    </div>
  );
};

// Simple Bar Chart for Trends
const SimpleTrendsChart = ({
  trends,
}: {
  trends: { keyword: string; count: number }[];
}) => {
  if (trends.length === 0)
    return (
      <div className="text-center text-slate-400 py-4">No trends detected</div>
    );
  const maxCount = Math.max(...trends.map((t) => t.count));
  return (
    <div className="space-y-2">
      {trends.slice(0, 6).map((trend, i) => (
        <div key={i} className="flex items-center gap-3">
          <span
            className="text-xs text-slate-600 w-24 truncate"
            title={trend.keyword}
          >
            {trend.keyword}
          </span>
          <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded"
              style={{ width: `${(trend.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 w-8 text-right">
            {trend.count}
          </span>
        </div>
      ))}
    </div>
  );
};

// Source Analysis Component
const SourceAnalysis = ({
  sources,
}: {
  sources: {
    name: string;
    total: number;
    positive: number;
    negative: number;
    neutral: number;
  }[];
}) => {
  if (sources.length === 0)
    return (
      <div className="text-center text-slate-400 py-4">No source data</div>
    );

  return (
    <div className="space-y-3">
      {sources.slice(0, 5).map((source, i) => (
        <div
          key={i}
          className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
              {source.name}
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {source.total}
            </span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
            {source.positive > 0 && (
              <div
                className="bg-emerald-500"
                style={{ width: `${(source.positive / source.total) * 100}%` }}
              />
            )}
            {source.neutral > 0 && (
              <div
                className="bg-slate-400"
                style={{ width: `${(source.neutral / source.total) * 100}%` }}
              />
            )}
            {source.negative > 0 && (
              <div
                className="bg-rose-500"
                style={{ width: `${(source.negative / source.total) * 100}%` }}
              />
            )}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-slate-500">
            <span>{source.positive} pos</span>
            <span>{source.neutral} neu</span>
            <span>{source.negative} neg</span>
          </div>
        </div>
      ))}
    </div>
  );
};

function formatTimeRange(days: number): string {
  if (days >= 730) return `${Math.round(days / 365)} years`;
  if (days >= 365) return "1 year";
  if (days >= 180) return "6 months";
  if (days >= 90) return "3 months";
  return `${days} days`;
}

export function ReportModal({
  isOpen,
  onClose,
  mentions,
  summary,
  trends,
  timeRange,
}: ReportModalProps) {
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Personalization states
  const [step, setStep] = useState<"customize" | "report">("customize");
  const [userInstructions, setUserInstructions] = useState("");

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep("customize");
      setUserInstructions("");
    }
  }, [isOpen]);

  // Parse user instructions to determine report preferences
  const reportPreferences = useMemo(() => {
    const instructions = userInstructions.toLowerCase();

    // Content filter detection
    const negativeKeywords = [
      "negative",
      "crisis",
      "critical",
      "problem",
      "issue",
      "alert",
      "risk",
      "threat",
      "bad",
      "concern",
      "only negative",
      "negative only",
    ];
    const positiveKeywords = [
      "positive",
      "success",
      "achievement",
      "good",
      "win",
      "growth",
      "only positive",
      "positive only",
    ];

    const wantsNegativeOnly =
      negativeKeywords.some((kw) => instructions.includes(kw)) &&
      !positiveKeywords.some((kw) => instructions.includes(kw));
    const wantsPositiveOnly =
      positiveKeywords.some((kw) => instructions.includes(kw)) &&
      !negativeKeywords.some((kw) => instructions.includes(kw));

    // Section visibility detection
    const wantsExecutiveSummary =
      instructions.includes("summary") ||
      instructions.includes("executive") ||
      instructions.includes("overview") ||
      instructions.includes("brief");
    const wantsRecommendations =
      instructions.includes("recommend") ||
      instructions.includes("action") ||
      instructions.includes("suggest") ||
      instructions.includes("what to do") ||
      instructions.includes("next step");
    const wantsCriticalAlerts =
      instructions.includes("critical") ||
      instructions.includes("alert") ||
      instructions.includes("urgent") ||
      instructions.includes("immediate");
    const wantsTrends =
      instructions.includes("trend") ||
      instructions.includes("topic") ||
      instructions.includes("keyword");
    const wantsSources =
      instructions.includes("source") ||
      instructions.includes("media") ||
      instructions.includes("outlet");

    // If no specific instructions, show a balanced report
    const hasAnyPreference = userInstructions.trim().length > 0;

    return {
      contentFilter: wantsNegativeOnly
        ? "negative"
        : wantsPositiveOnly
          ? "positive"
          : "all",
      showExecutiveSummary: wantsExecutiveSummary || !hasAnyPreference,
      showRecommendations:
        wantsRecommendations || wantsNegativeOnly || !hasAnyPreference,
      showCriticalAlerts:
        wantsCriticalAlerts || wantsNegativeOnly || !hasAnyPreference,
      showTrends: wantsTrends || !hasAnyPreference,
      showSources: wantsSources || !hasAnyPreference,
      showTopNews: true, // Always show
      hasCustomization: hasAnyPreference,
    };
  }, [userInstructions]);

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const positiveCount = mentions.filter(
    (m) => m.sentiment === "positive",
  ).length;
  const negativeCount = mentions.filter(
    (m) => m.sentiment === "negative",
  ).length;
  const neutralCount = mentions.filter((m) => m.sentiment === "neutral").length;

  // Calculate top sources with sentiment breakdown
  const sourceAnalysis = useMemo(() => {
    const bySource: Record<
      string,
      { total: number; positive: number; negative: number; neutral: number }
    > = {};
    mentions.forEach((m) => {
      const source = m.source || "Unknown";
      if (!bySource[source])
        bySource[source] = { total: 0, positive: 0, negative: 0, neutral: 0 };
      bySource[source].total++;
      bySource[source][m.sentiment as "positive" | "negative" | "neutral"]++;
    });
    return Object.entries(bySource)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [mentions]);

  // Calculate critical alerts (negative mentions in last 48h)
  const criticalAlerts = useMemo(() => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    return mentions
      .filter(
        (m) =>
          m.sentiment === "negative" &&
          new Date(m.publishedAt || m.publishedDate) >= twoDaysAgo,
      )
      .sort(
        (a, b) =>
          new Date(b.publishedAt || b.publishedDate).getTime() -
          new Date(a.publishedAt || a.publishedDate).getTime(),
      )
      .slice(0, 5);
  }, [mentions]);

  // Calculate period comparison metrics
  const periodComparison = useMemo(() => {
    const avgDailyVolume = mentions.length / Math.max(timeRange, 1);

    // Calculate sentiment change (first half vs second half of period)
    const midPoint = new Date(
      Date.now() - (timeRange / 2) * 24 * 60 * 60 * 1000,
    );
    const firstHalf = mentions.filter((m) => {
      const date = new Date(m.publishedAt || m.publishedDate);
      return !isNaN(date.getTime()) && date < midPoint;
    });
    const secondHalf = mentions.filter((m) => {
      const date = new Date(m.publishedAt || m.publishedDate);
      return !isNaN(date.getTime()) && date >= midPoint;
    });

    const firstHalfPositiveRate =
      firstHalf.length > 0
        ? firstHalf.filter((m) => m.sentiment === "positive").length /
          firstHalf.length
        : 0;
    const secondHalfPositiveRate =
      secondHalf.length > 0
        ? secondHalf.filter((m) => m.sentiment === "positive").length /
          secondHalf.length
        : 0;
    const sentimentTrend = secondHalfPositiveRate - firstHalfPositiveRate;

    return {
      avgDailyVolume: avgDailyVolume.toFixed(1),
      sentimentTrend: (sentimentTrend * 100).toFixed(1),
      sentimentTrendDirection:
        sentimentTrend > 0.05
          ? "improving"
          : sentimentTrend < -0.05
            ? "declining"
            : "stable",
    };
  }, [mentions, timeRange]);

  // Generate report with current preferences (instant - no API call)
  const handleGenerateReport = () => {
    setStep("report");
  };

  // Skip personalization and go directly to report
  const handleSkipPersonalization = () => {
    setStep("report");
  };

  // Filter mentions based on user's content filter preference
  const filteredMentions = useMemo(() => {
    if (reportPreferences.contentFilter === "negative") {
      return mentions.filter((m) => m.sentiment === "negative");
    }
    if (reportPreferences.contentFilter === "positive") {
      return mentions.filter((m) => m.sentiment === "positive");
    }
    return mentions;
  }, [mentions, reportPreferences.contentFilter]);

  // Generate dynamic executive summary based on data
  const executiveSummary = useMemo(() => {
    const total = mentions.length;
    const negPct = Math.round((negativeCount / total) * 100) || 0;
    const posPct = Math.round((positiveCount / total) * 100) || 0;
    const topSource = sourceAnalysis[0]?.name || "Unknown";
    const topTrend = trends[0]?.keyword || "general news";

    if (reportPreferences.contentFilter === "negative") {
      return `This report focuses on ${negativeCount} negative media mentions out of ${total} total articles monitored over the last ${formatTimeRange(timeRange)}. The primary source of negative coverage is ${topSource}. Key areas of concern include "${topTrend}" with ${negativeCount > 5 ? "significant" : "moderate"} negative sentiment requiring attention.`;
    }

    if (reportPreferences.contentFilter === "positive") {
      return `This report highlights ${positiveCount} positive media mentions out of ${total} total articles monitored over the last ${formatTimeRange(timeRange)}. ${topSource} leads in positive coverage. Key positive themes include "${topTrend}" representing favorable public perception.`;
    }

    const sentiment =
      summary?.verdict === "positive"
        ? "positive"
        : summary?.verdict === "negative"
          ? "negative"
          : "mixed";
    return `Over the last ${formatTimeRange(timeRange)}, ${total} media articles were monitored across ${sourceAnalysis.length} sources. Overall sentiment is ${sentiment} with ${posPct}% positive and ${negPct}% negative coverage. ${topSource} is the most active source, and "${topTrend}" is the trending topic.`;
  }, [
    mentions,
    positiveCount,
    negativeCount,
    sourceAnalysis,
    trends,
    timeRange,
    summary,
    reportPreferences.contentFilter,
  ]);

  // Generate recommendations based on data
  const recommendations = useMemo(() => {
    const recs: string[] = [];

    if (negativeCount > positiveCount) {
      recs.push(
        "Immediate attention required: Negative sentiment exceeds positive. Consider proactive communication strategy.",
      );
    }

    if (criticalAlerts.length > 0) {
      recs.push(
        `${criticalAlerts.length} critical negative mentions detected in the last 48 hours. Prioritize response to these items.`,
      );
    }

    if (
      sourceAnalysis.length > 0 &&
      sourceAnalysis[0].negative > sourceAnalysis[0].positive
    ) {
      recs.push(
        `Focus on ${sourceAnalysis[0].name} which has higher negative coverage. Engage with this media outlet.`,
      );
    }

    if (periodComparison.sentimentTrendDirection === "declining") {
      recs.push(
        "Sentiment trend is declining. Monitor closely and identify root causes of negative coverage.",
      );
    } else if (periodComparison.sentimentTrendDirection === "improving") {
      recs.push(
        "Sentiment trend is improving. Continue current PR efforts and amplify positive narratives.",
      );
    }

    if (trends.length > 0) {
      recs.push(
        `Monitor trending topic "${trends[0].keyword}" closely as it has ${trends[0].count} mentions.`,
      );
    }

    if (recs.length === 0) {
      recs.push(
        "Continue regular media monitoring. No critical issues detected at this time.",
      );
    }

    return recs;
  }, [
    negativeCount,
    positiveCount,
    criticalAlerts,
    sourceAnalysis,
    periodComparison,
    trends,
  ]);

  // Download handlers
  const handleDownloadDocx = async () => {
    setIsGeneratingDocx(true);
    try {
      const reportData = carboneService.prepareReportData(
        mentions,
        summary,
        trends,
        timeRange,
      );
      const blob = await carboneService.generateDocxLocal(reportData);
      carboneService.downloadBlob(
        blob,
        `media-report-${new Date().toISOString().split("T")[0]}.docx`,
      );
    } catch (error) {
      console.error("Error generating DOCX report:", error);
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const reportData = carboneService.prepareReportData(
        mentions,
        summary,
        trends,
        timeRange,
      );
      carboneService.generatePdfViaPrint(reportData);
    } catch (error) {
      console.error("Error generating PDF report:", error);
    } finally {
      setTimeout(() => setIsGeneratingPdf(false), 500);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!summary) return;
    let md = `# Media Intelligence Report\n**Generated:** ${currentDate}\n**Period:** Last ${formatTimeRange(timeRange)}\n\n---\n\n`;
    md += `## Executive Summary\n- **Total Articles:** ${mentions.length}\n- **Sentiment Score:** ${summary.sentimentScore > 0 ? "+" : ""}${summary.sentimentScore.toFixed(0)}\n`;
    md += `- **Positive:** ${positiveCount} (${Math.round((positiveCount / mentions.length) * 100)}%)\n`;
    md += `- **Negative:** ${negativeCount} (${Math.round((negativeCount / mentions.length) * 100)}%)\n`;
    md += `- **Neutral:** ${neutralCount} (${Math.round((neutralCount / mentions.length) * 100)}%)\n\n`;
    md += `### AI Recommendation\n> ${summary.recommendation}\n\n---\n\n`;
    md += `## Period Metrics\n- **Avg Daily Volume:** ${periodComparison.avgDailyVolume} articles/day\n`;
    md += `- **Sentiment Trend:** ${periodComparison.sentimentTrendDirection} (${periodComparison.sentimentTrend}%)\n`;
    md += `\n---\n\n## Top Sources\n`;
    sourceAnalysis.slice(0, 5).forEach((s, i) => {
      md += `${i + 1}. **${s.name}** — ${s.total} articles (${s.positive} pos, ${s.neutral} neu, ${s.negative} neg)\n`;
    });
    md += `\n---\n\n## Trending Topics\n`;
    trends.slice(0, 10).forEach((t, i) => {
      md += `${i + 1}. **${t.keyword}** — ${t.count} mentions\n`;
    });
    md += `\n---\n\n## Key Coverage\n`;
    mentions.slice(0, 10).forEach((m) => {
      const date = new Date(
        m.publishedAt || m.publishedDate,
      ).toLocaleDateString();
      const titleWithLink = m.url ? `[${m.title}](${m.url})` : m.title;
      md += `### ${titleWithLink}\n*${m.source} · ${date} · ${m.sentiment.toUpperCase()}*\n\n${m.snippet}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `media-report-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col bg-white dark:bg-slate-900 overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        <DialogDescription className="sr-only">
          Media intelligence report with comprehensive analysis.
        </DialogDescription>

        {/* Step 1: Customize Report */}
        {step === "customize" && (
          <>
            {/* Header for Customize Step */}
            <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-white">
                    Customize Your Report
                  </DialogTitle>
                  <p className="text-sm text-indigo-200">
                    Tell us what you want to focus on (optional)
                  </p>
                </div>
              </div>
            </div>

            {/* Customize Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Instruction Input */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      What would you like in your report?
                    </h3>
                  </div>

                  <textarea
                    value={userInstructions}
                    onChange={(e) => setUserInstructions(e.target.value)}
                    placeholder="Examples:
• Show only negative news
• Include executive summary and recommendations
• Focus on critical alerts
• Show only positive coverage..."
                    className="w-full h-32 px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-400"
                  />

                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Tip:</span> Type what you want
                    to see. Leave blank for a comprehensive report.
                  </p>
                </div>

                {/* Quick Options */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Quick options
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        label: "Only negative news",
                        value: "Show only negative news",
                      },
                      {
                        label: "Only positive news",
                        value: "Show only positive news",
                      },
                      {
                        label: "Critical alerts",
                        value: "Focus on critical alerts",
                      },
                      {
                        label: "Add executive summary",
                        value: "Include executive summary",
                      },
                      {
                        label: "Add recommendations",
                        value: "Include recommendations",
                      },
                      {
                        label: "Show trends",
                        value: "Include trending topics",
                      },
                    ].map((option) => (
                      <button
                        key={option.label}
                        onClick={() =>
                          setUserInstructions((prev) =>
                            prev ? `${prev}, ${option.value}` : option.value,
                          )
                        }
                        className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-900/30 dark:hover:border-indigo-700 transition-colors"
                      >
                        + {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview of what will be shown */}
                {userInstructions.trim() && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
                      Your report will include:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {reportPreferences.contentFilter === "negative" && (
                        <span className="px-2 py-1 text-[10px] font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 rounded">
                          Negative news only ({negativeCount} articles)
                        </span>
                      )}
                      {reportPreferences.contentFilter === "positive" && (
                        <span className="px-2 py-1 text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded">
                          Positive news only ({positiveCount} articles)
                        </span>
                      )}
                      {reportPreferences.contentFilter === "all" && (
                        <span className="px-2 py-1 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                          All news ({mentions.length} articles)
                        </span>
                      )}
                      {reportPreferences.showExecutiveSummary && (
                        <span className="px-2 py-1 text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded">
                          Executive Summary
                        </span>
                      )}
                      {reportPreferences.showRecommendations && (
                        <span className="px-2 py-1 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                          Recommendations
                        </span>
                      )}
                      {reportPreferences.showCriticalAlerts &&
                        criticalAlerts.length > 0 && (
                          <span className="px-2 py-1 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                            Critical Alerts ({criticalAlerts.length})
                          </span>
                        )}
                      {reportPreferences.showTrends && (
                        <span className="px-2 py-1 text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                          Trending Topics
                        </span>
                      )}
                      {reportPreferences.showSources && (
                        <span className="px-2 py-1 text-[10px] font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 rounded">
                          Top Sources
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    variant="ghost"
                    onClick={handleSkipPersonalization}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Standard report
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>

                  <Button
                    onClick={handleGenerateReport}
                    className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    <FileBarChart className="w-4 h-4" />
                    Generate Report
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Report View */}
        {step === "report" && (
          <>
            {/* Header */}
            <div
              className="flex-shrink-0 px-6 py-4"
              style={{
                backgroundColor:
                  reportPreferences.contentFilter === "negative"
                    ? "#DC2626"
                    : reportPreferences.contentFilter === "positive"
                      ? "#059669"
                      : "#2563EB",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                  >
                    {reportPreferences.contentFilter === "negative" ? (
                      <AlertTriangle className="w-5 h-5 text-white" />
                    ) : reportPreferences.contentFilter === "positive" ? (
                      <TrendingUp className="w-5 h-5 text-white" />
                    ) : (
                      <BarChart3 className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-base font-semibold text-white">
                      {reportPreferences.contentFilter === "negative"
                        ? "Negative Coverage Report"
                        : reportPreferences.contentFilter === "positive"
                          ? "Positive Coverage Report"
                          : "Media Intelligence Report"}
                    </DialogTitle>
                    <p
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      {currentDate} &bull; {filteredMentions.length} articles
                      &bull; Last {formatTimeRange(timeRange)}
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-2"
                  style={{ marginRight: "40px" }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("customize")}
                    className="gap-1.5 text-xs"
                    style={{ color: "white" }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Customize
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadMarkdown}
                    className="gap-1.5 text-xs"
                    style={{ color: "white" }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    .md
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadDocx}
                    disabled={isGeneratingDocx}
                    className="gap-1.5 text-xs"
                    style={{ color: "white" }}
                  >
                    {isGeneratingDocx ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    .docx
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="gap-1.5 border-0 text-xs"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.2)",
                      color: "white",
                    }}
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                    .pdf
                  </Button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div
              className="flex-1 overflow-y-auto p-6"
              style={{ overflowY: "auto" }}
            >
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* Executive Summary - shown based on preference */}
                {reportPreferences.showExecutiveSummary && (
                  <div
                    className={`rounded-2xl p-6 border shadow-lg ${
                      reportPreferences.contentFilter === "negative"
                        ? "bg-gradient-to-br from-rose-50 via-red-50 to-orange-50 dark:from-rose-900/30 dark:via-red-900/30 dark:to-orange-900/30 border-rose-200 dark:border-rose-800"
                        : reportPreferences.contentFilter === "positive"
                          ? "bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-900/30 dark:via-green-900/30 dark:to-teal-900/30 border-emerald-200 dark:border-emerald-800"
                          : "bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 border-indigo-200 dark:border-indigo-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          reportPreferences.contentFilter === "negative"
                            ? "bg-gradient-to-br from-rose-500 to-red-500"
                            : reportPreferences.contentFilter === "positive"
                              ? "bg-gradient-to-br from-emerald-500 to-green-500"
                              : "bg-gradient-to-br from-indigo-500 to-purple-500"
                        }`}
                      >
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3
                          className={`text-sm font-bold uppercase tracking-wide ${
                            reportPreferences.contentFilter === "negative"
                              ? "text-rose-700 dark:text-rose-300"
                              : reportPreferences.contentFilter === "positive"
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-indigo-700 dark:text-indigo-300"
                          }`}
                        >
                          Executive Summary
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {reportPreferences.contentFilter === "negative"
                            ? "Focus: Negative Coverage Analysis"
                            : reportPreferences.contentFilter === "positive"
                              ? "Focus: Positive Coverage Analysis"
                              : "Comprehensive Media Analysis"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {executiveSummary}
                    </p>
                  </div>
                )}

                {/* Recommendations Section - shown based on preference */}
                {reportPreferences.showRecommendations &&
                  recommendations.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                          <Lightbulb className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                          Recommendations & Action Items
                        </h3>
                      </div>
                      <ul className="space-y-2">
                        {recommendations.map((rec, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-800/50"
                          >
                            <span className="text-amber-600 font-bold text-sm">
                              {i + 1}.
                            </span>
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {rec}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Row 1: Score, Distribution, Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Overall Score
                      </h3>
                    </div>
                    <SimpleScoreGauge score={summary?.sentimentScore || 0} />
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <BarChart3 className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Distribution
                      </h3>
                    </div>
                    <SimpleDonutChart
                      positive={positiveCount}
                      neutral={neutralCount}
                      negative={negativeCount}
                    />
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                        <Globe className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Quick Stats
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Total
                        </span>
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {mentions.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">
                          Positive
                        </span>
                        <span className="text-lg font-bold text-emerald-600">
                          {positiveCount}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                        <span className="text-xs text-rose-700 dark:text-rose-400">
                          Negative
                        </span>
                        <span className="text-lg font-bold text-rose-600">
                          {negativeCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Period Metrics */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                      <Activity className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Period Metrics
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <p className="text-2xl font-bold text-indigo-600">
                        {periodComparison.avgDailyVolume}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase">
                        Avg Daily Volume
                      </p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1">
                        <p
                          className={`text-2xl font-bold ${periodComparison.sentimentTrendDirection === "improving" ? "text-emerald-600" : periodComparison.sentimentTrendDirection === "declining" ? "text-rose-600" : "text-slate-600"}`}
                        >
                          {periodComparison.sentimentTrend}%
                        </p>
                        {periodComparison.sentimentTrendDirection ===
                          "improving" && (
                          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        )}
                        {periodComparison.sentimentTrendDirection ===
                          "declining" && (
                          <ArrowDownRight className="w-4 h-4 text-rose-500" />
                        )}
                        {periodComparison.sentimentTrendDirection ===
                          "stable" && (
                          <Minus className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 uppercase">
                        Sentiment Trend
                      </p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                        {sourceAnalysis.length}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase">
                        Unique Sources
                      </p>
                    </div>
                  </div>
                </div>

                {/* Critical Alerts - shown based on preference */}
                {reportPreferences.showCriticalAlerts &&
                  criticalAlerts.length > 0 && (
                    <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-5 border border-rose-200 dark:border-rose-800">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h3 className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                          Critical Alerts (Last 48h)
                        </h3>
                        <span className="text-xs bg-rose-200 dark:bg-rose-800 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full">
                          {criticalAlerts.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {criticalAlerts.map((alert, i) => (
                          <div
                            key={i}
                            className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-rose-200 dark:border-rose-800"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-rose-600 font-medium">
                                {alert.source}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                •
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(
                                  alert.publishedAt || alert.publishedDate,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            {alert.url ? (
                              <a
                                href={alert.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-1.5"
                              >
                                <p className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {alert.title}
                                </p>
                                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            ) : (
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {alert.title}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Top Sources + Trending Topics - shown based on preference */}
                {(reportPreferences.showSources ||
                  reportPreferences.showTrends) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reportPreferences.showSources && (
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                            <Building2 className="w-3.5 h-3.5 text-white" />
                          </div>
                          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Top Sources
                          </h3>
                        </div>
                        <SourceAnalysis sources={sourceAnalysis} />
                      </div>
                    )}

                    {reportPreferences.showTrends && (
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                            <Flame className="w-3.5 h-3.5 text-white" />
                          </div>
                          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Trending Topics
                          </h3>
                        </div>
                        <SimpleTrendsChart trends={trends} />
                      </div>
                    )}
                  </div>
                )}

                {/* Top 10 News - uses filtered mentions based on preference */}
                <div
                  className={`rounded-xl p-5 border shadow-sm ${
                    reportPreferences.contentFilter === "negative"
                      ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
                      : reportPreferences.contentFilter === "positive"
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        reportPreferences.contentFilter === "negative"
                          ? "bg-gradient-to-br from-rose-500 to-red-500"
                          : reportPreferences.contentFilter === "positive"
                            ? "bg-gradient-to-br from-emerald-500 to-green-500"
                            : "bg-gradient-to-br from-blue-500 to-cyan-500"
                      }`}
                    >
                      {reportPreferences.contentFilter === "negative" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-white" />
                      ) : reportPreferences.contentFilter === "positive" ? (
                        <TrendingUp className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <h3
                      className={`text-xs font-semibold ${
                        reportPreferences.contentFilter === "negative"
                          ? "text-rose-700 dark:text-rose-300"
                          : reportPreferences.contentFilter === "positive"
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {reportPreferences.contentFilter === "negative"
                        ? "Top 10 Negative News"
                        : reportPreferences.contentFilter === "positive"
                          ? "Top 10 Positive News"
                          : "Top 10 News"}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        reportPreferences.contentFilter === "negative"
                          ? "bg-rose-200 text-rose-700 dark:bg-rose-800 dark:text-rose-300"
                          : reportPreferences.contentFilter === "positive"
                            ? "bg-emerald-200 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300"
                            : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {filteredMentions.length} total
                    </span>
                  </div>
                  <div className="space-y-2">
                    {filteredMentions.slice(0, 10).map((mention, index) => (
                      <div
                        key={mention.id || index}
                        className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                          reportPreferences.contentFilter === "negative"
                            ? "bg-white dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/30"
                            : reportPreferences.contentFilter === "positive"
                              ? "bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                              : "bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span
                          className={`text-xs font-bold w-5 flex-shrink-0 ${
                            reportPreferences.contentFilter === "negative"
                              ? "text-rose-500"
                              : reportPreferences.contentFilter === "positive"
                                ? "text-emerald-500"
                                : "text-blue-500"
                          }`}
                        >
                          {index + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                mention.sentiment === "positive"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : mention.sentiment === "negative"
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                    : "bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {mention.sentiment}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {mention.source}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(
                                mention.publishedAt || mention.publishedDate,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          {mention.url ? (
                            <a
                              href={mention.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-start gap-1.5"
                            >
                              <h4 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {mention.title}
                              </h4>
                              <ExternalLink className="w-3 h-3 mt-0.5 text-slate-400 group-hover:text-indigo-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ) : (
                            <h4 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">
                              {mention.title}
                            </h4>
                          )}
                          {mention.snippet && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                              {mention.snippet}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredMentions.length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-4">
                        No articles found matching your criteria
                      </p>
                    )}
                  </div>
                </div>

                {/* Top 5 Positive & Top 5 Negative - only shown when viewing ALL news */}
                {reportPreferences.contentFilter === "all" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Top 5 Positive News */}
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                          <TrendingUp className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          Top 5 Positive News
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {mentions
                          .filter((m) => m.sentiment === "positive")
                          .slice(0, 5).length === 0 ? (
                          <p className="text-xs text-emerald-600/70 text-center py-4">
                            No positive news in this period
                          </p>
                        ) : (
                          mentions
                            .filter((m) => m.sentiment === "positive")
                            .slice(0, 5)
                            .map((mention, index) => (
                              <div
                                key={mention.id || index}
                                className="flex items-start gap-2 p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-800/50"
                              >
                                <span className="text-xs font-bold text-emerald-600 w-4 flex-shrink-0">
                                  {index + 1}.
                                </span>
                                <div className="flex-1 min-w-0">
                                  {mention.url ? (
                                    <a
                                      href={mention.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group flex items-start gap-1"
                                    >
                                      <h4 className="text-xs font-medium text-slate-900 dark:text-white line-clamp-2 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {mention.title}
                                      </h4>
                                      <ExternalLink className="w-2.5 h-2.5 mt-0.5 text-slate-400 group-hover:text-indigo-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                  ) : (
                                    <h4 className="text-xs font-medium text-slate-900 dark:text-white line-clamp-2 mb-1">
                                      {mention.title}
                                    </h4>
                                  )}
                                  <p className="text-[10px] text-emerald-600">
                                    {mention.source} •{" "}
                                    {new Date(
                                      mention.publishedAt ||
                                        mention.publishedDate,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>

                    {/* Top 5 Negative News */}
                    <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-5 border border-rose-200 dark:border-rose-800">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h3 className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                          Top 5 Negative News
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {mentions
                          .filter((m) => m.sentiment === "negative")
                          .slice(0, 5).length === 0 ? (
                          <p className="text-xs text-rose-600/70 text-center py-4">
                            No negative news in this period
                          </p>
                        ) : (
                          mentions
                            .filter((m) => m.sentiment === "negative")
                            .slice(0, 5)
                            .map((mention, index) => (
                              <div
                                key={mention.id || index}
                                className="flex items-start gap-2 p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-rose-200 dark:border-rose-800/50"
                              >
                                <span className="text-xs font-bold text-rose-600 w-4 flex-shrink-0">
                                  {index + 1}.
                                </span>
                                <div className="flex-1 min-w-0">
                                  {mention.url ? (
                                    <a
                                      href={mention.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group flex items-start gap-1"
                                    >
                                      <h4 className="text-xs font-medium text-slate-900 dark:text-white line-clamp-2 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {mention.title}
                                      </h4>
                                      <ExternalLink className="w-2.5 h-2.5 mt-0.5 text-slate-400 group-hover:text-indigo-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                  ) : (
                                    <h4 className="text-xs font-medium text-slate-900 dark:text-white line-clamp-2 mb-1">
                                      {mention.title}
                                    </h4>
                                  )}
                                  <p className="text-[10px] text-rose-600">
                                    {mention.source} •{" "}
                                    {new Date(
                                      mention.publishedAt ||
                                        mention.publishedDate,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-400">
                    {reportPreferences.hasCustomization
                      ? "Customized Report • "
                      : ""}
                    Generated by Media Monitor &bull; {currentDate}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
