import { Progress } from "./ui/progress";
import { Card, CardContent } from "./ui/card";
import { Search, Clock } from "lucide-react";

interface SearchProgressBarProps {
  current: number;
  total: number;
  currentKeyword: string;
  isVisible: boolean;
}

export function SearchProgressBar({
  current,
  total,
  currentKeyword,
  isVisible,
}: SearchProgressBarProps) {
  if (!isVisible || total === 0) {
    return null;
  }

  const percentage = Math.round((current / total) * 100);

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Searching Media Mentions
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300">
              <Clock className="w-3 h-3" />
              <span>
                {current}/{total}
              </span>
            </div>
          </div>

          <Progress
            value={percentage}
            className="h-2 bg-blue-100 dark:bg-blue-900"
          />

          <div className="text-xs text-blue-700 dark:text-blue-300">
            <span className="font-medium">Current keyword:</span>{" "}
            <span className="font-mono bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
              "{currentKeyword}"
            </span>
          </div>

          <div className="text-xs text-blue-600 dark:text-blue-400">
            Searching for negative media mentions across India-based sources...
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
