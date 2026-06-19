import { Hono } from "npm:hono";
import OpenAI from "npm:openai";

const app = new Hono();

// Store conversation history per session (in-memory for now)
const conversationSessions = new Map<string, any[]>();

const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_assam_news",
      description:
        "Search for news articles about a specific topic in Assam, India. Use this when the user asks for NEW information, recent news, or wants to search for a different topic than what was previously discussed.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The search query for finding news articles in Assam. Be specific and include relevant keywords.",
          },
          time_range: {
            type: "string",
            enum: ["hour", "day", "week", "month"],
            description:
              "The time range to search for articles. Use 'hour' for last hour, 'day' for last 24 hours (default), 'week' for last 7 days, 'month' for last 30 days. Extract this from user's query if they mention time like 'today', 'this week', 'last month', 'past hour', etc.",
          },
        },
        required: ["query"],
      },
    },
  },
];

const systemPrompt = `You are an AI assistant for a media monitoring system focused on Assam, India. Your role is to:

1. Help users find and analyze news articles about Assam
2. Answer questions about search results already shown
3. Provide insights, recommendations, and analysis based on existing articles
4. Decide when new searches are needed vs. using existing information

When a user asks a follow-up question about existing results (like "what should I act on?", "summarize this", "what are the key points?"), you should answer based on the context without calling search_assam_news.

Only call search_assam_news when:
- The user explicitly asks for NEW information
- The user asks about a DIFFERENT topic than what's currently shown
- There are NO existing articles in context
- The user requests a refresh or update

**IMPORTANT: When calling search_assam_news, always extract the time_range from the user's query:**
- "today", "today's", "latest", "recent", "current" → time_range: "day"
- "last hour", "past hour", "in the hour" → time_range: "hour"
- "this week", "last week", "past week", "weekly" → time_range: "week"
- "this month", "last month", "past month", "monthly" → time_range: "month"
- If no time mentioned, default to "day" (last 24 hours)

Be conversational, helpful, and provide actionable insights. When analyzing articles, focus on:
- Key themes and patterns
- Urgent or critical issues
- Sentiment trends
- Recommendations for action`;

app.post("/chat", async (c) => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    const { sessionId, userMessage, articles, searchQuery } =
      await c.req.json();

    if (!sessionId || !userMessage) {
      return c.json({ error: "Missing sessionId or userMessage" }, 400);
    }

    const openai = new OpenAI({ apiKey });

    // Get or create conversation history for this session
    let conversationHistory = conversationSessions.get(sessionId);
    if (!conversationHistory) {
      conversationHistory = [{ role: "system", content: systemPrompt }];
      conversationSessions.set(sessionId, conversationHistory);
    }

    // Build articles context
    let articlesContext = "No articles currently loaded.";
    if (articles && articles.length > 0) {
      const articlesText = articles
        .slice(0, 10)
        .map(
          (article: any, idx: number) =>
            `${idx + 1}. Title: ${article.title}
   Source: ${article.source}
   Date: ${article.publishedDate}
   Sentiment: ${article.sentiment} (${article.score?.toFixed(2)})
   Summary: ${article.snippet}
   URL: ${article.url}`,
        )
        .join("\n\n");

      articlesContext = `Current search query: "${searchQuery}"
Total articles found: ${articles.length}

Here are the articles:

${articlesText}`;
    }

    // Build messages array with context
    const messages = [
      conversationHistory[0], // System prompt
      { role: "system", content: articlesContext }, // Current articles context
      ...conversationHistory.slice(1), // Previous conversation
      { role: "user", content: userMessage },
    ];

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: messages,
      tools: tools,
      tool_choice: "auto",
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0].message;

    // Check if the model wants to use tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      // Add user message and assistant's response to history
      conversationHistory.push({ role: "user", content: userMessage });
      conversationHistory.push({
        role: "assistant",
        content: assistantMessage.content || "",
      });

      if (functionName === "search_assam_news") {
        // Extract time range from function args, default to 'day' (24 hours)
        const timeRange = functionArgs.time_range || "day";
        const timeRangeLabels: Record<string, string> = {
          hour: "last hour",
          day: "last 24 hours",
          week: "last week",
          month: "last month",
        };

        return c.json({
          message: `I'll search for news about "${functionArgs.query}" in Assam from the ${timeRangeLabels[timeRange] || "last 24 hours"}...`,
          requiresSearch: true,
          searchQuery: functionArgs.query,
          timeRange: timeRange,
        });
      }
    }

    // Regular response without tools
    const responseText =
      assistantMessage.content || "I understand. How can I help you further?";

    // Add to conversation history
    conversationHistory.push({ role: "user", content: userMessage });
    conversationHistory.push({ role: "assistant", content: responseText });

    return c.json({
      message: responseText,
      requiresSearch: false,
    });
  } catch (error: any) {
    console.error("Conversation error:", error);
    return c.json(
      { error: "Failed to process your message", details: error.message },
      500,
    );
  }
});

app.post("/clear", async (c) => {
  try {
    const { sessionId } = await c.req.json();

    if (!sessionId) {
      return c.json({ error: "Missing sessionId" }, 400);
    }

    // Clear the conversation history for this session
    conversationSessions.delete(sessionId);

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Clear conversation error:", error);
    return c.json(
      { error: "Failed to clear conversation", details: error.message },
      500,
    );
  }
});

export default app;
