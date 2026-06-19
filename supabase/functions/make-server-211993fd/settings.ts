import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const settingsApp = new Hono();

const createAuthenticatedClient = (accessToken: string) => {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );
};

// Generate keyword report using AI
settingsApp.post("/settings/generate-keyword-report", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const accessToken = authHeader?.split(" ")[1];

    if (!accessToken) {
      return c.json({ error: "Authorization token required" }, 401);
    }

    // Verify user authentication
    const supabase = createAuthenticatedClient(accessToken);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return c.json(
        {
          error: "Unauthorized",
          details: error?.message || "No user found",
        },
        401,
      );
    }

    const body = await c.req.json();
    const { keyword, articles, customWordCount, reportFormat } = body;

    if (!keyword || !articles || !Array.isArray(articles)) {
      return c.json({ error: "Keyword and articles array are required" }, 400);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    // Use custom word count if provided, otherwise default to 1000 words
    const wordCount = customWordCount ? parseInt(customWordCount) : 1000;

    // Use custom format if provided, otherwise use default sections
    const format =
      reportFormat ||
      "Executive Summary, Key Findings, Sentiment Analysis, Risk Assessment, Geographic Focus, Recommendations";

    // Filter articles to only include negative sentiment
    const negativeArticles = articles.filter(
      (article: any) => article.sentiment === "negative",
    );

    console.log(
      `Generating report for user ${user.id} with ${negativeArticles.length} negative articles (filtered from ${articles.length} total), ${wordCount} words, format: ${format}`,
    );

    if (negativeArticles.length === 0) {
      return c.json(
        {
          error: "No negative sentiment articles found",
          details:
            "The comprehensive report requires negative sentiment articles for analysis",
        },
        400,
      );
    }

    // Prepare article summaries
    const articleSummaries = negativeArticles
      .slice(0, 100)
      .map(
        (article: any, index: number) =>
          `[Article ${index + 1}]\nKeyword: ${article.keyword}\nTitle: ${
            article.title
          }\nSource: ${article.source}\nPublished: ${
            article.published
          }\nSentiment: ${article.sentiment}\nFull Content: ${
            article.content
          }\n\n`,
      )
      .join("\n");

    const maxTokens = Math.min(Math.ceil(wordCount * 8), 16000);

    const sections = format
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const prompt = `You are an expert media analyst creating a comprehensive report for regional planning and governance monitoring in Assam, India. This report will be used by planners and decision-makers to understand critical concerns and issues in the region.

Analyze the following ${articles.length} media articles related to the keyword: "${keyword}".

${articleSummaries}

CRITICAL ANALYSIS REQUIREMENTS - EXTRACT ALL OF THE FOLLOWING FROM ARTICLES:

📍 GEOGRAPHIC DATA (MANDATORY):
- Extract ALL specific locations: districts, blocks, villages, towns, cities, areas
- Map issues to specific geographic regions
- Identify affected zones and their boundaries
- Note any regional patterns or concentrations

👥 STAKEHOLDER INFORMATION (MANDATORY):
- ALL officials mentioned (names, titles, departments)
- ALL government departments and agencies involved
- ALL organizations, NGOs, community groups
- ALL affected communities and demographics
- ANY statements or quotes from stakeholders

📊 NUMERICAL & STATISTICAL DATA (MANDATORY - DO NOT MISS):
- ALL financial figures (budgets, costs, losses, damages)
- ALL population/demographic numbers (affected people, casualties, displaced)
- ALL quantitative measurements (area affected, distance, capacity, etc.)
- ALL percentages and statistics
- ALL project scales and timelines

📅 TIMELINE & CHRONOLOGY (MANDATORY):
- Extract ALL specific dates mentioned
- Sequence of events and developments
- Historical context and background
- Deadlines and future dates
- Duration of issues

⚠️ ISSUES & CONCERNS (MANDATORY - COMPREHENSIVE):
- ALL specific problems and grievances raised
- Root causes and contributing factors
- Scale and severity of each issue
- Immediate and long-term impacts
- Infrastructure failures or gaps
- Service delivery problems
- Environmental concerns
- Health and safety risks
- Economic impacts on communities
- Social and cultural impacts

🔄 RESPONSES & ACTIONS (MANDATORY):
- ALL government responses and statements
- Actions taken or promised
- Resources allocated
- Interventions planned or implemented
- Any gaps in response

WORD COUNT: Generate a comprehensive analytical report with EXACTLY ${wordCount} words.

FORMATTING INSTRUCTIONS FOR NOTION-STYLE TIPTAP EDITOR:
- Create a beautifully structured, visually engaging document with clear hierarchy
- Start with ONE compelling H1 title using # (e.g., "# Media Monitoring Report: [Keyword]")
- Use H2 (##) for major sections and H3 (###) for subsections
- Use **bold** extensively for emphasis on key points, metrics, critical names, and important data
- Use bullet points (-) and numbered lists (1., 2., 3.) extensively for clarity and scannability
- Use > blockquotes for important callouts, warnings, key insights, or critical statistics
- Create visual breathing room with proper spacing - use blank lines between sections
- Format all numbers, percentages, and statistics with **bold** for prominence
- Use horizontal rules (---) to separate major sections where appropriate
- Organize dense information into clean, scannable bullet points rather than long paragraphs
- Include emojis or symbols (📍 📊 ⚠️ ✅ 🔴 💡 📈 🎯) to make sections visually distinctive
- Make the document feel like a professional, polished Notion page with clean structure
- Use *italic* for secondary emphasis or subtle highlights
- Consider using nested bullet points for hierarchical information
- Break up text with strategic formatting to maintain visual interest
- CRITICAL: Use ONLY pure markdown - NO HTML tags like <br/>, <p>, <div>, etc.
- Use blank lines (double line breaks) for spacing between elements

CRITICAL CITATION RULES:
- ONLY cite sources, articles, and data from the provided articles above
- DO NOT mention, reference, or cite any external sources, news outlets, or articles not in the provided data
- DO NOT make up or hallucinate any sources, dates, or statistics
- When citing examples, ONLY use the specific articles provided in the data above
- Every claim must be backed by the provided articles only
- If you reference a specific article, use the exact title, source, and date from the provided data
- Include ALL specific details found in the articles - do not omit any critical data

The report should include the following sections:
${sections.map((section: string) => `## ${section}`).join("\n")}

For each section, provide exhaustive analysis including:
- ALL specific locations, officials, departments, and stakeholders mentioned in articles
- ALL numerical data, statistics, financial figures, and measurements
- ALL dates, timelines, and chronological information
- Detailed breakdown of issues by geography, sector, and stakeholder
- Comprehensive impact assessment (economic, social, environmental, health)
- Complete analysis of government/institutional responses
- Actionable recommendations based on gaps and needs identified
- Risk prioritization and urgency assessment

PLANNING-FOCUSED ANALYSIS (CRITICAL FOR DECISION-MAKERS):
- Infrastructure status and gaps
- Service delivery issues and bottlenecks
- Resource allocation needs
- Community grievances and demands
- Inter-departmental coordination issues
- Implementation challenges
- Policy gaps and recommendations

REMEMBER: 
1. DO NOT OMIT ANY CRITICAL DATA - Include every location, number, name, date, and issue mentioned in the articles
2. The final report MUST be approximately ${wordCount} words with comprehensive detail
3. ONLY use citations and sources from the provided ${articles.length} articles
4. This report is for planners - they need ALL factual details to make informed decisions
5. FORMAT beautifully for a Notion-like reading experience with clear visual hierarchy, proper use of bold/italic, strategic use of blockquotes, and clean organization

Keep the report professional, exhaustively detailed, data-driven, immediately actionable for planning and governance purposes, and beautifully formatted with excellent visual structure like a polished Notion document.`;

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
            content: `You are an expert media analyst specializing in reputation management and negative media monitoring. You provide comprehensive, actionable reports in beautifully formatted markdown optimized for Notion-style rich text editors. You excel at creating visually engaging documents with clear hierarchy, strategic use of bold/italic, effective blockquotes for callouts, and clean organization. Today's date is ${currentDate}.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.5,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return c.json({ error: `OpenAI API error: ${response.status}` }, 500);
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            controller.close();
            return;
          }

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, {
              stream: true,
            });
            const lines = chunk
              .split("\n")
              .filter((line) => line.trim() !== "");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);

                if (data === "[DONE]") {
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices[0]?.delta?.content;

                  if (content) {
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({ content })}\n\n`,
                      ),
                    );
                  }
                } catch (e) {
                  // Skip malformed JSON
                }
              }
            }
          }
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    console.log(`Successfully started streaming report for user ${user.id}`);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-keyword-report endpoint:", error);
    return c.json(
      {
        error: "Failed to generate report",
        details: errorMessage,
      },
      500,
    );
  }
});

// Generate comprehensive report across all keywords
settingsApp.post("/settings/generate-all-keywords-report", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const accessToken = authHeader?.split(" ")[1];

    if (!accessToken) {
      return c.json({ error: "Authorization token required" }, 401);
    }

    // Verify user authentication
    const supabase = createAuthenticatedClient(accessToken);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return c.json(
        {
          error: "Unauthorized",
          details: error?.message || "No user found",
        },
        401,
      );
    }

    const body = await c.req.json();
    const { keywords, articles, reportSize, customWordCount, reportFormat } =
      body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return c.json({ error: "Keywords array is required" }, 400);
    }

    if (!articles || !Array.isArray(articles)) {
      return c.json({ error: "Articles array is required" }, 400);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    // Use custom word count if provided, otherwise use reportSize defaults
    const wordCount = customWordCount
      ? parseInt(customWordCount)
      : reportSize === "brief"
        ? 500
        : reportSize === "standard"
          ? 1000
          : 1500;

    // Use custom format if provided, otherwise use default sections
    const format =
      reportFormat ||
      "Executive Summary, Key Findings, Sentiment Analysis, Risk Assessment, Geographic Focus, Recommendations";

    // Filter articles to only include negative sentiment
    const negativeArticles = articles.filter(
      (article: any) => article.sentiment === "negative",
    );

    console.log(
      `Generating report for user ${user.id} with ${negativeArticles.length} negative articles (filtered from ${articles.length} total), ${wordCount} words, format: ${format}`,
    );

    if (negativeArticles.length === 0) {
      return c.json(
        {
          error: "No negative sentiment articles found",
          details:
            "The comprehensive report requires negative sentiment articles for analysis",
        },
        400,
      );
    }

    // Prepare article summaries
    const articleSummaries = negativeArticles
      .slice(0, 200)
      .map(
        (article: any, index: number) =>
          `[Article ${index + 1}]\nKeyword: ${article.keyword}\nTitle: ${
            article.title
          }\nSource: ${article.source}\nPublished: ${
            article.published
          }\nSentiment: ${article.sentiment}\nFull Content: ${
            article.content
          }\n\n`,
      )
      .join("\n");

    const maxTokens = Math.min(Math.ceil(wordCount * 8), 16000);

    const sections = format
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const prompt = `You are an expert media analyst creating a comprehensive cross-keyword report for regional planning and governance monitoring in Assam, India. This report will be used by planners and decision-makers to understand critical concerns and issues across the entire region.

**IMPORTANT: This analysis focuses EXCLUSIVELY on NEGATIVE SENTIMENT articles to identify risks, problems, and areas requiring intervention.**

Analyze the following ${negativeArticles.length} NEGATIVE SENTIMENT media articles (filtered from ${articles.length} total articles) across ${keywords.length} keywords: ${keywords.join(", ")}.

${articleSummaries}

CRITICAL ANALYSIS REQUIREMENTS - EXTRACT ALL OF THE FOLLOWING FROM ARTICLES:

📍 GEOGRAPHIC DATA (MANDATORY):
- Extract ALL specific locations: districts, blocks, villages, towns, cities, areas
- Map issues to specific geographic regions across all keywords
- Identify affected zones and their boundaries
- Note any regional patterns, concentrations, or clusters
- Cross-reference locations across different keywords

👥 STAKEHOLDER INFORMATION (MANDATORY):
- ALL officials mentioned (names, titles, departments)
- ALL government departments and agencies involved
- ALL organizations, NGOs, community groups
- ALL affected communities and demographics
- ANY statements or quotes from stakeholders
- Identify common stakeholders across multiple issues

📊 NUMERICAL & STATISTICAL DATA (MANDATORY - DO NOT MISS):
- ALL financial figures (budgets, costs, losses, damages)
- ALL population/demographic numbers (affected people, casualties, displaced)
- ALL quantitative measurements (area affected, distance, capacity, etc.)
- ALL percentages and statistics
- ALL project scales and timelines
- Aggregate statistics across keywords where relevant

📅 TIMELINE & CHRONOLOGY (MANDATORY):
- Extract ALL specific dates mentioned
- Sequence of events and developments
- Historical context and background
- Deadlines and future dates
- Duration of issues
- Identify temporal patterns across different issues

⚠️ ISSUES & CONCERNS (MANDATORY - COMPREHENSIVE):
- ALL specific problems and grievances raised
- Root causes and contributing factors
- Scale and severity of each issue
- Immediate and long-term impacts
- Infrastructure failures or gaps
- Service delivery problems
- Environmental concerns
- Health and safety risks
- Economic impacts on communities
- Social and cultural impacts
- Inter-connected issues across keywords

🔄 RESPONSES & ACTIONS (MANDATORY):
- ALL government responses and statements
- Actions taken or promised
- Resources allocated
- Interventions planned or implemented
- Any gaps in response
- Coordination across departments/agencies

WORD COUNT: Generate a comprehensive analytical report with EXACTLY ${wordCount} words.

FORMATTING INSTRUCTIONS FOR NOTION-STYLE TIPTAP EDITOR:
- Create a beautifully structured, visually engaging document with clear hierarchy
- Start with ONE compelling H1 title using # (e.g., "# Comprehensive Media Monitoring Report: Assam")
- Use H2 (##) for major sections and H3 (###) for subsections
- Use **bold** extensively for emphasis on key points, metrics, critical names, locations, and important data
- Use bullet points (-) and numbered lists (1., 2., 3.) extensively for clarity and scannability
- Use > blockquotes for important callouts, warnings, key insights, critical statistics, or urgent recommendations
- Create visual breathing room with proper spacing - use blank lines between sections
- Format all numbers, percentages, statistics, and financial figures with **bold** for prominence
- Use horizontal rules (---) to separate major sections where appropriate
- Organize dense information into clean, scannable bullet points rather than long paragraphs
- Include emojis or symbols (📍 📊 ⚠️ ✅ 🔴 💡 📈 🎯 🚨 💰 👥) to make sections visually distinctive
- Make the document feel like a professional, polished Notion page with clean structure
- Use *italic* for secondary emphasis or subtle highlights
- Consider using nested bullet points for hierarchical information
- Break up text with strategic formatting to maintain visual interest and readability
- Use tables sparingly but effectively for comparative data if needed
- CRITICAL: Use ONLY pure markdown - NO HTML tags like <br/>, <p>, <div>, etc.
- Use blank lines (double line breaks) for spacing between elements

CRITICAL CITATION RULES:
- ONLY cite sources, articles, and data from the provided articles above
- DO NOT mention, reference, or cite any external sources, news outlets, or articles not in the provided data
- DO NOT make up or hallucinate any sources, dates, or statistics
- When citing examples, ONLY use the specific articles provided in the data above
- Every claim must be backed by the provided articles only
- If you reference a specific article, use the exact title, source, and date from the provided data
- Include ALL specific details found in the articles - do not omit any critical data

The report should include the following sections:
${sections.map((section: string) => `## ${section}`).join("\n")}

For each section, provide exhaustive cross-keyword analysis including:
- ALL specific locations, officials, departments, and stakeholders mentioned in articles
- ALL numerical data, statistics, financial figures, and measurements
- ALL dates, timelines, and chronological information
- Detailed breakdown of issues by geography, sector, and stakeholder
- Comprehensive impact assessment (economic, social, environmental, health)
- Complete analysis of government/institutional responses
- Identification of systemic patterns across different keywords
- Cross-cutting themes and interconnected issues
- Actionable recommendations based on gaps and needs identified
- Risk prioritization and urgency assessment

PLANNING-FOCUSED ANALYSIS (CRITICAL FOR DECISION-MAKERS):
- Infrastructure status and gaps across the region
- Service delivery issues and bottlenecks by sector
- Resource allocation needs and priorities
- Community grievances and demands by location
- Inter-departmental coordination issues
- Implementation challenges across different initiatives
- Policy gaps and systemic recommendations
- Regional development priorities based on issues identified

CROSS-KEYWORD SYNTHESIS:
- Identify common themes across different keywords
- Highlight geographic hotspots with multiple issues
- Recognize systemic vs isolated problems
- Note cascading or interconnected impacts
- Suggest integrated solutions for multiple issues

NEGATIVE MEDIA FOCUS:
- Since all articles analyzed have negative sentiment, focus on problems, challenges, and risks
- Identify patterns of criticism and public concern
- Highlight areas where government action is being questioned
- Prioritize issues based on severity and public impact
- Recommend urgent interventions based on negative coverage patterns

REMEMBER: 
1. DO NOT OMIT ANY CRITICAL DATA - Include every location, number, name, date, and issue mentioned in the articles
2. The final report MUST be approximately ${wordCount} words with comprehensive detail
3. ONLY use citations and sources from the provided ${negativeArticles.length} NEGATIVE SENTIMENT articles
4. This report is for planners - they need ALL factual details to make informed decisions
5. Synthesize information across keywords to identify systemic patterns
6. All analyzed articles have NEGATIVE sentiment - focus on risks, problems, and areas needing intervention
7. FORMAT beautifully for a Notion-like reading experience with clear visual hierarchy, extensive use of bold/italic, strategic blockquotes, and clean organization

Keep the report professional, exhaustively detailed, data-driven, immediately actionable for planning and governance purposes, and beautifully formatted with excellent visual structure like a polished, executive-level Notion document.`;

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
            content: `You are an expert media analyst specializing in reputation management and negative media monitoring. You provide comprehensive, actionable reports in beautifully formatted markdown optimized for Notion-style rich text editors. You excel at creating visually engaging documents with clear hierarchy, strategic use of bold/italic, effective blockquotes for callouts, and clean organization. Today's date is ${currentDate}.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.5,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return c.json({ error: `OpenAI API error: ${response.status}` }, 500);
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            controller.close();
            return;
          }

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, {
              stream: true,
            });
            const lines = chunk
              .split("\n")
              .filter((line) => line.trim() !== "");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);

                if (data === "[DONE]") {
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices[0]?.delta?.content;

                  if (content) {
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({ content })}\n\n`,
                      ),
                    );
                  }
                } catch (e) {
                  // Skip malformed JSON
                }
              }
            }
          }
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    console.log(
      `Successfully started streaming ${reportSize} comprehensive report for user ${user.id}`,
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-all-keywords-report endpoint:", error);
    return c.json(
      {
        error: "Failed to generate comprehensive report",
        details: errorMessage,
      },
      500,
    );
  }
});

// Filter irrelevant articles using AI
settingsApp.post("/settings/filter-relevant-articles", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const accessToken = authHeader?.split(" ")[1];

    if (!accessToken) {
      return c.json({ error: "Authorization token required" }, 401);
    }

    // Verify user authentication
    const supabase = createAuthenticatedClient(accessToken);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return c.json(
        {
          error: "Unauthorized",
          details: error?.message || "No user found",
        },
        401,
      );
    }

    const body = await c.req.json();
    const { articles, userQuery } = body;

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return c.json({ error: "Articles array is required" }, 400);
    }

    if (!userQuery || typeof userQuery !== "string") {
      return c.json({ error: "User query is required" }, 400);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    console.log(
      `Filtering ${articles.length} articles for user ${
        user.id
      } based on query: "${userQuery.substring(0, 50)}..."`,
    );

    // Prepare article summaries for relevance check (limit to first 50 articles per batch)
    const batchSize = 50;
    const filteredArticles: any[] = [];

    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);

      const articleSummaries = batch
        .map(
          (article: any, index: number) =>
            `[Article ${i + index + 1}]
Title: ${article.title}
Description: ${
              article.content
                ? article.content.substring(0, 400)
                : article.snippet || ""
            }
`,
        )
        .join("\n\n");

      const prompt = `You are evaluating news articles for relevance to a user's media monitoring query.

User Query: "${userQuery}"

Evaluate the following articles based on their TITLE and DESCRIPTION, and return ONLY the article numbers (e.g., 1, 3, 5) that are DIRECTLY RELEVANT to the user's query.

${articleSummaries}

STRICT RELEVANCE CRITERIA:
- The article's TITLE or DESCRIPTION must be DIRECTLY related to the specific topics/issues mentioned in the user's query
- Look for semantic relevance: does the article actually discuss what the user is searching for?
- If the query mentions "food poisoning", only include articles about food poisoning/contamination/food safety issues, NOT general food/cuisine/restaurant articles
- If the query mentions "hospital negligence", only include articles about medical malpractice/hospital problems/patient safety, NOT general healthcare news or hospital inaugurations
- If the query mentions "corruption cases", only include articles about corruption investigations/scandals/charges, NOT just mentions of politicians
- If the query mentions "infrastructure problems", only include articles about infrastructure failures/issues/complaints, NOT infrastructure inaugurations or announcements
- Be VERY STRICT - when in doubt, EXCLUDE the article
- Avoid tangentially related content (e.g., if query is "road accidents", exclude articles just mentioning traffic or vehicles)
- Articles must demonstrate clear topical alignment with the user's monitoring intent

EXAMPLES:
Query: "hospital mismanagement"
✅ INCLUDE: "Hospital faces inquiry over patient deaths", "Medical negligence case filed against district hospital"
❌ EXCLUDE: "New hospital wing inaugurated", "Hospital receives equipment donation"

Query: "food contamination"
✅ INCLUDE: "Food poisoning outbreak at wedding", "Restaurants shut down over hygiene violations"
❌ EXCLUDE: "New restaurant opens downtown", "Food festival draws large crowds"

Return ONLY a JSON array of relevant article numbers. Example format:
[1, 3, 7, 12]

If NO articles are relevant, return an empty array: []

Do not include any explanations, markdown, or additional text. Just the JSON array of numbers.`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
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
                  "You are an expert at evaluating article relevance for media monitoring. You always respond with a valid JSON array of numbers, nothing else.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: 300,
            temperature: 0.3,
          }),
        },
      );

      if (!response.ok) {
        console.error("OpenAI API error:", await response.text());
        // On error, include all articles from this batch
        filteredArticles.push(...batch);
        continue;
      }

      const data = await response.json();
      let content_text = data.choices[0]?.message?.content;

      if (!content_text) {
        // On error, include all articles from this batch
        filteredArticles.push(...batch);
        continue;
      }

      // Clean up the response
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

      // Parse the JSON array of relevant article numbers
      let relevantNumbers: number[];
      try {
        relevantNumbers = JSON.parse(content_text);
        if (!Array.isArray(relevantNumbers)) {
          throw new Error("Response is not an array");
        }

        // Add relevant articles from this batch
        relevantNumbers.forEach((num) => {
          const articleIndex = num - 1 - i; // Adjust for batch offset
          if (articleIndex >= 0 && articleIndex < batch.length) {
            filteredArticles.push(batch[articleIndex]);
          }
        });
      } catch (parseError) {
        console.error("Failed to parse relevance JSON:", content_text);
        // On parse error, include all articles from this batch
        filteredArticles.push(...batch);
      }
    }

    console.log(
      `Filtered ${articles.length} articles down to ${filteredArticles.length} relevant articles for user ${user.id}`,
    );

    return c.json({
      success: true,
      filteredArticles: filteredArticles,
      originalCount: articles.length,
      filteredCount: filteredArticles.length,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in filter-relevant-articles endpoint:", error);
    return c.json(
      {
        error: "Failed to filter articles",
        details: errorMessage,
      },
      500,
    );
  }
});

// Generate comprehensive search report from AI search results
settingsApp.post("/settings/generate-search-report", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const accessToken = authHeader?.split(" ")[1];

    if (!accessToken) {
      return c.json({ error: "Authorization token required" }, 401);
    }

    // Verify user authentication
    const supabase = createAuthenticatedClient(accessToken);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return c.json(
        {
          error: "Unauthorized",
          details: error?.message || "No user found",
        },
        401,
      );
    }

    const body = await c.req.json();
    const { userQuery, articles } = body;

    if (!userQuery || typeof userQuery !== "string") {
      return c.json({ error: "User query is required" }, 400);
    }

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return c.json(
        {
          error: "Articles array is required and must not be empty",
        },
        400,
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    console.log(
      `Generating comprehensive search report for user ${user.id} with ${
        articles.length
      } articles based on query: "${userQuery.substring(0, 50)}..."`,
    );

    // Prepare article summaries
    const articleSummaries = articles
      .map(
        (article: any, index: number) =>
          `[Article ${index + 1}]
Title: ${article.title}
Source: ${article.source}
Published: ${article.published || article.publishedAt || "Unknown date"}
URL: ${article.url}
Sentiment: ${article.sentiment || "Unknown"}
Content: ${article.content || article.snippet || ""}

`,
      )
      .join("\n");

    // Get current date
    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Calculate sentiment metrics from articles
    const posCount = articles.filter(
      (a: any) => a.sentiment === "positive",
    ).length;
    const negCount = articles.filter(
      (a: any) => a.sentiment === "negative",
    ).length;
    const neutralCount = articles.filter(
      (a: any) => a.sentiment === "neutral",
    ).length;
    const sentimentRatio =
      articles.length > 0
        ? (((posCount - negCount) / articles.length) * 100).toFixed(0)
        : 0;

    const prompt = `You are a senior analyst at a leading media intelligence firm, creating an executive briefing for C-level stakeholders. Your reports are known for their clarity, insight, and actionable intelligence.

GEOGRAPHIC SCOPE: Assam, India (EXCLUSIVELY)
- Focus ONLY on Assam state content
- EXCLUDE any information about other Indian states unless directly impacting Assam

---

**QUERY**: "${userQuery}"
**ARTICLES ANALYZED**: ${articles.length}
**SENTIMENT BREAKDOWN**: ${posCount} positive • ${negCount} negative • ${neutralCount} neutral (Score: ${sentimentRatio > 0 ? "+" : ""}${sentimentRatio})
**REPORT DATE**: ${currentDate}

---

${articleSummaries}

---

CREATE A POLISHED EXECUTIVE REPORT following this exact structure:

# ${userQuery}

> **TL;DR**: [One compelling sentence summarizing the most critical insight from all articles]

---

## Executive Summary

[2-3 paragraphs providing a crisp, data-driven overview. Include specific numbers, percentages, and key entity names in **bold**. Write in clear, professional prose - not bullet points here. Mention the overall sentiment trend and what it signals.]

---

## Key Findings

### By Region
[Organize by Assam locations mentioned. Use this format:]

**Guwahati**
- Finding 1 with specific detail (Source: Article N)
- Finding 2 with specific detail (Source: Article N)

**[Other City/District]**
- Finding with specific detail (Source: Article N)

### By Category

| Category | Key Issues | Severity |
|----------|-----------|----------|
| Infrastructure | [Brief issue] | 🔴 High / 🟡 Medium / 🟢 Low |
| Governance | [Brief issue] | 🔴/🟡/🟢 |
| Public Safety | [Brief issue] | 🔴/🟡/🟢 |
| Economy | [Brief issue] | 🔴/🟡/🟢 |

---

## Stakeholder Impact

**Government & Administration**
[What officials said/did, policy implications]

**Citizens & Communities**  
[Public reaction, grievances, demands - with specific quotes if available]

**Opposition & Civil Society**
[Criticism, alternative viewpoints, advocacy positions]

---

## Timeline

| Date | Event | Source |
|------|-------|--------|
| [Date] | [Event description] | Article N |
| [Date] | [Event description] | Article N |

---

## Recommendations

Based on this analysis, immediate attention is recommended for:

1. **[Priority Action 1]**: [Specific, actionable recommendation with rationale]
2. **[Priority Action 2]**: [Specific, actionable recommendation with rationale]
3. **[Priority Action 3]**: [Specific, actionable recommendation with rationale]

---

## Sources

[List top 5 most relevant article titles with their sources]

---

*This report was generated by AI-powered media intelligence. Data sourced from ${articles.length} news articles.*

---

FORMATTING RULES:
- Use clean Markdown with horizontal rules (---) as section dividers
- Use tables for structured data
- **Bold** all key statistics, names, locations
- Include "(Source: Article N)" citations
- Keep language crisp and professional
- NO emojis except in the severity column
- NO HTML tags

STRICT RULES:
1. ONLY use information from provided articles - NO external knowledge
2. Cite article numbers for all claims
3. Maintain objective, analytical tone
4. If data is insufficient for a section, write "[Insufficient data in source articles]"
5. Tables must be properly formatted Markdown`;

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
            content: `You are a senior media intelligence analyst at a top-tier consulting firm. You produce executive-grade reports that are data-driven, visually clean, and actionable. Your writing style is precise, professional, and free of fluff. Today's date is ${currentDate}. Focus: Assam, India.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 4000,
        temperature: 0.5,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return c.json({ error: `OpenAI API error: ${response.status}` }, 500);
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            controller.close();
            return;
          }

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, {
              stream: true,
            });
            const lines = chunk
              .split("\n")
              .filter((line) => line.trim() !== "");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);

                if (data === "[DONE]") {
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices[0]?.delta?.content;

                  if (content) {
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({ content })}\n\n`,
                      ),
                    );
                  }
                } catch (e) {
                  // Skip malformed JSON
                }
              }
            }
          }
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-search-report endpoint:", error);
    return c.json(
      {
        error: "Failed to generate search report",
        details: errorMessage,
      },
      500,
    );
  }
});

// Clean trending topics using AI
settingsApp.post("/settings/clean-trends", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const accessToken = authHeader?.split(" ")[1];

    if (!accessToken) {
      return c.json({ error: "Authorization token required" }, 401);
    }

    // Verify user authentication
    const supabase = createAuthenticatedClient(accessToken);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return c.json(
        {
          error: "Unauthorized",
          details: error?.message || "No user found",
        },
        401,
      );
    }

    const body = await c.req.json();
    const { trends } = body;

    if (!trends || !Array.isArray(trends) || trends.length === 0) {
      return c.json({ error: "Trends array is required" }, 400);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    console.log(`Cleaning ${trends.length} trends for user ${user.id}`);

    const prompt = `You are a strict editorial assistant for a professional media monitoring dashboard focused on Assam, India.
    
    Input List: ${JSON.stringify(trends)}
    
    Task: Filter this list of trending keywords/tokens to keep ONLY significant, specific, and news-worthy topics.
    
    STRICT FILTERING RULES (REMOVE THESE):
    - ❌ REMOVE generic verbs (e.g., "said", "took", "reported", "announced", "urged", "asked")
    - ❌ REMOVE generic adverbs/adjectives (e.g., "daily", "recent", "major", "likely", "various", "new", "today")
    - ❌ REMOVE vague nouns (e.g., "news", "updates", "media", "report", "article", "situation", "matter", "issue", "time", "day", "people")
    - ❌ REMOVE broad geographic terms unless essential (e.g., remove "India", "State", "District" if they appear alone; keep specific district names like "Nagaon", "Dibrugarh", "Jorhat")
    - ❌ REMOVE isolated numbers (e.g., "20", "50") unless they refer to a specific known entity (e.g., "G20")
    - ❌ REMOVE common functional words that slipped through stop-word filters
    
    RETENTION RULES (KEEP THESE):
    - ✅ KEEP specific Named Entities (Politicians, Officials, Parties, Companies, Organizations)
    - ✅ KEEP specific Locations in Assam (Villages, Blocks, Towns, Cities, Districts)
    - ✅ KEEP specific Events/Incidents (e.g., "Protest", "Accident", "Strike", "Flood", "Scam", "Murder", "Inauguration")
    - ✅ KEEP meaningful policy/governance terms (e.g., "Panchayat", "Collector", "High Court", "Assembly")
    - ✅ KEEP critical issue keywords (e.g., "Dengue", "Waterlogging", "Power Cut", "Shortage")

    Context: The user wants to see what is trending in the news. "Reported" is not a trend. "Dengue" is a trend. "Dibrugarh" is a trend.
    
    Output:
    Return ONLY a JSON array of strings containing the filtered, significant trends. 
    - You may fix capitalization (e.g. "agp" -> "AGP").
    - You may return the same word if it's valid.
    
    Example Input: ["took", "often", "election", "said", "flood", "2024", "updates", "himanta", "sarma"]
    Example Output: ["Election", "Flood", "Himanta", "Sarma"]`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert data cleaner. You always respond with a valid JSON array of strings.",
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
      return c.json({ error: `OpenAI API error: ${response.status}` }, 500);
    }

    const data = await response.json();
    let content_text = data.choices[0]?.message?.content;

    if (!content_text) {
      return c.json({ error: "No response from OpenAI API" }, 500);
    }

    // Clean up the response
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

    let cleanedTrends: string[];
    try {
      cleanedTrends = JSON.parse(content_text);
      if (!Array.isArray(cleanedTrends)) {
        throw new Error("Response is not an array");
      }
    } catch (parseError) {
      console.error("Failed to parse cleaned trends JSON:", content_text);
      // Fallback: return original list if parsing fails, but logged
      return c.json({ cleanedTrends: trends });
    }

    console.log(
      `Successfully cleaned trends: reduced from ${trends.length} to ${cleanedTrends.length}`,
    );

    return c.json({
      success: true,
      cleanedTrends: cleanedTrends,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in clean-trends endpoint:", error);
    return c.json(
      {
        error: "Failed to clean trends",
        details: errorMessage,
      },
      500,
    );
  }
});

export default settingsApp;
