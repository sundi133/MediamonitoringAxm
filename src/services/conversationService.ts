import { MediaMentionData } from "../types";
import { projectId, publicAnonKey } from "../utils/supabase/info";

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolCall {
  name: string;
  arguments: any;
}

export interface ConversationResponse {
  message: string;
  toolCalls?: ToolCall[];
  requiresSearch?: boolean;
  searchQuery?: string;
  timeRange?: "hour" | "day" | "week" | "month";
}

export class ConversationService {
  private sessionId: string;
  private currentArticles: MediaMentionData[] = [];
  private currentQuery: string = "";

  constructor() {
    // Generate a unique session ID
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  setCurrentArticles(articles: MediaMentionData[], query: string) {
    this.currentArticles = articles;
    this.currentQuery = query;
  }

  getCurrentArticles(): MediaMentionData[] {
    return this.currentArticles;
  }

  async chat(userMessage: string): Promise<ConversationResponse> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            sessionId: this.sessionId,
            userMessage,
            articles: this.currentArticles,
            searchQuery: this.currentQuery,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process message");
      }

      const data = await response.json();

      return {
        message: data.message,
        requiresSearch: data.requiresSearch || false,
        searchQuery: data.searchQuery,
        timeRange: data.timeRange || "day", // Default to 'day' (24 hours)
      };
    } catch (error) {
      console.error("Conversation error:", error);
      throw new Error("Failed to process your message. Please try again.");
    }
  }

  async clearConversation() {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/clear`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            sessionId: this.sessionId,
          }),
        },
      );

      this.currentArticles = [];
      this.currentQuery = "";

      // Generate a new session ID for the new conversation
      this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    } catch (error) {
      console.error("Clear conversation error:", error);
      // Don't throw, just log - clearing is not critical
    }
  }
}

// Singleton instance
export const conversationService = new ConversationService();
