import { Hono } from "npm:hono";

const app = new Hono();

interface ExplainNegativeRequest {
  title: string;
  content: string;
  source: string;
}

interface GenerateKeywordsRequest {
  description: string;
}

interface GenerateSmartKeywordsRequest {
  description: string;
  useSearch?: boolean; // If true, search Tavily first for context
}

interface AnalyzeSentimentRequest {
  title: string;
  content: string;
}

// LLM returns plain text explanation

app.post("/llm/explain-negative-sentiment", async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return c.json(
        {
          success: false,
          error: "OpenAI API key not configured",
        },
        500,
      );
    }

    const body: ExplainNegativeRequest = await c.req.json();
    const { title, content, source } = body;

    if (!title || !content || !source) {
      return c.json(
        {
          success: false,
          error: "Title, content, and source are required",
        },
        400,
      );
    }

    console.log(
      `Analyzing negative sentiment for article: "${title.substring(0, 50)}..."`,
    );

    const prompt = `Analyze the following news article and explain why it has been classified as having negative sentiment. Focus on the specific negative aspects, issues, problems, or concerns mentioned.

**Article Title:** ${title}
**Content:** ${content}
**Source:** ${source}

Please provide a clear, concise explanation (2-4 sentences) of why this article is considered negative. Focus on concrete negative elements like:
- Problems, issues, or failures mentioned
- Risks, threats, or dangers  
- Criticisms or complaints
- Scandals, controversies, or wrongdoing
- Damages, losses, or harmful impacts
- Emergency situations or crises

Respond in plain text only - no JSON, no code blocks, no special formatting. Just a clear, natural language explanation.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert media analyst specializing in negative sentiment analysis. You provide clear, plain text explanations without any JSON formatting, code blocks, or special markup. Always respond in natural language.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return c.json(
        {
          success: false,
          error: `OpenAI API error: ${response.status} - ${errorText}`,
        },
        500,
      );
    }

    const data = await response.json();
    const content_text = data.choices[0]?.message?.content;

    if (!content_text) {
      return c.json(
        {
          success: false,
          error: "No response from OpenAI API",
        },
        500,
      );
    }

    console.log(
      `Successfully analyzed sentiment for "${title.substring(0, 30)}..."`,
    );

    return c.json({
      success: true,
      explanation: content_text.trim(),
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in explain-negative-sentiment endpoint:", error);
    return c.json(
      {
        success: false,
        error: "Failed to analyze sentiment",
        details: errorMessage,
      },
      500,
    );
  }
});

app.post("/generate-keywords", async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return c.json(
        {
          success: false,
          error: "OpenAI API key not configured",
        },
        500,
      );
    }

    const body: GenerateKeywordsRequest = await c.req.json();
    const { description } = body;

    if (!description || description.trim().length === 0) {
      return c.json(
        {
          success: false,
          error: "Description is required",
        },
        400,
      );
    }

    console.log(
      `Generating keywords for description: "${description.substring(0, 50)}..."`,
    );

    const prompt = `Based on the following user description of what they want to monitor in media, generate a list of specific, relevant keywords that would be effective for searching and monitoring news articles, especially focused on negative media coverage in Assam, India.

User Description: "${description}"

Generate 5-15 specific, targeted keywords that would be most effective for monitoring negative media mentions. The keywords should be:
- Specific and concrete (not too broad)
- Relevant to the user's monitoring needs
- Suitable for news search queries
- Focused on issues, problems, or concerns when applicable
- Appropriate for the Assam/India context if geographically relevant

Return ONLY a JSON array of keyword strings, nothing else. Example format:
["keyword1", "keyword2", "keyword3"]

Do not include any explanations, markdown, or additional text. Just the JSON array.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at generating targeted keywords for media monitoring. You always respond with a valid JSON array of strings, nothing else.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return c.json(
        {
          success: false,
          error: `OpenAI API error: ${response.status} - ${errorText}`,
        },
        500,
      );
    }

    const data = await response.json();
    let content_text = data.choices[0]?.message?.content;

    if (!content_text) {
      return c.json(
        {
          success: false,
          error: "No response from OpenAI API",
        },
        500,
      );
    }

    // Clean up the response - remove markdown code blocks if present
    content_text = content_text.trim();
    if (content_text.startsWith("```json")) {
      content_text = content_text
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (content_text.startsWith("```")) {
      content_text = content_text
        .replace(/^```?\s*/, "")
        .replace(/\s*```?$/, "");
    }

    // Parse the JSON array
    let keywords: string[];
    try {
      keywords = JSON.parse(content_text);
      if (!Array.isArray(keywords)) {
        throw new Error("Response is not an array");
      }
      // Validate that all items are strings
      keywords = keywords.filter(
        (k) => typeof k === "string" && k.trim().length > 0,
      );
      if (keywords.length === 0) {
        throw new Error("No valid keywords generated");
      }
    } catch (parseError) {
      console.error("Failed to parse keywords JSON:", content_text);
      return c.json(
        {
          success: false,
          error: "Failed to parse generated keywords",
          details:
            parseError instanceof Error ? parseError.message : "Unknown error",
        },
        500,
      );
    }

    console.log(`Successfully generated ${keywords.length} keywords`);

    return c.json({
      success: true,
      keywords: keywords,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-keywords endpoint:", error);
    return c.json(
      {
        success: false,
        error: "Failed to generate keywords",
        details: errorMessage,
      },
      500,
    );
  }
});

