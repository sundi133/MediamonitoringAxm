import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AlertTriangle, X, ExternalLink } from "lucide-react";

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: "high" | "medium" | "low";
  source: string;
  timestamp: string;
  url?: string;
  dismissed: boolean;
  mentionId?: string; // Reference to the related media mention
  relatedMentions?: string[]; // Array of related mention IDs
}

interface AlertsPanelProps {
  alerts: Alert[];
  onDismissAlert: (id: string) => void;
  onAlertClick?: (mentionId: string) => void;
}

export function AlertsPanel({
  alerts,
  onDismissAlert,
  onAlertClick,
}: AlertsPanelProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-gradient-to-br from-red-50 to-red-100 text-red-800 border-red-200 dark:from-red-950/30 dark:to-red-900/30 dark:text-red-300 dark:border-red-800";
      case "medium":
        return "bg-gradient-to-br from-amber-50 to-amber-100 text-amber-800 border-amber-200 dark:from-amber-950/30 dark:to-amber-900/30 dark:text-amber-300 dark:border-amber-800";
      case "low":
        return "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800 border-blue-200 dark:from-blue-950/30 dark:to-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      default:
        return "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 border-gray-200 dark:from-gray-950/30 dark:to-gray-900/30 dark:text-gray-300 dark:border-gray-800";
    }
  };

  const getSeverityIcon = (severity: string) => {
    return (
      <AlertTriangle
        className={`w-4 h-4 ${
          severity === "high"
            ? "text-red-600 dark:text-red-400"
            : severity === "medium"
              ? "text-amber-600 dark:text-amber-400"
              : "text-blue-600 dark:text-blue-400"
        }`}
      />
    );
  };

  const activeAlerts = alerts.filter((alert) => !alert.dismissed);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-950/50 dark:to-red-900/50 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Active Alerts ({activeAlerts.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeAlerts.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex p-4 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-950/50 dark:to-green-900/50 rounded-2xl mb-4">
              <AlertTriangle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-muted-foreground">
              No active alerts. Your media monitoring is running smoothly.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeAlerts.map((alert) => {
              const hasRelatedMentions =
                alert.relatedMentions && alert.relatedMentions.length > 0;
              const isClickable = hasRelatedMentions && onAlertClick;

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border-2 ${getSeverityColor(alert.severity)} ${isClickable ? "cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200" : ""}`}
                  onClick={() => {
                    if (isClickable && alert.relatedMentions) {
                      onAlertClick(alert.relatedMentions[0]);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(alert.severity)}
                      <h4 className="font-semibold">{alert.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold rounded-lg"
                      >
                        {alert.severity}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissAlert(alert.id);
                        }}
                        className="h-8 w-8 p-0 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm mb-3">{alert.message}</p>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium">{alert.source}</span>
                      <span>•</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      {hasRelatedMentions && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            {alert.relatedMentions.length} mention
                            {alert.relatedMentions.length > 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>

                    {alert.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg"
                        asChild
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <a
                          href={alert.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    )}
                  </div>

                  {isClickable && (
                    <div className="mt-3 pt-3 border-t border-current/20">
                      <p className="text-xs text-muted-foreground italic">
                        💡 Click to view related mention
                        {alert.relatedMentions &&
                        alert.relatedMentions.length > 1
                          ? "s"
                          : ""}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
