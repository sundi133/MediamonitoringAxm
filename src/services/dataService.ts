import { projectId, publicAnonKey } from "../utils/supabase/info";
import { MediaMentionData } from "../components/MediaMention";
import { Alert } from "../components/AlertsPanel";

export interface UserData {
  mentions: MediaMentionData[];
  alerts: Alert[];
  lastFetchTime: string | null;
}

export interface GeneratedReport {
  keyword: string;
  report: string;
  articleCount: number;
  generatedAt: string;
  reportSize?: "brief" | "standard" | "comprehensive";
  isAllKeywords?: boolean;
}

export interface UserReports {
  reports: GeneratedReport[];
}

class DataService {
  private baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-211993fd`;

  async loadData(accessToken: string | null): Promise<UserData | null> {
    if (!accessToken) {
      console.log("No access token, skipping data load");
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/data`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(
          "Failed to load data (status:",
          response.status,
          "):",
          error,
        );
        return null;
      }

      const data = await response.json();
      console.log("Loaded user data:", {
        mentionsCount: data.mentions?.length || 0,
        alertsCount: data.alerts?.length || 0,
      });
      return data;
    } catch (error) {
      console.error("Error loading data:", error);
      return null;
    }
  }

  async saveData(
    accessToken: string | null,
    mentions: MediaMentionData[],
    alerts: Alert[],
    lastFetchTime: Date | null,
  ): Promise<boolean> {
    if (!accessToken) {
      console.log("No access token, skipping data save");
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/data`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mentions,
          alerts,
          lastFetchTime: lastFetchTime?.toISOString() || null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error(
          "Failed to save data (status:",
          response.status,
          "):",
          errorData,
        );
        return false;
      }

      console.log("Data saved successfully");
      return true;
    } catch (error) {
      console.error("Exception during data save:", error);
      return false;
    }
  }

  async loadReports(accessToken: string | null): Promise<UserReports | null> {
    if (!accessToken) {
      console.log("No access token, skipping reports load");
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/reports`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(
          "Failed to load reports (status:",
          response.status,
          "):",
          error,
        );
        return null;
      }

      const data = await response.json();
      console.log("Loaded user reports:", {
        reportsCount: data.reports?.length || 0,
      });
      return data;
    } catch (error) {
      console.error("Error loading reports:", error);
      return null;
    }
  }

  async saveReports(
    accessToken: string | null,
    reports: GeneratedReport[],
  ): Promise<boolean> {
    if (!accessToken) {
      console.log("No access token, skipping reports save");
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/reports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reports,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error(
          "Failed to save reports (status:",
          response.status,
          "):",
          errorData,
        );
        return false;
      }

      console.log("Reports saved successfully");
      return true;
    } catch (error) {
      console.error("Exception during reports save:", error);
      return false;
    }
  }
}

export const dataService = new DataService();
