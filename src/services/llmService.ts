// OpenAI LLM Service for analyzing negative sentiment explanations
import { projectId, publicAnonKey } from "../utils/supabase/info";

export interface ReportDataForLLM {
  totalMentions: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  sentimentScore: number;
  topSources: { name: string; count: number }[];
  topTrends: { keyword: string; count: number }[];
  criticalAlerts: { title: string; source: string; date: string }[];
  timeRange: number;
  samplePositive: { title: string; source: string }[];
  sampleNegative: { title: string; source: string }[];
}

export interface PersonalizedReportResponse {
  executiveSummary: string;
  keyInsights: string[];
  recommendations: string[];
  riskAssessment: string;
  opportunities: string;
}

export class LLMService {
  private backendUrl: string;

  constructor() {
    this.backendUrl = `https://${projectId}.supabase.co/functions/v1/make-server-211993fd`;
  }

  async explainNegativeSentiment(
    title: string,
    content: string,
    source: string,
  ): Promise<string> {
    try {
      const response = await fetch(
        `${this.backendUrl}/llm/explain-negative-sentiment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            title,
            content,
            source,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to get explanation from LLM");
      }

      return data.explanation;
    } catch (error) {
      console.error("Failed to get LLM explanation:", error);
      throw error;
    }
  }

  async generatePersonalizedReport(
    reportData: ReportDataForLLM,
    userInstructions: string,
  ): Promise<PersonalizedReportResponse> {
    try {
      const response = await fetch(
        `${this.backendUrl}/llm/generate-personalized-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            reportData,
            userInstructions,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate personalized report");
      }

      return data.report;
    } catch (error) {
      console.error("Failed to generate personalized report:", error);
      throw error;
    }
  }
}

export const llmService = new LLMService();
