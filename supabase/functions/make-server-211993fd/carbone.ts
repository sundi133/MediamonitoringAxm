import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const carboneApp = new Hono();

// Template cache (in-memory for edge function)
let templateCache: { templateId: string; hash: string } | null = null;

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

// Simple hash function for template comparison
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// HTML Template for Media Intelligence Report
const getReportTemplate = () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Media Intelligence Report - {d.generatedDate}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      color: #1e293b; 
      line-height: 1.6; 
      font-size: 11pt;
    }
    .page-break { page-break-after: always; }
    
    /* Header */
    .header { 
      border-bottom: 3px solid #6366f1; 
      padding-bottom: 20px; 
      margin-bottom: 30px; 
    }
    .header-label { 
      font-size: 10pt; 
      text-transform: uppercase; 
      letter-spacing: 0.15em; 
      color: #6366f1; 
      font-weight: 600; 
      margin-bottom: 4px; 
    }
    .header h1 { 
      font-size: 24pt; 
      font-weight: 700; 
      margin-bottom: 8px; 
      color: #1e293b;
    }
    .meta { 
      color: #64748b; 
      font-size: 10pt; 
    }
    
    /* Sections */
    h2 { 
      font-size: 12pt; 
      font-weight: 600; 
      text-transform: uppercase; 
      letter-spacing: 0.05em; 
      color: #64748b; 
      margin: 24px 0 16px; 
      border-bottom: 1px solid #e2e8f0; 
      padding-bottom: 8px; 
    }
    
    /* Metrics Grid */
    .metrics { 
      display: flex; 
      gap: 12px; 
      margin: 20px 0; 
    }
    .metric { 
      flex: 1;
      background: #f8fafc; 
      border-radius: 8px; 
      padding: 12px; 
      text-align: center;
    }
    .metric-label { 
      font-size: 9pt; 
      text-transform: uppercase; 
      color: #64748b; 
      margin-bottom: 4px; 
    }
    .metric-value { 
      font-size: 20pt; 
      font-weight: 700; 
    }
    .metric.positive { background: #ecfdf5; }
    .metric.positive .metric-value { color: #059669; }
    .metric.negative { background: #fef2f2; }
    .metric.negative .metric-value { color: #dc2626; }
    .metric.score .metric-value { color: #6366f1; }
    
    /* Recommendation Box */
    .recommendation { 
      background: #eef2ff; 
      border-left: 4px solid #6366f1; 
      padding: 16px; 
      border-radius: 0 8px 8px 0; 
      margin: 20px 0; 
    }
    .recommendation-label { 
      font-size: 9pt; 
      text-transform: uppercase; 
      color: #6366f1; 
      font-weight: 600; 
      margin-bottom: 8px; 
    }
    .recommendation p { 
      font-size: 10pt; 
      color: #475569; 
    }
    
    /* Trends */
    .trend-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 8px 0; 
      border-bottom: 1px solid #f1f5f9; 
    }
    .trend-keyword { font-weight: 500; }
    .trend-count { 
      color: #64748b; 
      background: #f1f5f9; 
      padding: 2px 8px; 
      border-radius: 4px; 
      font-size: 9pt; 
    }
    
    /* Sentiment Bar */
    .sentiment-bar {
      height: 24px;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      background: #e2e8f0;
      margin: 12px 0;
    }
    .sentiment-bar .positive { background: #10b981; }
    .sentiment-bar .neutral { background: #94a3b8; }
    .sentiment-bar .negative { background: #ef4444; }
    .sentiment-bar span {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      color: white;
      font-weight: 500;
    }
    .sentiment-legend {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      margin-top: 8px;
    }
    .sentiment-legend .pos { color: #059669; }
    .sentiment-legend .neu { color: #64748b; }
    .sentiment-legend .neg { color: #dc2626; }
    
    /* Articles */
    .article { 
      padding: 12px; 
      border-radius: 8px; 
      margin-bottom: 10px; 
      border: 1px solid #e2e8f0; 
    }
    .article.pos { background: #f0fdf4; border-color: #bbf7d0; }
    .article.neg { background: #fef2f2; border-color: #fecaca; }
    .article-meta { 
      font-size: 9pt; 
      color: #64748b; 
      margin-bottom: 4px; 
    }
    .article-meta .sentiment { 
      font-weight: 600; 
      text-transform: uppercase; 
    }
    .article-meta .sentiment.positive { color: #059669; }
    .article-meta .sentiment.negative { color: #dc2626; }
    .article-meta .sentiment.neutral { color: #64748b; }
    .article-title { 
      font-weight: 600; 
      margin-bottom: 4px; 
      font-size: 10pt;
    }
    .article-snippet { 
      font-size: 9pt; 
      color: #475569; 
    }
    
    /* Footer */
    .footer { 
      margin-top: 40px; 
      padding-top: 16px; 
      border-top: 1px solid #e2e8f0; 
      text-align: center; 
      color: #94a3b8; 
      font-size: 9pt; 
    }
    
    /* Two column layout */
    .two-col {
      display: flex;
      gap: 24px;
    }
    .two-col > div {
      flex: 1;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-label">Media Intelligence</div>
    <h1>Analysis Report</h1>
    <div class="meta">{d.generatedDate} · Last {d.timeRange} days · {d.totalArticles} articles analyzed</div>
  </div>

  <h2>Executive Summary</h2>
  
  <div class="metrics">
    <div class="metric">
      <div class="metric-label">Total Articles</div>
      <div class="metric-value">{d.totalArticles}</div>
    </div>
    <div class="metric score">
      <div class="metric-label">Sentiment Score</div>
      <div class="metric-value">{d.sentimentScoreFormatted}</div>
    </div>
    <div class="metric positive">
      <div class="metric-label">Positive</div>
      <div class="metric-value">{d.positiveCount}</div>
    </div>
    <div class="metric negative">
      <div class="metric-label">Negative</div>
      <div class="metric-value">{d.negativeCount}</div>
    </div>
  </div>

  <div class="recommendation">
    <div class="recommendation-label">💡 AI Recommendation</div>
    <p>{d.recommendation}</p>
  </div>

  <div class="two-col">
    <div>
      <h2>🔥 Trending Topics</h2>
      {#d.trends}
      <div class="trend-row">
        <span class="trend-keyword">{d.trends[i].rank}. {d.trends[i].keyword}</span>
        <span class="trend-count">{d.trends[i].count}</span>
      </div>
      {/d.trends}
      {#d.trends[0]:showEmpty}
      <p style="color: #94a3b8; padding: 12px 0;">No trends detected</p>
      {/d.trends[0]:showEmpty}
    </div>
    
    <div>
      <h2>📊 Sentiment Breakdown</h2>
      <div class="sentiment-bar">
        <span class="positive" style="width: {d.positivePercent}%">{d.positivePercent}%</span>
        <span class="neutral" style="width: {d.neutralPercent}%">{d.neutralPercent}%</span>
        <span class="negative" style="width: {d.negativePercent}%">{d.negativePercent}%</span>
      </div>
      <div class="sentiment-legend">
        <span class="pos">● Positive {d.positivePercent}%</span>
        <span class="neu">● Neutral {d.neutralPercent}%</span>
        <span class="neg">● Negative {d.negativePercent}%</span>
      </div>
    </div>
  </div>

  <h2>📰 Key Coverage</h2>
  {#d.articles}
  <div class="article {d.articles[i].sentiment:ifEQ('positive'):pos}{d.articles[i].sentiment:ifEQ('negative'):neg}">
    <div class="article-meta">
      <span class="sentiment {d.articles[i].sentiment}">{d.articles[i].sentimentUpper}</span>
      · {d.articles[i].source} · {d.articles[i].date}
    </div>
    <div class="article-title">{d.articles[i].title}</div>
    <div class="article-snippet">{d.articles[i].snippet}</div>
  </div>
  {/d.articles}

  <div class="footer">
    Generated by Media Monitor · {d.generatedDate}
  </div>
</body>
</html>`;

// Upload template to Carbone and get template ID
async function getOrUploadTemplate(): Promise<string> {
  const carboneApiToken = Deno.env.get("CARBONE_API_TOKEN");
  if (!carboneApiToken) {
    throw new Error("CARBONE_API_TOKEN not configured");
  }

  const templateContent = getReportTemplate();
  const templateHash = simpleHash(templateContent);

  // Check cache
  if (templateCache && templateCache.hash === templateHash) {
    console.log("Using cached Carbone template ID:", templateCache.templateId);
    return templateCache.templateId;
  }

  // Upload new template
  console.log("Uploading template to Carbone...");

  // Convert template to base64
  const encoder = new TextEncoder();
  const templateBytes = encoder.encode(templateContent);
  const base64Template = btoa(String.fromCharCode(...templateBytes));

  const uploadRes = await fetch("https://api.carbone.io/template", {
    method: "POST",
    headers: {
      "carbone-version": "5",
      "Content-Type": "application/json",
      Authorization: `Bearer ${carboneApiToken}`,
    },
    body: JSON.stringify({
      template: base64Template,
    }),
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Failed to upload template to Carbone: ${errorText}`);
  }

  const uploadResult = await uploadRes.json();
  const templateId = uploadResult.data?.templateId;

  if (!templateId) {
    throw new Error("No templateId returned from Carbone");
  }

  // Cache the template ID
  templateCache = { templateId, hash: templateHash };
  console.log("Template uploaded successfully, ID:", templateId);

  return templateId;
}

// Generate PDF report using Carbone
carboneApp.post("/generate-carbone-report", async (c) => {
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
    const { data, outputFormat = "pdf" } = body;

    if (!data) {
      return c.json({ error: "Report data is required" }, 400);
    }

    const carboneApiToken = Deno.env.get("CARBONE_API_TOKEN");
    if (!carboneApiToken) {
      return c.json({ error: "CARBONE_API_TOKEN not configured" }, 500);
    }

    console.log(`Generating ${outputFormat} report for user ${user.id}`);

    // Get or upload template
    const templateId = await getOrUploadTemplate();

    // Render the report
    const renderRes = await fetch(
      `https://api.carbone.io/render/${templateId}`,
      {
        method: "POST",
        headers: {
          "carbone-version": "5",
          "Content-Type": "application/json",
          Authorization: `Bearer ${carboneApiToken}`,
        },
        body: JSON.stringify({
          data: data,
          convertTo: outputFormat,
        }),
      },
    );

    if (!renderRes.ok) {
      const errorText = await renderRes.text();
      console.error("Carbone render error:", errorText);
      return c.json({ error: `Carbone render failed: ${errorText}` }, 500);
    }

    const renderResult = await renderRes.json();
    const renderId = renderResult.data?.renderId;

    if (!renderId) {
      return c.json({ error: "No renderId returned from Carbone" }, 500);
    }

    // Download the rendered file
    const downloadRes = await fetch(
      `https://api.carbone.io/render/${renderId}`,
      {
        method: "GET",
        headers: {
          "carbone-version": "5",
          Authorization: `Bearer ${carboneApiToken}`,
        },
      },
    );

    if (!downloadRes.ok) {
      const errorText = await downloadRes.text();
      console.error("Carbone download error:", errorText);
      return c.json({ error: `Carbone download failed: ${errorText}` }, 500);
    }

    // Get the file content
    const fileBuffer = await downloadRes.arrayBuffer();

    console.log(
      `Successfully generated ${outputFormat} report for user ${user.id}`,
    );

    // Return the file
    const contentType =
      outputFormat === "pdf"
        ? "application/pdf"
        : outputFormat === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/octet-stream";

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="media-report.${outputFormat}"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-carbone-report endpoint:", error);
    return c.json(
      {
        error: "Failed to generate report",
        details: errorMessage,
      },
      500,
    );
  }
});

export default carboneApp;
