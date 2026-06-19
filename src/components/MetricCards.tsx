import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TrendingUp, TrendingDown, AlertTriangle, Eye } from "lucide-react";

interface Metric {
  title: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  icon: React.ReactNode;
  color: string;
}

interface MetricCardsProps {
  totalMentions: number;
  negativeMentions: number;
  sentimentScore: number;
  alertsCount: number;
}

export function MetricCards({
  totalMentions,
  negativeMentions,
  sentimentScore,
  alertsCount,
}: MetricCardsProps) {
  const metrics: Metric[] = [
    {
      title: "Total Mentions",
      value: totalMentions.toLocaleString(),
      change: 12,
      trend: "up",
      icon: <Eye className="w-4 h-4" />,
      color: "text-blue-600",
    },
    {
      title: "Negative Mentions",
      value: negativeMentions.toLocaleString(),
      change: -8,
      trend: "down",
      icon: <TrendingDown className="w-4 h-4" />,
      color: "text-red-600",
    },
    {
      title: "Sentiment Score",
      value: sentimentScore.toFixed(2),
      change: 15,
      trend: "up",
      icon: <TrendingUp className="w-4 h-4" />,
      color: sentimentScore > 0 ? "text-green-600" : "text-red-600",
    },
    {
      title: "Active Alerts",
      value: alertsCount,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: alertsCount > 0 ? "text-red-600" : "text-green-600",
    },
  ];

  const getTrendIcon = (trend?: string, change?: number) => {
    if (!trend || !change) return null;

    return trend === "up" ? (
      <span className="flex items-center text-green-600 text-xs">
        <TrendingUp className="w-3 h-3 mr-1" />+{change}%
      </span>
    ) : (
      <span className="flex items-center text-red-600 text-xs">
        <TrendingDown className="w-3 h-3 mr-1" />
        {change}%
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <Card
          key={index}
          className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 hover:shadow-xl transition-all duration-200"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              {metric.title}
            </CardTitle>
            <div
              className={`${metric.color} bg-gradient-to-br ${metric.color.includes("blue") ? "from-blue-100 to-blue-50 dark:from-blue-950/50 dark:to-blue-900/50" : metric.color.includes("red") ? "from-red-100 to-red-50 dark:from-red-950/50 dark:to-red-900/50" : "from-green-100 to-green-50 dark:from-green-950/50 dark:to-green-900/50"} p-2.5 rounded-xl`}
            >
              {metric.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-3xl font-bold ${metric.color}`}>
                {metric.value}
              </div>
              {getTrendIcon(metric.trend, metric.change)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
