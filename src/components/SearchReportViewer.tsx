import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { FileText, ChevronDown, ChevronUp, Download } from "lucide-react";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SearchReportViewerProps {
  report: string;
  userQuery: string;
  articleCount: number;
  onViewArticles?: () => void;
}

export function SearchReportViewer({
  report,
  userQuery,
  articleCount,
  onViewArticles,
}: SearchReportViewerProps) {
  const [showFullReport, setShowFullReport] = useState(true);

  const downloadReport = () => {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `media-monitoring-report-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Report Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-foreground">
                  Comprehensive Analysis Report
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                  Your Query:
                </span>{" "}
                "{userQuery}"
              </p>
              <p className="text-xs text-muted-foreground">
                Analyzed {articleCount} relevant{" "}
                {articleCount === 1 ? "article" : "articles"} • Generated{" "}
                {new Date().toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadReport}
                className="rounded-full"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              {onViewArticles && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewArticles}
                  className="rounded-full"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  View Articles
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullReport(!showFullReport)}
                className="rounded-full"
              >
                {showFullReport ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Expand
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {showFullReport && (
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
          <CardContent className="pt-8 pb-8 px-8">
            <Markdown remarkPlugins={[remarkGfm]}>{report}</Markdown>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
