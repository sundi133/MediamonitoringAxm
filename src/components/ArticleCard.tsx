import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { MediaMentionData } from "./MediaMention";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ExternalLink, Calendar } from "lucide-react";

interface ArticleCardProps {
  article: MediaMentionData;
}

export function ArticleCard({ article }: ArticleCardProps) {
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

  return (
    <Card className="group border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col">
      {/* Article Image */}
      {article.image ? (
        <div className="relative w-full h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Hide image on error
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      ) : (
        <div className="relative w-full h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
          <div className="text-slate-400 dark:text-slate-600 text-center px-4">
            <ExternalLink className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No image available</p>
          </div>
        </div>
      )}

      <CardContent className="p-5 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {article.title}
        </h3>

        {/* Description/Snippet */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3 flex-1">
          {article.snippet}
        </p>

        {/* Meta Information */}
        <div className="space-y-3 mt-auto">
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-medium">{article.source}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-xs">
                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Sentiment Badge */}
          <div className="flex items-center gap-2">
            <Badge
              className={`${getSentimentColor(article.sentiment)} border-0 shadow-sm px-3 py-1 text-xs`}
            >
              {article.sentiment}
            </Badge>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors text-sm flex items-center gap-1"
            >
              Read more
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