// Enhanced keyword generation - searches Tavily first, then generates keywords from real articles
app.post("/generate-keywords-smart", async (c) => {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const tavilyKey = Deno.env.get("TAVILY_API_KEY");

    if (!openaiKey) {
      return c.json(
        { success: false, error: "OpenAI API key not configured" },
        500,
      );
    }
    if (!tavilyKey) {
      return c.json(
        { success: false, error: "Tavily API key not configured" },
        500,
      );
    }

    const body: GenerateSmartKeywordsRequest = await c.req.json();
    const { description, useSearch = true } = body;

    if (!description || description.trim().length === 0) {
      return c.json({ success: false, error: "Description is required" }, 400);
    }

    console.log(
      `Smart keyword generation for: "${description.substring(0, 50)}..."`,
    );

    let articleContext = "";

    if (useSearch) {
      // Step 1: Search Tavily with the user's description to get real articles
      console.log("Step 1: Searching Tavily for real articles...");

      const tavilyResponse = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: `${description} Assam India news`,
          max_results: 15,
          search_depth: "advanced",
          days: 30, // Look at past month for broader context
        }),
      });

      if (tavilyResponse.ok) {
        const tavilyData = await tavilyResponse.json();
        const articles = tavilyData.results || [];

        console.log(`Found ${articles.length} articles from Tavily`);

        if (articles.length > 0) {
          // Extract titles and snippets for context
          const articleSummaries = articles
            .slice(0, 10)
            .map(
              (a: { title?: string; content?: string }, i: number) =>
                `${i + 1}. Title: "${a.title || "N/A"}"\n   Snippet: ${(a.content || "").substring(0, 200)}...`,
            )
            .join("\n\n");

          articleContext = `\n\nREAL ARTICLES FOUND (use these to inform your keywords):\n${articleSummaries}`;
        }
      } else {
        console.log("Tavily search failed, proceeding without article context");
      }
    }

    // Step 2: Generate keywords using GPT with real article context
    console.log("Step 2: Generating keywords with LLM...");

    const prompt = `Based on the following user description of what they want to monitor in media, generate a list of specific, relevant keywords that would be effective for searching and monitoring news articles.

User Description: "${description}"
${articleContext}

Generate 15-25 specific, targeted keywords. The keywords should be:
- Specific and concrete (avoid overly broad terms)
- Based on ACTUAL topics, names, places, and issues from the real articles found (if any)
- Include specific entity names (organizations, people, places) mentioned in articles
- Include specific issue terms and jargon used in actual news coverage
- Mix of:
  • Specific proper nouns (exact names of projects, schemes, people, places)
  • Issue-specific terms (problems, initiatives, policies mentioned)
  • Context terms (Assam-specific, sector-specific)

Return ONLY a JSON array of keyword strings, nothing else. Example format:
["Assam flood relief", "Orunodoi scheme beneficiaries", "Brahmaputra river pollution", "AGP government policy"]

Do not include any explanations, markdown, or additional text. Just the JSON array.`;

    const gptResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an expert at extracting and generating targeted keywords from real news articles for media monitoring. When provided with real article examples, prioritize extracting specific names, places, and terms that appear in actual news coverage. Always respond with a valid JSON array of strings.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 800,
          temperature: 0.5,
        }),
      },
    );

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error("OpenAI API error:", errorText);
      return c.json(
        { success: false, error: `OpenAI API error: ${gptResponse.status}` },
        500,
      );
    }

    const gptData = await gptResponse.json();
    let content_text = gptData.choices[0]?.message?.content;

    if (!content_text) {
      return c.json(
        { success: false, error: "No response from OpenAI API" },
        500,
      );
    }

    // Clean up response
    content_text = content_text.trim();
    if (content_text.startsWith("```json")) {
      content_text = content_text
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (content_text.startsWith("```")) {
      content_text = content_text
        .replace(/^```?\s*/, "")
        .replace(/\s*```?$/, "");
    }

    // Parse keywords
    let keywords: string[];
    try {
      keywords = JSON.parse(content_text);
      if (!Array.isArray(keywords)) throw new Error("Response is not an array");
      keywords = keywords.filter(
        (k) => typeof k === "string" && k.trim().length > 0,
      );
      if (keywords.length === 0) throw new Error("No valid keywords generated");
    } catch (parseError) {
      console.error("Failed to parse keywords JSON:", content_text);
      return c.json(
        {
          success: false,
          error: "Failed to parse generated keywords",
          details:
            parseError instanceof Error ? parseError.message : "Unknown error",
        },
        500,
      );
    }

    console.log(`Successfully generated ${keywords.length} smart keywords`);

    return c.json({
      success: true,
      keywords: keywords,
      usedSearch: useSearch && articleContext.length > 0,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-keywords-smart endpoint:", error);
    return c.json(
      {
        success: false,
        error: "Failed to generate smart keywords",
        details: errorMessage,
      },
      500,
    );
  }
});

