import { Hono } from "npm:hono";

const app = new Hono();

interface TavilySearchRequest {
  query: string;
  maxResults?: number;
  timeRange?: "day" | "week" | "month";
  country?: string;
  includeDomains?: string[];
}

// Tavily search endpoint - uses REST API instead of Node.js SDK
app.post("/tavily/search", async (c) => {
  try {
    const apiKey = Deno.env.get("TAVILY_API_KEY");
    if (!apiKey) {
      return c.json(
        {
          success: false,
          error: "Tavily API key not configured",
        },
        500,
      );
    }

    const body: TavilySearchRequest = await c.req.json();
    const {
      query,
      maxResults = 10,
      timeRange = "week",
      country = "india",
      includeDomains,
    } = body;

    if (!query || query.trim().length === 0) {
      return c.json(
        {
          success: false,
          error: "Query is required",
        },
        400,
      );
    }

    console.log(
      `Tavily search: "${query.substring(0, 50)}..." (max: ${maxResults}, time_range: ${timeRange})`,
    );

    // Call Tavily REST API with time_range parameter (day, week, month)
    const tavilyPayload: Record<string, unknown> = {
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: "advanced",
      include_images: true,
      time_range: timeRange, // "day", "week", or "month"
      country: country,
    };

    // Only add include_domains if provided and non-empty
    if (includeDomains && includeDomains.length > 0) {
      tavilyPayload.include_domains = includeDomains;
    }

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tavilyPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Tavily API error:", errorText);

      if (response.status === 429) {
        return c.json(
          {
            success: false,
            error:
              "Rate limit exceeded. Please wait before making more requests.",
          },
          429,
        );
      }

      return c.json(
        {
          success: false,
          error: `Tavily API error: ${response.status} - ${errorText}`,
        },
        500,
      );
    }

    const data = await response.json();

    console.log(
      `Tavily returned ${data.results?.length || 0} results, ${data.images?.length || 0} images`,
    );

    return c.json({
      success: true,
      query: data.query,
      answer: data.answer,
      results: data.results || [],
      images: data.images || [],
      response_time: data.response_time,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in tavily/search endpoint:", error);
    return c.json(
      {
        success: false,
        error: "Failed to search Tavily",
        details: errorMessage,
      },
      500,
    );
  }
});

export default app;
