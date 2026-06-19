export interface MonitoringSource {
  id: string;
  name: string;
  type: "news" | "social" | "blog" | "forum";
  enabled: boolean;
}

export interface UserSettings {
  keywords: string[];
  sources: MonitoringSource[];
}
