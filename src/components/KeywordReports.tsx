import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Sparkles,
  FileText,
  Loader2,
  X,
  BarChart3,
  FileCheck,
  FileStack,
  Layers,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { useAuth } from "../contexts/AuthContext";
import { projectId } from "../utils/supabase/info";
import { MediaMentionData } from "./MediaMention";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { dataService, GeneratedReport } from "../services/dataService";
import { ReportViewer } from "./ReportViewer";

interface KeywordReportsProps {
  keywords: string[];
  allMentions: MediaMentionData[];
}

export function KeywordReports({ keywords, allMentions }: KeywordReportsProps) {
  const { accessToken } = useAuth();
  const [generatingKeyword, setGeneratingKeyword] = useState<string | null>(
    null,
  );
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(
    null,
  );
  const [reportSize, setReportSize] = useState<
    "brief" | "standard" | "comprehensive"
  >("standard");
  const [generatingAll, setGeneratingAll] = useState(false);
  const [customWordCount, setCustomWordCount] = useState<string>("8000");
  const [reportFormat, setReportFormat] = useState<string>(
    "Executive Summary, Key Findings, Sentiment Analysis, Risk Assessment, Geographic Focus, Recommendations",
  );
  const [reportsLoaded, setReportsLoaded] = useState(false);

  // Load reports on mount
  useEffect(() => {
    const loadReports = async () => {
      if (!accessToken) {
        console.log("No access token, skipping reports load");
        setReportsLoaded(true);
        return;
      }

      const data = await dataService.loadReports(accessToken);
      if (data && data.reports && data.reports.length > 0) {
        setReports(data.reports);
        // Auto-select the most recent report
        setSelectedReport(data.reports[0]);
        console.log("Loaded reports successfully:", data.reports.length);
        toast.success(
          `Loaded ${data.reports.length} saved report${data.reports.length > 1 ? "s" : ""}`,
        );
      }
      setReportsLoaded(true);
    };

    loadReports();
  }, [accessToken]);

  // Save reports whenever they change
  useEffect(() => {
    if (!reportsLoaded || !accessToken) {
      return;
    }

    const saveReports = async () => {
      const success = await dataService.saveReports(accessToken, reports);
      if (success) {
        console.log("Reports auto-saved successfully");
      }
    };

    // Debounce saves to avoid too many requests
    const timeoutId = setTimeout(saveReports, 1000);
    return () => clearTimeout(timeoutId);
  }, [reports, accessToken, reportsLoaded]);

  const generateReport = async (keyword: string) => {
    setGeneratingKeyword(keyword);
    try {
      // Filter articles that contain this keyword (case-insensitive)
      const keywordArticles = allMentions.filter(
        (mention) =>
          mention.title?.toLowerCase().includes(keyword.toLowerCase()) ||
          mention.content?.toLowerCase().includes(keyword.toLowerCase()) ||
          mention.keywords?.some(
            (k) => k && k.toLowerCase().includes(keyword.toLowerCase()),
          ),
      );

      if (keywordArticles.length === 0) {
        toast.error(`No articles found for keyword: \"${keyword}\"`);
        setGeneratingKeyword(null);
        return;
      }

      // Create a placeholder report that will be updated as content streams in
      const placeholderReport: GeneratedReport = {
        keyword: keyword,
        report: "",
        articleCount: keywordArticles.length,
        generatedAt: new Date().toISOString(),
        reportSize,
      };

      setReports((prev) => [placeholderReport, ...prev]);
      setSelectedReport(placeholderReport);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/settings/generate-keyword-report`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            keyword,
            articles: keywordArticles.map((a) => ({
              title: a.title || "",
              source: a.source || "",
              published: a.published || "",
              sentiment: a.sentiment || "neutral",
              content: a.content || "",
            })),
            reportSize,
            customWordCount,
            reportFormat,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setReports((prev) => prev.filter((r) => r.keyword !== keyword));
        setSelectedReport(null);

        if (data.retryAfter) {
          toast.error(
            `${data.error}\n\nPlease wait ${data.retryAfter} seconds and try again.`,
            { duration: 8000 },
          );
        } else {
          toast.error(`Report generation failed: ${data.error}`);
        }
        setGeneratingKeyword(null);
        return;
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        toast.success(
          `Generating report for "${keyword}"... Streaming content`,
          { duration: 2000 },
        );

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  accumulatedContent += data.content;

                  // Update the report in real-time
                  setReports((prev) =>
                    prev.map((r) =>
                      r.keyword === keyword
                        ? { ...r, report: accumulatedContent }
                        : r,
                    ),
                  );

                  // Update selected report if it's the current one
                  setSelectedReport((prev) =>
                    prev?.keyword === keyword
                      ? { ...prev, report: accumulatedContent }
                      : prev,
                  );
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }

        toast.success(
          `Report completed for "${keyword}" with ${keywordArticles.length} articles`,
        );
      }
    } catch (error) {
      console.error("Generate report error:", error);
      toast.error(
        "Report generation request failed. Please check your connection and try again.",
      );
      setReports((prev) => prev.filter((r) => r.keyword !== keyword));
      setSelectedReport(null);
    } finally {
      setGeneratingKeyword(null);
    }
  };

  const deleteReport = (keyword: string) => {
    setReports((prev) => prev.filter((r) => r.keyword !== keyword));
    if (selectedReport?.keyword === keyword) {
      setSelectedReport(null);
    }
    toast.success(`Deleted report for "${keyword}"`);
  };

  const generateAllKeywordsReport = async () => {
    if (allMentions.length === 0) {
      toast.error("No articles available to analyze");
      return;
    }

    if (keywords.length === 0) {
      toast.error("No keywords configured");
      return;
    }

    setGeneratingAll(true);
    const reportKeyword = `All Keywords Report (${reportSize})`;

    try {
      // Tag each article with its relevant keyword
      const articlesWithKeywords = allMentions.map((mention) => {
        const relevantKeywords = keywords.filter(
          (kw) =>
            (mention.title?.toLowerCase() || "").includes(kw.toLowerCase()) ||
            (mention.content?.toLowerCase() || "").includes(kw.toLowerCase()) ||
            mention.keywords?.some(
              (k) => k && k.toLowerCase().includes(kw.toLowerCase()),
            ) ||
            false,
        );

        return {
          title: mention.title || "",
          source: mention.source || "",
          published: mention.published || "",
          sentiment: mention.sentiment || "neutral",
          content: mention.content || "",
          keyword: relevantKeywords.join(", ") || "General",
        };
      });

      // Create a placeholder report
      const placeholderReport: GeneratedReport = {
        keyword: reportKeyword,
        report: "",
        articleCount: allMentions.length,
        generatedAt: new Date().toISOString(),
        reportSize,
        isAllKeywords: true,
      };

      setReports((prev) => [placeholderReport, ...prev]);
      setSelectedReport(placeholderReport);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/settings/generate-all-keywords-report`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            keywords,
            articles: articlesWithKeywords,
            reportSize,
            customWordCount,
            reportFormat,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setReports((prev) => prev.filter((r) => r.keyword !== reportKeyword));
        setSelectedReport(null);

        if (data.retryAfter) {
          toast.error(
            `${data.error}\n\nPlease wait ${data.retryAfter} seconds and try again.`,
            { duration: 8000 },
          );
        } else {
          toast.error(`Report generation failed: ${data.error}`);
        }
        setGeneratingAll(false);
        return;
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        toast.success(`Generating comprehensive report... Streaming content`, {
          duration: 2000,
        });

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  accumulatedContent += data.content;

                  // Update the report in real-time
                  setReports((prev) =>
                    prev.map((r) =>
                      r.keyword === reportKeyword
                        ? { ...r, report: accumulatedContent }
                        : r,
                    ),
                  );

                  // Update selected report if it's the current one
                  setSelectedReport((prev) =>
                    prev?.keyword === reportKeyword
                      ? { ...prev, report: accumulatedContent }
                      : prev,
                  );
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }

        toast.success(
          `Comprehensive ${reportSize} report completed with ${allMentions.length} articles`,
        );
      }
    } catch (error) {
      console.error("Generate all keywords report error:", error);
      toast.error(
        "Report generation request failed. Please check your connection and try again.",
      );
      setReports((prev) => prev.filter((r) => r.keyword === reportKeyword));
      setSelectedReport(null);
    } finally {
      setGeneratingAll(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Keyword List */}
      <div className="lg:col-span-1 space-y-4">
        {/* All Keywords Report Generator */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-base">
                Comprehensive Report
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Generate a comprehensive analysis across all {keywords.length}{" "}
              keywords
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {allMentions.length === 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-4">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  ⚠️ No recent scan data available. Please perform a search in
                  the Media Inquiry tab first.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Number of Words
              </label>
              <Input
                type="number"
                value={customWordCount}
                onChange={(e) => setCustomWordCount(e.target.value)}
                placeholder="e.g., 1000"
                min="100"
                max="5000"
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 500-2000 words
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Report Format / Structure
              </label>
              <Textarea
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value)}
                placeholder="e.g., Executive Summary, Key Findings, Recommendations"
                className="w-full min-h-[100px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Describe the sections you want in the report (comma-separated)
              </p>
            </div>

            <Button
              onClick={generateAllKeywordsReport}
              disabled={
                generatingAll ||
                generatingKeyword !== null ||
                keywords.length === 0 ||
                allMentions.length === 0 ||
                !customWordCount ||
                !reportFormat
              }
              className="w-full h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
            >
              {generatingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating report...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate All Keywords Report
                </>
              )}
            </Button>

            <div className="flex items-center justify-between text-xs text-muted-foreground bg-white dark:bg-slate-900/50 p-2 rounded-lg">
              <span>{allMentions.length} articles available</span>
              <span>{keywords.length} keywords</span>
            </div>
          </CardContent>
        </Card>

        {/* Generated Reports List */}
        {reports.length > 0 && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
            <CardHeader>
              <CardTitle className="text-sm">
                Recent Reports ({reports.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {reports.map((report) => (
                <div
                  key={report.keyword}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedReport?.keyword === report.keyword
                      ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700"
                      : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800"
                  }`}
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {report.keyword}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {report.articleCount} articles
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReport(report.keyword);
                      }}
                      className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Panel - Report Display */}
      <div className="lg:col-span-2">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 min-h-[600px]">
          <CardHeader>
            {selectedReport ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Report: {selectedReport.keyword}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/50 text-indigo-700 dark:text-indigo-300 border-0"
                  >
                    {selectedReport.articleCount} articles analyzed
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generated:{" "}
                  {new Date(selectedReport.generatedAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <div>
                <CardTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Keyword Analysis Report
                </CardTitle>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {generatingKeyword || generatingAll ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-50"></div>
                  <div className="relative bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-full">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">
                    {generatingAll
                      ? `Generating comprehensive ${reportSize} report...`
                      : `Generating report for "${generatingKeyword}"`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {generatingAll
                      ? "Analyzing all keywords with AI..."
                      : "Analyzing articles with AI..."}
                  </p>
                </div>
              </div>
            ) : selectedReport ? (
              <ReportViewer content={selectedReport.report} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="inline-flex p-4 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/50 rounded-2xl mb-4">
                  <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="font-medium text-foreground">
                  No report selected
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate a report from the keyword list
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