// Generate personalized report based on user instructions
interface ReportDataForLLM {
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

interface GeneratePersonalizedReportRequest {
  reportData: ReportDataForLLM;
  userInstructions: string;
}

app.post("/llm/generate-personalized-report", async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return c.json(
        { success: false, error: "OpenAI API key not configured" },
        500,
      );
    }

    const body: GeneratePersonalizedReportRequest = await c.req.json();
    const { reportData, userInstructions } = body;

    if (!reportData) {
      return c.json({ success: false, error: "Report data is required" }, 400);
    }

    console.log(
      `Generating personalized report. Instructions: "${(userInstructions || "none").substring(0, 50)}..."`,
    );

    // Build context string from report data
    const dataContext = `
MEDIA MONITORING DATA SUMMARY:
- Time Period: Last ${reportData.timeRange} days
- Total Articles Analyzed: ${reportData.totalMentions}
- Sentiment Breakdown:
  • Positive: ${reportData.positiveCount} (${Math.round((reportData.positiveCount / reportData.totalMentions) * 100)}%)
  • Negative: ${reportData.negativeCount} (${Math.round((reportData.negativeCount / reportData.totalMentions) * 100)}%)
  • Neutral: ${reportData.neutralCount} (${Math.round((reportData.neutralCount / reportData.totalMentions) * 100)}%)
- Overall Sentiment Score: ${reportData.sentimentScore > 0 ? "+" : ""}${reportData.sentimentScore.toFixed(0)} (scale: -100 to +100)

TOP SOURCES:
${reportData.topSources.map((s, i) => `${i + 1}. ${s.name}: ${s.count} articles`).join("\n")}

TRENDING TOPICS:
${reportData.topTrends.map((t, i) => `${i + 1}. ${t.keyword}: ${t.count} mentions`).join("\n")}

CRITICAL ALERTS (Last 48h negative mentions):
${
  reportData.criticalAlerts.length > 0
    ? reportData.criticalAlerts
        .map((a, i) => `${i + 1}. "${a.title}" (${a.source}, ${a.date})`)
        .join("\n")
    : "No critical alerts"
}

SAMPLE POSITIVE COVERAGE:
${
  reportData.samplePositive.length > 0
    ? reportData.samplePositive
        .map((a, i) => `${i + 1}. "${a.title}" (${a.source})`)
        .join("\n")
    : "No positive coverage samples"
}

SAMPLE NEGATIVE COVERAGE:
${
  reportData.sampleNegative.length > 0
    ? reportData.sampleNegative
        .map((a, i) => `${i + 1}. "${a.title}" (${a.source})`)
        .join("\n")
    : "No negative coverage samples"
}
`;

    const userContext =
      userInstructions && userInstructions.trim().length > 0
        ? `\n\nUSER'S SPECIFIC REQUIREMENTS:\n${userInstructions}`
        : "";

