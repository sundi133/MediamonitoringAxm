import { projectId, publicAnonKey } from "../utils/supabase/info";
import { MonitoringSource, UserSettings } from "../types/settings";

class SettingsService {
  private baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-211993fd`;

  async loadSettings(accessToken: string | null): Promise<UserSettings | null> {
    if (!accessToken) {
      console.log("No access token, skipping settings load");
      return null;
    }

    console.log(
      "Loading settings with token (first 20 chars):",
      accessToken.substring(0, 20) + "...",
    );
    console.log("Token length:", accessToken.length);
    console.log("Token structure (parts):", accessToken.split(".").length);
    console.log("Full URL:", `${this.baseUrl}/settings`);

    try {
      const response = await fetch(`${this.baseUrl}/settings`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(
          "Failed to load settings (status:",
          response.status,
          "):",
          error,
        );
        return null;
      }

      const settings = await response.json();
      console.log("Loaded user settings:", settings);
      return settings;
    } catch (error) {
      console.error("Error loading settings:", error);
      return null;
    }
  }

  async saveSettings(
    accessToken: string | null,
    keywords: string[],
    sources: MonitoringSource[],
  ): Promise<boolean> {
    if (!accessToken) {
      console.log("No access token, skipping settings save");
      return false;
    }

    console.log("=== SAVE SETTINGS CLIENT ===");
    console.log("Access token length:", accessToken.length);
    console.log("Token first 30 chars:", accessToken.substring(0, 30) + "...");
    console.log("Token parts (should be 3):", accessToken.split(".").length);

    try {
      const response = await fetch(`${this.baseUrl}/settings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keywords, sources }),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error(
          "Failed to save settings (status:",
          response.status,
          "):",
          errorData,
        );
        return false;
      }

      const result = await response.json();
      console.log("Settings saved successfully:", result);
      return true;
    } catch (error) {
      console.error("Exception during settings save:", error);
      return false;
    }
  }

  async generateKeywords(
    accessToken: string,
    description: string,
  ): Promise<string[] | null> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/generate-keywords`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ description }),
        },
      );

      if (!response.ok) {
        console.error("Failed to generate keywords:", response.status);
        return null;
      }

      const data = await response.json();
      return data.keywords || null;
    } catch (error) {
      console.error("Error calling generate keywords API:", error);
      return null;
    }
  }

  /**
   * Smart keyword generation - searches Tavily first for real articles,
   * then uses those articles to generate more relevant, grounded keywords.
   */
  async generateKeywordsSmart(
    accessToken: string,
    description: string,
    useSearch = true,
  ): Promise<{ keywords: string[] | null; usedSearch?: boolean }> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/generate-keywords-smart`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ description, useSearch }),
        },
      );

      if (!response.ok) {
        console.error("Failed to generate smart keywords:", response.status);
        return { keywords: null };
      }

      const data = await response.json();
      return {
        keywords: data.keywords || null,
        usedSearch: data.usedSearch,
      };
    } catch (error) {
      console.error("Error calling generate smart keywords API:", error);
      return { keywords: null };
    }
  }

  async extractKeywordsFromArticles(
    accessToken: string,
    articles: any[],
  ): Promise<string[] | null> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/settings/extract-keywords-from-articles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ articles }),
        },
      );

      if (!response.ok) {
        console.error(
          "Failed to extract keywords from articles:",
          response.status,
        );
        return null;
      }

      const data = await response.json();
      return data.keywords || null;
    } catch (error) {
      console.error("Error calling extract keywords API:", error);
      return null;
    }
  }

  async filterIrrelevantArticles(
    accessToken: string,
    articles: any[],
    userQuery: string,
  ): Promise<any[] | null> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/settings/filter-relevant-articles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ articles, userQuery }),
        },
      );

      if (!response.ok) {
        console.error("Failed to filter articles:", response.status);
        return null;
      }

      const data = await response.json();
      return data.filteredArticles || null;
    } catch (error) {
      console.error("Error calling filter articles API:", error);
      return null;
    }
  }

  async generateSearchReport(
    accessToken: string,
    userQuery: string,
    articles: any[],
    onChunk?: (chunk: string) => void,
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/settings/generate-search-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ userQuery, articles }),
        },
      );

      if (!response.ok) {
        console.error("Failed to generate search report:", response.status);
        return null;
      }

      // Check if response is streaming (SSE)
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("text/event-stream")) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullReport = "";

        if (!reader) {
          console.error("No reader available for streaming response");
          return null;
        }

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring(6);

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullReport += parsed.content;
                  // Call the callback with the new chunk
                  if (onChunk) {
                    onChunk(parsed.content);
                  }
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        return fullReport || null;
      } else {
        // Handle non-streaming response (fallback)
        const data = await response.json();
        return data.report || null;
      }
    } catch (error) {
      console.error("Error calling generate search report API:", error);
      return null;
    }
  }

  async cleanTrends(
    accessToken: string,
    trends: string[],
  ): Promise<string[] | null> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/settings/clean-trends`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ trends }),
        },
      );

      if (!response.ok) {
        console.error("Failed to clean trends:", response.status);
        return null;
      }

      const data = await response.json();
      return data.cleanedTrends || null;
    } catch (error) {
      console.error("Error calling clean trends API:", error);
      return null;
    }
  }
}

export const settingsService = new SettingsService();
