import { MediaMentionData } from "../types";
import {
  ExternalLink,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Share2,
  Flag,
  BarChart2,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MentionCardProps {
  mention: MediaMentionData;
  onDelete?: (id: string) => void;
  isHighlighted?: boolean;
}

export function MentionCard({
  mention,
  onDelete,
  isHighlighted,
}: MentionCardProps) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600 dark:text-green-400";
      case "negative":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-slate-600 dark:text-slate-400";
    }
  };

  const getSentimentBgColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 dark:bg-green-950";
      case "negative":
        return "bg-red-100 dark:bg-red-950";
      default:
        return "bg-slate-100 dark:bg-slate-800";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="w-3 h-3" />;
      case "negative":
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Recent";

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) return "Recent";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative bg-white dark:bg-slate-900 border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 ${
        isHighlighted
          ? "ring-2 ring-indigo-500 border-indigo-500"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image Thumbnail - Only render if image exists */}
        {mention.image && (
          <div className="sm:w-48 h-32 sm:h-auto relative flex-shrink-0 bg-slate-100 dark:bg-slate-800">
            <ImageWithFallback
              src={
                typeof mention.image === "object" &&
                mention.image !== null &&
                "url" in mention.image
                  ? (mention.image as any).url
                  : mention.image
              }
              alt={mention.title}
              className="w-full h-full object-cover"
            />
            {/* Overlay sentiment badge on mobile image */}
            <div className="absolute top-2 left-2 sm:hidden">
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shadow-sm backdrop-blur-md ${getSentimentBgColor(
                  mention.sentiment,
                )} ${getSentimentColor(mention.sentiment)} bg-opacity-90`}
              >
                {getSentimentIcon(mention.sentiment)}
                <span className="capitalize">{mention.sentiment}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 p-4 flex flex-col">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {mention.source}
                </span>
                <span>•</span>
                <Calendar className="w-3 h-3" />
                <span>
                  {formatDate(mention.publishedAt || mention.publishedDate)}
                </span>
              </div>

              {/* Sentiment Badge - Desktop */}
              <div
                className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  mention.sentiment === "positive"
                    ? "border-green-200 dark:border-green-900"
                    : mention.sentiment === "negative"
                      ? "border-red-200 dark:border-red-900"
                      : "border-slate-200 dark:border-slate-700"
                } ${getSentimentBgColor(
                  mention.sentiment,
                )} ${getSentimentColor(mention.sentiment)}`}
              >
                {getSentimentIcon(mention.sentiment)}
                <span className="capitalize">{mention.sentiment}</span>
                {mention.score && (
                  <span className="opacity-70 ml-1">
                    {(mention.score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions Dropdown (Mobile) or Buttons (Desktop) */}
            <div className="flex items-center gap-1">
              <button
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(mention.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <a
            href={mention.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-2 group-hover:translate-x-0.5 transition-transform"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2 leading-tight">
              {mention.title}
            </h3>
          </a>

          {/* Snippet */}
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
            {mention.snippet}
          </p>

          {/* Footer: Entities & Actions */}
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/50">
            {/* Entities/Keywords */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-linear-fade">
              {mention.keywords &&
                mention.keywords.slice(0, 3).map((keyword, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                  >
                    #{keyword}
                  </span>
                ))}
            </div>

            {/* Call to Action */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
              >
                <BarChart2 className="w-3 h-3 mr-1.5" />
                Analyze
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30"
              >
                <Flag className="w-3 h-3 mr-1.5" />
                Flag
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