    const prompt = `You are an expert media intelligence analyst. Based on the following media monitoring data, generate a comprehensive, insightful report.

${dataContext}
${userContext}

Generate a personalized intelligence report with the following sections. Focus especially on any specific areas the user has requested. Be analytical, insightful, and actionable.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "executiveSummary": "A compelling 3-4 sentence executive summary highlighting the key findings, overall sentiment trajectory, and the most important insight for decision-makers.",
  "keyInsights": [
    "First key insight - specific and data-driven",
    "Second key insight - analytical observation",
    "Third key insight - pattern or trend identified",
    "Fourth key insight (if applicable)"
  ],
  "recommendations": [
    "First actionable recommendation",
    "Second actionable recommendation", 
    "Third actionable recommendation"
  ],
  "riskAssessment": "A paragraph assessing potential reputation risks, crisis areas, or concerns that need attention based on the negative coverage patterns.",
  "opportunities": "A paragraph identifying positive momentum, success stories to amplify, or strategic opportunities revealed by the positive coverage."
}

Important guidelines:
- Be specific and reference actual data points (numbers, percentages, source names, topics)
- If the user requested specific focus areas, ensure those are prominently addressed
- Make recommendations actionable and specific to the data
- Keep language professional but accessible
- The executiveSummary should be compelling enough for C-level executives`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a senior media intelligence analyst who creates executive-level reports. You always respond with valid JSON only - no markdown formatting, no code blocks, no explanations. Your analysis is data-driven, insightful, and actionable.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return c.json(
        { success: false, error: `OpenAI API error: ${response.status}` },
        500,
      );
    }

    const data = await response.json();
    let content_text = data.choices[0]?.message?.content;

    if (!content_text) {
      return c.json(
        { success: false, error: "No response from OpenAI API" },
        500,
      );
    }

    // Clean up response - remove markdown code blocks if present
    content_text = content_text.trim();
    if (content_text.startsWith("```json")) {
      content_text = content_text
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (content_text.startsWith("```")) {
      content_text = content_text
        .replace(/^```?\s*/, "")
        .replace(/\s*```?$/, "");
    }

    // Parse the JSON response
    let report;
    try {
      report = JSON.parse(content_text);

      // Validate required fields
      if (
        !report.executiveSummary ||
        !report.keyInsights ||
        !report.recommendations
      ) {
        throw new Error("Missing required fields in response");
      }

      // Ensure arrays
      if (!Array.isArray(report.keyInsights))
        report.keyInsights = [report.keyInsights];
      if (!Array.isArray(report.recommendations))
        report.recommendations = [report.recommendations];
    } catch (parseError) {
      console.error("Failed to parse report JSON:", content_text);
      return c.json(
        {
          success: false,
          error: "Failed to parse generated report",
          details:
            parseError instanceof Error ? parseError.message : "Unknown error",
        },
        500,
      );
    }

    console.log("Successfully generated personalized report");

    return c.json({
      success: true,
      report: {
        executiveSummary: report.executiveSummary,
        keyInsights: report.keyInsights,
        recommendations: report.recommendations,
        riskAssessment: report.riskAssessment || "",
        opportunities: report.opportunities || "",
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-personalized-report endpoint:", error);
    return c.json(
      {
        success: false,
        error: "Failed to generate personalized report",
        details: errorMessage,
      },
      500,
    );
  }
});

app.post("/llm/analyze-sentiment", async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return c.json(
        {
          success: false,
          error: "OpenAI API key not configured",
        },
        500,
      );
    }

    const body: AnalyzeSentimentRequest = await c.req.json();
    const { title, content } = body;

    if (!title || !content) {
      return c.json(
        {
          success: false,
          error: "Title and content are required",
        },
        400,
      );
    }

    // Limit content to 1000 chars for efficiency
    const text = `${title}\n\n${content.substring(0, 1000)}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              'You are a sentiment analysis expert for news articles about Assam, India. Analyze the sentiment and return ONLY a JSON object with this exact format:\\n{\\"sentiment\\": \\"positive\\" | \\"negative\\" | \\"neutral\\", \\"score\\": number}\\n\\nThe score should be:\\n- For negative: -1.0 to -0.1 (more negative = closer to -1.0)\\n- For neutral: 0\\n- For positive: 0.1 to 1.0 (more positive = closer to 1.0)\\n\\nFocus on the overall tone and impact of the news.',
          },
          {
            role: "user",
            content: `Analyze the sentiment of this news article:\n\n${text}`,
          },
        ],
        max_tokens: 50,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return c.json(
        {
          success: false,
          error: `OpenAI API error: ${response.status}`,
        },
        500,
      );
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content?.trim();

    if (!responseText) {
      return c.json(
        {
          success: false,
          error: "No response from OpenAI API",
        },
        500,
      );
    }

    // Parse the JSON response
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse sentiment JSON:", responseText);
      return c.json(
        {
          success: false,
          error: "Failed to parse sentiment response",
        },
        500,
      );
    }

    return c.json({
      success: true,
      sentiment: result.sentiment,
      score: result.score,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in analyze-sentiment endpoint:", error);
    return c.json(
      {
        success: false,
        error: "Failed to analyze sentiment",
        details: errorMessage,
      },
      500,
    );
  }
});

export default app;
