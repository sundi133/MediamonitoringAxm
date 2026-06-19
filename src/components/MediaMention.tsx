import { useState } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import {
  ExternalLink,
  AlertTriangle,
  Trash2,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { llmService } from "../services/llmService";
import { toast } from "sonner@2.0.3";

export interface MediaMentionData {
  id: string;
  title: string;
  source: string;
  url: string;
  snippet: string;
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number;
  publishedAt: string;
  publishedDate?: string; // Alias for publishedAt for backwards compatibility
  entities: string[];
  keywords: string[];
  image?: string; // og:image or article thumbnail
}

interface MediaMentionProps {
  mention: MediaMentionData;
  onDelete: (id: string) => void;
  isHighlighted?: boolean;
}

// LLM explanation is now just a plain text string

export function MediaMention({
  mention,
  onDelete,
  isHighlighted = false,
}: MediaMentionProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-950/50 dark:to-emerald-950/50 dark:text-green-300";
      case "negative":
        return "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 dark:from-red-950/50 dark:to-rose-950/50 dark:text-red-300";
      default:
        return "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 dark:from-slate-800 dark:to-gray-800 dark:text-slate-300";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    if (sentiment === "negative") {
      return (
        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
      );
    }
    return null;
  };

  const handleExplainNegative = async () => {
    if (explanation) {
      setShowExplanation(!showExplanation);
      return;
    }

    setLoadingExplanation(true);
    try {
      const llmResponse = await llmService.explainNegativeSentiment(
        mention.title,
        mention.snippet,
        mention.source,
      );
      setExplanation(llmResponse);
      setShowExplanation(true);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Failed to get explanation:", error);
      toast.error("Failed to analyze the article. Please try again.");
    } finally {
      setLoadingExplanation(false);
    }
  };

  return (
    <Card
      className={`mb-4 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 transition-all duration-300 ${
        isHighlighted
          ? "ring-4 ring-yellow-400 dark:ring-yellow-500 shadow-xl shadow-yellow-200 dark:shadow-yellow-900/50 scale-[1.02]"
          : "hover:shadow-xl"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getSentimentIcon(mention.sentiment)}
              <h3 className="font-semibold text-foreground">{mention.title}</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">{mention.source}</span>
              <span>•</span>
              <span>{new Date(mention.publishedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={`${getSentimentColor(mention.sentiment)} border-0 shadow-sm px-3 py-1`}
            >
              {mention.sentiment} ({mention.sentimentScore.toFixed(2)})
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(mention.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg h-8 w-8 p-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {mention.snippet}
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          <div className="text-xs font-semibold text-muted-foreground">
            Entities:
          </div>
          {mention.entities.map((entity, index) => (
            <Badge
              key={index}
              variant="outline"
              className="text-xs rounded-lg border-slate-300 dark:border-slate-700"
            >
              {entity}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="text-xs font-semibold text-muted-foreground">
            Keywords:
          </div>
          {mention.keywords.map((keyword, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
            >
              {keyword}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          {mention.sentiment === "negative" && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-700 border-red-200 dark:from-red-950/30 dark:to-rose-950/30 dark:text-red-300 dark:border-red-800 rounded-xl shadow-sm"
              onClick={handleExplainNegative}
              disabled={loadingExplanation}
            >
              {loadingExplanation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <HelpCircle className="w-4 h-4" />
                  {explanation
                    ? (showExplanation ? "Hide" : "Show") + " Analysis"
                    : "Why is this negative?"}
                </>
              )}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 rounded-xl shadow-sm hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 hover:text-white hover:border-transparent transition-all duration-200"
            asChild
          >
            <a href={mention.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              View Original
            </a>
          </Button>
        </div>

        {/* LLM Explanation Panel */}
        {showExplanation && explanation && mention.sentiment === "negative" && (
          <div className="mt-4 p-5 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-2 border-red-200 dark:border-red-800 rounded-2xl shadow-inner">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-red-100 dark:bg-red-900/50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <h4 className="font-semibold text-red-800 dark:text-red-200">
                Negative Sentiment Analysis
              </h4>
            </div>

            <div className="text-sm text-red-700 dark:text-red-300 leading-relaxed whitespace-pre-wrap">
              {explanation}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
