import { projectId } from "../utils/supabase/info";
import { MediaMentionData } from "../types";

export interface ReportData {
  generatedDate: string;
  timeRange: number;
  totalArticles: number;
  sentimentScore: number;
  sentimentScoreFormatted: string;
  verdict: "positive" | "negative" | "mixed";
  recommendation: string;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  positivePercent: number;
  negativePercent: number;
  neutralPercent: number;
  trends: Array<{
    rank: number;
    keyword: string;
    count: number;
  }>;
  articles: Array<{
    title: string;
    source: string;
    date: string;
    sentiment: string;
    sentimentUpper: string;
    snippet: string;
    url: string;
  }>;
  // New extended metrics
  avgDailyVolume: string;
  sentimentTrend: string;
  sentimentTrendDirection: "improving" | "declining" | "stable";
  uniqueSources: number;
  topSources: Array<{
    name: string;
    total: number;
    positive: number;
    negative: number;
    neutral: number;
  }>;
  criticalAlerts: Array<{
    title: string;
    source: string;
    date: string;
    url: string;
  }>;
}

function formatTimeRange(days: number): string {
  if (days >= 730) return `${Math.round(days / 365)} years`;
  if (days >= 365) return "1 year";
  if (days >= 180) return "6 months";
  if (days >= 90) return "3 months";
  return `${days} days`;
}

class CarboneService {
  private baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-211993fd`;

  // Carbone Cloud API endpoint (requires API key)
  private carboneApiUrl = "https://api.carbone.io";

  /**
   * Prepare report data in a format suitable for Carbone templates
   */
  prepareReportData(
    mentions: MediaMentionData[],
    summary: {
      sentimentScore: number;
      verdict: "positive" | "negative" | "mixed";
      recommendation: string;
    } | null,
    trends: { keyword: string; count: number }[],
    timeRange: number,
  ): ReportData {
    const positiveCount = mentions.filter(
      (m) => m.sentiment === "positive",
    ).length;
    const negativeCount = mentions.filter(
      (m) => m.sentiment === "negative",
    ).length;
    const neutralCount = mentions.filter(
      (m) => m.sentiment === "neutral",
    ).length;
    const total = mentions.length;

    // Calculate source analysis
    const bySource: Record<
      string,
      { total: number; positive: number; negative: number; neutral: number }
    > = {};
    mentions.forEach((m) => {
      const source = m.source || "Unknown";
      if (!bySource[source])
        bySource[source] = { total: 0, positive: 0, negative: 0, neutral: 0 };
      bySource[source].total++;
      bySource[source][m.sentiment as "positive" | "negative" | "neutral"]++;
    });
    const topSources = Object.entries(bySource)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Calculate sentiment trend
    const midPoint = new Date(
      Date.now() - (timeRange / 2) * 24 * 60 * 60 * 1000,
    );
    const firstHalf = mentions.filter(
      (m) => new Date(m.publishedAt || m.publishedDate) < midPoint,
    );
    const secondHalf = mentions.filter(
      (m) => new Date(m.publishedAt || m.publishedDate) >= midPoint,
    );
    const firstHalfPositiveRate =
      firstHalf.length > 0
        ? firstHalf.filter((m) => m.sentiment === "positive").length /
          firstHalf.length
        : 0;
    const secondHalfPositiveRate =
      secondHalf.length > 0
        ? secondHalf.filter((m) => m.sentiment === "positive").length /
          secondHalf.length
        : 0;
    const sentimentTrendValue = secondHalfPositiveRate - firstHalfPositiveRate;
    const sentimentTrendDirection =
      sentimentTrendValue > 0.05
        ? "improving"
        : sentimentTrendValue < -0.05
          ? "declining"
          : "stable";

    // Calculate critical alerts (negative in last 48h)
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const criticalAlerts = mentions
      .filter(
        (m) =>
          m.sentiment === "negative" &&
          new Date(m.publishedAt || m.publishedDate) >= twoDaysAgo,
      )
      .sort(
        (a, b) =>
          new Date(b.publishedAt || b.publishedDate).getTime() -
          new Date(a.publishedAt || a.publishedDate).getTime(),
      )
      .slice(0, 5)
      .map((m) => ({
        title: m.title,
        source: m.source,
        date: new Date(m.publishedAt || m.publishedDate).toLocaleDateString(),
        url: m.url || "",
      }));

    return {
      generatedDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      timeRange,
      totalArticles: total,
      sentimentScore: summary?.sentimentScore || 0,
      sentimentScoreFormatted:
        (summary?.sentimentScore || 0) > 0
          ? `+${(summary?.sentimentScore || 0).toFixed(0)}`
          : (summary?.sentimentScore || 0).toFixed(0),
      verdict: summary?.verdict || "mixed",
      recommendation: summary?.recommendation || "No recommendation available.",
      positiveCount,
      negativeCount,
      neutralCount,
      positivePercent:
        total > 0 ? Math.round((positiveCount / total) * 100) : 0,
      negativePercent:
        total > 0 ? Math.round((negativeCount / total) * 100) : 0,
      neutralPercent: total > 0 ? Math.round((neutralCount / total) * 100) : 0,
      trends: trends.slice(0, 10).map((t, i) => ({
        rank: i + 1,
        keyword: t.keyword,
        count: t.count,
      })),
      articles: mentions.slice(0, 15).map((m) => ({
        title: m.title,
        source: m.source,
        date: new Date(m.publishedAt || m.publishedDate).toLocaleDateString(),
        sentiment: m.sentiment,
        sentimentUpper: m.sentiment.toUpperCase(),
        snippet: m.snippet,
        url: m.url || "",
      })),
      // Extended metrics
      avgDailyVolume: (total / Math.max(timeRange, 1)).toFixed(1),
      sentimentTrend: (sentimentTrendValue * 100).toFixed(1),
      sentimentTrendDirection,
      uniqueSources: Object.keys(bySource).length,
      topSources,
      criticalAlerts,
    };
  }

  /**
   * Generate PDF report using client-side rendering
   * Creates HTML and converts to PDF using browser print or html2pdf
   */
  async generatePdf(reportData: ReportData): Promise<Blob | null> {
    try {
      // Generate HTML content
      const html = this.generateHtmlContent(reportData);

      // Create a hidden iframe for PDF generation
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.left = "-9999px";
      iframe.style.width = "210mm";
      iframe.style.height = "297mm";
      document.body.appendChild(iframe);

      // Write HTML to iframe
      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        throw new Error("Could not access iframe document");
      }

      doc.open();
      doc.write(html);
      doc.close();

      // Wait for content to render
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Use html2canvas + jspdf approach via dynamic import
      try {
        // @ts-ignore - Dynamic import from CDN
        const html2pdf = (
          await import("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js")
        ).default;

        const pdfBlob = await html2pdf()
          .set({
            margin: 10,
            filename: `media-report-${new Date().toISOString().split("T")[0]}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          })
          .from(doc.body)
          .outputPdf("blob");

        document.body.removeChild(iframe);
        return pdfBlob;
      } catch (importError) {
        // Fallback: Open print dialog
        console.log("html2pdf not available, using print dialog");
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
        return null;
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      return null;
    }
  }

  /**
   * Generate PDF by opening HTML in new window with print option
   * This is a more reliable cross-browser approach
   */
  generatePdfViaPrint(reportData: ReportData): void {
    const html = this.generateHtmlContent(reportData);

    // Open in new window
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to generate PDF");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }

  /**
   * Generate inline SVG donut chart for PDF - matches web version
   */
  private generateDonutChartSvg(
    positive: number,
    neutral: number,
    negative: number,
  ): string {
    const total = positive + neutral + negative;
    if (total === 0)
      return '<div style="text-align: center; color: #94a3b8; padding: 20px;">No data</div>';

    const cx = 60;
    const cy = 60;
    const outerR = 45;
    const innerR = 30;

    // Calculate percentages
    const posPercent = positive / total;
    const neuPercent = neutral / total;
    const negPercent = negative / total;

    // Helper to create arc path for donut segment
    const createArc = (
      startPercent: number,
      endPercent: number,
      color: string,
    ): string => {
      if (endPercent - startPercent <= 0) return "";

      const startAngle = startPercent * 360 - 90;
      const endAngle = endPercent * 360 - 90;

      const x1 = cx + outerR * Math.cos((startAngle * Math.PI) / 180);
      const y1 = cy + outerR * Math.sin((startAngle * Math.PI) / 180);
      const x2 = cx + outerR * Math.cos((endAngle * Math.PI) / 180);
      const y2 = cy + outerR * Math.sin((endAngle * Math.PI) / 180);
      const x3 = cx + innerR * Math.cos((endAngle * Math.PI) / 180);
      const y3 = cy + innerR * Math.sin((endAngle * Math.PI) / 180);
      const x4 = cx + innerR * Math.cos((startAngle * Math.PI) / 180);
      const y4 = cy + innerR * Math.sin((startAngle * Math.PI) / 180);

      const largeArc = endPercent - startPercent > 0.5 ? 1 : 0;

      return `<path d="M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z" fill="${color}"/>`;
    };

    let currentPercent = 0;
    const arcs: string[] = [];

    // Build arcs in order: positive (green), neutral (gray), negative (red)
    if (posPercent > 0) {
      arcs.push(
        createArc(currentPercent, currentPercent + posPercent, "#10B981"),
      );
      currentPercent += posPercent;
    }
    if (neuPercent > 0) {
      arcs.push(
        createArc(currentPercent, currentPercent + neuPercent, "#94A3B8"),
      );
      currentPercent += neuPercent;
    }
    if (negPercent > 0) {
      arcs.push(
        createArc(currentPercent, currentPercent + negPercent, "#F43F5E"),
      );
    }

    return `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          ${arcs.join("")}
          <text x="60" y="55" text-anchor="middle" font-size="20" font-weight="700" fill="#1e293b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${total}</text>
          <text x="60" y="72" text-anchor="middle" font-size="10" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Total</text>
        </svg>
        <div style="display: flex; gap: 12px; margin-top: 8px; font-size: 10px;">
          <span style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
            <span style="color: #64748b;">${Math.round(posPercent * 100)}%</span>
          </span>
          <span style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #94A3B8;"></span>
            <span style="color: #64748b;">${Math.round(neuPercent * 100)}%</span>
          </span>
          <span style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #F43F5E;"></span>
            <span style="color: #64748b;">${Math.round(negPercent * 100)}%</span>
          </span>
        </div>
      </div>
    `;
  }

  private polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  /**
   * Generate inline SVG gauge for sentiment score - matches web version exactly
   */
  private generateGaugeSvg(score: number): string {
    const isPositive = score > 0;
    const isNegative = score < 0;
    const color = isPositive ? "#10B981" : isNegative ? "#F43F5E" : "#94A3B8";

    // Match React component exactly
    const cx = 80;
    const cy = 65;
    const r = 50;
    const strokeW = 10;

    // Normalize score from -100...+100 to 0...180 degrees (same as React)
    const normalizedScore = Math.max(0, Math.min(100, (score + 100) / 2));
    const angle = (normalizedScore / 100) * 180;

    // Calculate endpoint using same formula as React component
    // θ goes from 0 (left) to 180 (right), arc curves upward
    const endX = cx - r * Math.cos((angle * Math.PI) / 180);
    const endY = cy - r * Math.sin((angle * Math.PI) / 180);

    // Build the value arc path only if there's a score to show
    const valueArc =
      angle > 0
        ? `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round"/>`
        : "";

    return `
      <svg width="160" height="100" viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
        <!-- Background arc (full semicircle from left to right) -->
        <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" 
              fill="none" stroke="#E2E8F0" stroke-width="${strokeW}" stroke-linecap="round"/>
        <!-- Value arc -->
        ${valueArc}
        <!-- Score text -->
        <text x="${cx}" y="${cy - 12}" text-anchor="middle" font-size="24" font-weight="700" fill="${color}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          ${score > 0 ? "+" : ""}${score.toFixed(0)}
        </text>
        <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="9" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" letter-spacing="0.5px">
          SENTIMENT SCORE
        </text>
      </svg>
    `;
  }

  /**
   * Generate inline SVG bar chart for trends
   */
  private generateTrendsBarSvg(trends: ReportData["trends"]): string {
    if (trends.length === 0)
      return '<p style="color: #94a3b8; padding: 12px 0;">No trends detected</p>';

    const maxCount = Math.max(...trends.map((t) => t.count));
    const barHeight = 24;
    const gap = 8;
    const chartWidth = 300;
    const labelWidth = 100;

    const bars = trends
      .slice(0, 6)
      .map((trend, i) => {
        const barWidth =
          (trend.count / maxCount) * (chartWidth - labelWidth - 40);
        const y = i * (barHeight + gap);
        const label =
          trend.keyword.length > 12
            ? trend.keyword.slice(0, 12) + "..."
            : trend.keyword;

        return `
        <g transform="translate(0, ${y})">
          <text x="0" y="16" font-size="11" fill="#64748b">${label}</text>
          <rect x="${labelWidth}" y="2" width="${barWidth}" height="20" rx="4" fill="url(#barGrad)"/>
          <text x="${labelWidth + barWidth + 8}" y="16" font-size="11" fill="#64748b">${trend.count}</text>
        </g>
      `;
      })
      .join("");

    const height = trends.slice(0, 6).length * (barHeight + gap);

    return `
      <svg width="${chartWidth}" height="${height}" viewBox="0 0 ${chartWidth} ${height}">
        <defs>
          <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#6366F1"/>
            <stop offset="100%" stop-color="#8B5CF6"/>
          </linearGradient>
        </defs>
        ${bars}
      </svg>
    `;
  }

  /**
   * Generate the HTML content for the report - Modern Professional Design
   */
  private generateHtmlContent(reportData: ReportData): string {
    const scoreColor =
      reportData.sentimentScore > 0
        ? "#10B981"
        : reportData.sentimentScore < 0
          ? "#F43F5E"
          : "#64748B";

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Media Intelligence Report - ${reportData.generatedDate}</title>
  <style>
    @page { size: A4; margin: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-break { page-break-inside: avoid; }
      .page-break { page-break-before: always; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      color: #1e293b; 
      line-height: 1.5; 
      font-size: 10pt;
      background: #f8fafc;
    }
    
    /* Header with gradient */
    .header {
      background: #2563EB;
      color: white;
      padding: 40px 40px 60px;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 30px;
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120'%3E%3Cpath fill='%23f8fafc' d='M0,60 C150,120 350,0 600,60 C850,120 1050,0 1200,60 L1200,120 L0,120 Z'/%3E%3C/svg%3E") no-repeat bottom;
      background-size: cover;
    }
    .logo-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .logo-icon {
      width: 36px;
      height: 36px;
      background: rgba(255,255,255,0.2);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-icon svg { width: 20px; height: 20px; }
    .logo-text {
      font-size: 14pt;
      font-weight: 600;
      opacity: 0.9;
    }
    .header-subtitle {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      opacity: 0.8;
      margin-bottom: 8px;
    }
    .header h1 {
      font-size: 28pt;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header-meta {
      font-size: 11pt;
      opacity: 0.8;
    }
    
    /* Main content */
    .content {
      padding: 30px 40px 40px;
      max-width: 900px;
      margin: 0 auto;
    }
    
    /* Cards grid */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    .card-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-icon svg { width: 16px; height: 16px; }
    .card-icon.purple { background: linear-gradient(135deg, #6366F1, #8B5CF6); }
    .card-icon.green { background: linear-gradient(135deg, #10B981, #14B8A6); }
    .card-icon.orange { background: linear-gradient(135deg, #F97316, #FBBF24); }
    .card-title {
      font-size: 10pt;
      font-weight: 600;
      color: #475569;
    }
    
    /* Stats rows */
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .stat-row.positive { background: #ecfdf5; }
    .stat-row.positive .stat-label { color: #059669; }
    .stat-row.positive .stat-value { color: #059669; }
    .stat-row.negative { background: #fef2f2; }
    .stat-row.negative .stat-label { color: #dc2626; }
    .stat-row.negative .stat-value { color: #dc2626; }
    .stat-label { font-size: 10pt; color: #64748b; }
    .stat-value { font-size: 16pt; font-weight: 700; color: #1e293b; }
    
    /* AI Recommendation */
    .recommendation {
      background: linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      border: 1px solid #C7D2FE;
    }
    .recommendation-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .recommendation-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #6366F1, #8B5CF6);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .recommendation-icon svg { width: 20px; height: 20px; }
    .recommendation-label {
      font-size: 9pt;
      font-weight: 700;
      color: #6366F1;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .recommendation-text {
      font-size: 10pt;
      color: #475569;
      line-height: 1.6;
    }
    
    /* Section headers */
    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      margin-top: 8px;
    }
    .section-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .section-icon svg { width: 16px; height: 16px; }
    .section-icon.red { background: linear-gradient(135deg, #F97316, #EF4444); }
    .section-icon.blue { background: linear-gradient(135deg, #3B82F6, #06B6D4); }
    .section-title {
      font-size: 11pt;
      font-weight: 600;
      color: #1e293b;
    }
    
    /* Trends section */
    .trends-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
      margin-bottom: 24px;
    }
    
    /* Articles */
    .article {
      background: white;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .article.positive { 
      border-color: #A7F3D0;
      background: linear-gradient(135deg, #ECFDF5 0%, white 100%);
    }
    .article.negative { 
      border-color: #FECACA;
      background: linear-gradient(135deg, #FEF2F2 0%, white 100%);
    }
    .article-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .article-favicon {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      background: #f1f5f9;
    }
    .sentiment-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .sentiment-badge.positive { background: #D1FAE5; color: #059669; }
    .sentiment-badge.negative { background: #FEE2E2; color: #DC2626; }
    .sentiment-badge.neutral { background: #F1F5F9; color: #64748B; }
    .article-source {
      font-size: 9pt;
      color: #64748b;
    }
    .article-title {
      font-size: 11pt;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .article-title a {
      color: #1e293b;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: all 0.15s;
    }
    .article-title a:hover {
      color: #4F46E5;
      border-bottom-color: #4F46E5;
    }
    .article-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 8pt;
      color: #6366F1;
      text-decoration: none;
      margin-top: 4px;
    }
    .article-link:hover {
      text-decoration: underline;
    }
    .alert-title a {
      color: #1e293b;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: all 0.15s;
    }
    .alert-title a:hover {
      color: #4F46E5;
      border-bottom-color: #4F46E5;
    }
    .article-snippet {
      font-size: 9pt;
      color: #64748b;
      line-height: 1.5;
    }
    
    /* Footer */
    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #94a3b8;
      font-size: 9pt;
    }
    .footer-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .footer-logo svg { width: 14px; height: 14px; opacity: 0.5; }
    
    /* Chart containers */
    .chart-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 120px;
    }
    
    /* Legend */
    .legend {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 12px;
      font-size: 9pt;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .legend-dot.positive { background: #10B981; }
    .legend-dot.neutral { background: #94A3B8; }
    .legend-dot.negative { background: #F43F5E; }
  </style>
</head>
<body>
  <!-- Gradient Header -->
  <div class="header">
    <div class="logo-row">
      <div class="logo-icon">
        <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <span class="logo-text">Media Monitor</span>
    </div>
    <div class="header-subtitle">Intelligence Report</div>
    <h1>Media Analysis Summary</h1>
    <div class="header-meta">${reportData.generatedDate} &bull; Last ${formatTimeRange(reportData.timeRange)} &bull; ${reportData.totalArticles} articles analyzed</div>
  </div>

  <div class="content">
    <!-- Summary Cards Grid -->
    <div class="cards-grid">
      <!-- Score Gauge Card -->
      <div class="card">
        <div class="card-header">
          <div class="card-icon purple">
            <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <span class="card-title">Overall Score</span>
        </div>
        <div class="chart-container">
          ${this.generateGaugeSvg(reportData.sentimentScore)}
        </div>
      </div>

      <!-- Donut Chart Card -->
      <div class="card">
        <div class="card-header">
          <div class="card-icon green">
            <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
            </svg>
          </div>
          <span class="card-title">Sentiment Distribution</span>
        </div>
        <div class="chart-container">
          ${this.generateDonutChartSvg(reportData.positiveCount, reportData.neutralCount, reportData.negativeCount)}
        </div>
        <div class="legend">
          <div class="legend-item"><div class="legend-dot positive"></div><span>Positive</span></div>
          <div class="legend-item"><div class="legend-dot neutral"></div><span>Neutral</span></div>
          <div class="legend-item"><div class="legend-dot negative"></div><span>Negative</span></div>
        </div>
      </div>

      <!-- Quick Stats Card -->
      <div class="card">
        <div class="card-header">
          <div class="card-icon orange">
            <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
          </div>
          <span class="card-title">Quick Stats</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Total Articles</span>
          <span class="stat-value">${reportData.totalArticles}</span>
        </div>
        <div class="stat-row positive">
          <span class="stat-label">Positive</span>
          <span class="stat-value">${reportData.positiveCount}</span>
        </div>
        <div class="stat-row negative">
          <span class="stat-label">Negative</span>
          <span class="stat-value">${reportData.negativeCount}</span>
        </div>
      </div>
    </div>

    <!-- Period Metrics -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div class="card-icon" style="background: linear-gradient(135deg, #06B6D4, #3B82F6);">
          <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
        </div>
        <span class="card-title">Period Metrics</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
        <div style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
          <div style="font-size: 18pt; font-weight: 700; color: #6366F1;">${reportData.avgDailyVolume}</div>
          <div style="font-size: 8pt; color: #64748b; text-transform: uppercase;">Avg Daily</div>
        </div>
        <div style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
          <div style="font-size: 18pt; font-weight: 700; color: ${reportData.sentimentTrendDirection === "improving" ? "#10B981" : reportData.sentimentTrendDirection === "declining" ? "#F43F5E" : "#64748B"};">${reportData.sentimentTrend}%</div>
          <div style="font-size: 8pt; color: #64748b; text-transform: uppercase;">Trend</div>
        </div>
        <div style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
          <div style="font-size: 18pt; font-weight: 700; color: #475569;">${reportData.uniqueSources}</div>
          <div style="font-size: 8pt; color: #64748b; text-transform: uppercase;">Sources</div>
        </div>
      </div>
    </div>

    <!-- AI Recommendation -->
    <div class="recommendation no-break">
      <div class="recommendation-header">
        <div class="recommendation-icon">
          <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
        </div>
        <div>
          <div class="recommendation-label">AI-Powered Recommendation</div>
          <div class="recommendation-text">${reportData.recommendation}</div>
        </div>
      </div>
    </div>

    ${
      reportData.criticalAlerts.length > 0
        ? `
    <!-- Critical Alerts -->
    <div class="card no-break" style="margin-bottom: 24px; background: linear-gradient(135deg, #FEF2F2 0%, white 100%); border-color: #FECACA;">
      <div class="card-header">
        <div class="card-icon" style="background: linear-gradient(135deg, #F43F5E, #DC2626);">
          <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <span class="card-title" style="color: #DC2626;">Critical Alerts (Last 48h)</span>
        <span style="background: #FEE2E2; color: #DC2626; padding: 2px 8px; border-radius: 12px; font-size: 9pt; font-weight: 600;">${reportData.criticalAlerts.length}</span>
      </div>
      ${reportData.criticalAlerts
        .map(
          (alert) => `
        <div style="padding: 10px; background: white; border-radius: 8px; margin-bottom: 8px; border: 1px solid #FECACA;">
          <div style="font-size: 9pt; color: #DC2626; margin-bottom: 4px;">${alert.source} &bull; ${alert.date}</div>
          <div class="alert-title" style="font-size: 10pt; font-weight: 600;">${alert.url ? `<a href="${alert.url}" target="_blank" rel="noopener noreferrer">${alert.title}</a>` : alert.title}</div>
          ${alert.url ? `<a class="article-link" href="${alert.url}" target="_blank" rel="noopener noreferrer">Read article →</a>` : ""}
        </div>
      `,
        )
        .join("")}
    </div>
    `
        : ""
    }

    <!-- Two Column: Top Sources + Trending Topics -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
      <!-- Top Sources -->
      <div class="card no-break">
        <div class="card-header">
          <div class="card-icon" style="background: linear-gradient(135deg, #3B82F6, #6366F1);">
            <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
          <span class="card-title">Top Sources</span>
        </div>
        ${reportData.topSources
          .map(
            (source) => `
          <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10pt; font-weight: 500; color: #475569;">${source.name}</span>
              <span style="font-size: 10pt; font-weight: 700; color: #1e293b;">${source.total}</span>
            </div>
            <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; display: flex;">
              ${source.positive > 0 ? `<div style="width: ${(source.positive / source.total) * 100}%; background: #10B981;"></div>` : ""}
              ${source.neutral > 0 ? `<div style="width: ${(source.neutral / source.total) * 100}%; background: #94A3B8;"></div>` : ""}
              ${source.negative > 0 ? `<div style="width: ${(source.negative / source.total) * 100}%; background: #F43F5E;"></div>` : ""}
            </div>
          </div>
        `,
          )
          .join("")}
      </div>

      <!-- Trending Topics -->
      <div class="card no-break">
        <div class="card-header">
          <div class="card-icon red">
            <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            </svg>
          </div>
          <span class="card-title">Trending Topics</span>
        </div>
        ${this.generateTrendsBarSvg(reportData.trends)}
      </div>
    </div>

    <!-- Key Coverage -->
    <div class="section-header">
      <div class="section-icon blue">
        <svg fill="none" stroke="white" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      </div>
      <span class="section-title">Key Coverage</span>
    </div>
    
    ${reportData.articles
      .slice(0, 8)
      .map(
        (article) => `
      <div class="article no-break ${article.sentiment}">
        <div class="article-header">
          <span class="sentiment-badge ${article.sentiment}">${article.sentimentUpper}</span>
          <span class="article-source">&bull; ${article.source} &bull; ${article.date}</span>
        </div>
        <div class="article-title">${article.url ? `<a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a>` : article.title}</div>
        <div class="article-snippet">${article.snippet}</div>
        ${article.url ? `<a class="article-link" href="${article.url}" target="_blank" rel="noopener noreferrer">Read full article →</a>` : ""}
      </div>
    `,
      )
      .join("")}

    <!-- Footer -->
    <div class="footer">
      <div class="footer-logo">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <span>Generated by Media Monitor &bull; ${reportData.generatedDate}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate report using Carbone Cloud API (requires backend deployment)
   * Requires CARBONE_API_KEY to be set on the server
   */
  async generateWithCarbone(
    accessToken: string,
    reportData: ReportData,
    outputFormat: "pdf" | "docx" | "xlsx" = "pdf",
  ): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-carbone-report`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: reportData,
          outputFormat,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Carbone report generation failed:", error);
        return null;
      }

      return await response.blob();
    } catch (error) {
      console.error("Error generating Carbone report:", error);
      return null;
    }
  }

  /**
   * Generate DOCX report locally using the docx library
   * Enhanced with modern professional styling
   */
  async generateDocxLocal(reportData: ReportData): Promise<Blob> {
    // Dynamic import to avoid loading docx library until needed
    const docx = await import("docx");
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      Table,
      TableRow,
      TableCell,
      WidthType,
      AlignmentType,
      BorderStyle,
      ShadingType,
      convertInchesToTwip,
      HeadingLevel,
      PageBreak,
      ExternalHyperlink,
    } = docx;

    // Define modern colors
    const colors = {
      primary: "6366F1", // Indigo
      primaryDark: "4F46E5", // Darker indigo
      purple: "8B5CF6", // Purple
      positive: "10B981", // Emerald
      positiveLight: "D1FAE5",
      negative: "F43F5E", // Rose
      negativeLight: "FEE2E2",
      neutral: "64748B", // Slate
      neutralLight: "F1F5F9",
      text: "1E293B", // Dark slate
      textMuted: "475569", // Medium slate
      lightBg: "F8FAFC", // Very light gray
      border: "E2E8F0", // Light border
      white: "FFFFFF",
    };

    // Helper function to create a styled metric cell
    const createMetricCell = (
      label: string,
      value: string,
      bgColor: string,
      valueColor: string,
      borderColor: string = colors.border,
    ) => {
      return new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: bgColor },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
          left: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
          right: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
        },
        margins: {
          top: 150,
          bottom: 150,
          left: 150,
          right: 150,
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: label.toUpperCase(),
                size: 16,
                color: colors.neutral,
                font: "Segoe UI",
              }),
            ],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: value,
                size: 40,
                bold: true,
                color: valueColor,
                font: "Segoe UI",
              }),
            ],
          }),
        ],
      });
    };

    // Helper to create a visual progress bar using table cells
    const createProgressBar = (
      positivePercent: number,
      neutralPercent: number,
      negativePercent: number,
    ) => {
      const cells = [];
      const totalWidth = 100;

      if (positivePercent > 0) {
        cells.push(
          new TableCell({
            width: { size: positivePercent, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: colors.positive },
            borders: {
              top: { style: BorderStyle.NIL },
              bottom: { style: BorderStyle.NIL },
              left: { style: BorderStyle.NIL },
              right: { style: BorderStyle.NIL },
            },
            children: [new Paragraph({ children: [] })],
          }),
        );
      }
      if (neutralPercent > 0) {
        cells.push(
          new TableCell({
            width: { size: neutralPercent, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: colors.neutral },
            borders: {
              top: { style: BorderStyle.NIL },
              bottom: { style: BorderStyle.NIL },
              left: { style: BorderStyle.NIL },
              right: { style: BorderStyle.NIL },
            },
            children: [new Paragraph({ children: [] })],
          }),
        );
      }
      if (negativePercent > 0) {
        cells.push(
          new TableCell({
            width: { size: negativePercent, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: colors.negative },
            borders: {
              top: { style: BorderStyle.NIL },
              bottom: { style: BorderStyle.NIL },
              left: { style: BorderStyle.NIL },
              right: { style: BorderStyle.NIL },
            },
            children: [new Paragraph({ children: [] })],
          }),
        );
      }

      // If no cells, add a neutral placeholder
      if (cells.length === 0) {
        cells.push(
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: colors.neutralLight },
            borders: {
              top: { style: BorderStyle.NIL },
              bottom: { style: BorderStyle.NIL },
              left: { style: BorderStyle.NIL },
              right: { style: BorderStyle.NIL },
            },
            children: [new Paragraph({ children: [] })],
          }),
        );
      }

      return cells;
    };

    // Create document
    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            run: {
              font: "Segoe UI",
              size: 22,
              color: colors.text,
            },
            paragraph: {
              spacing: { line: 276 },
            },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.6),
                right: convertInchesToTwip(0.6),
                bottom: convertInchesToTwip(0.6),
                left: convertInchesToTwip(0.6),
              },
            },
          },
          children: [
            // Header Section with accent bar
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      shading: {
                        type: ShadingType.SOLID,
                        color: colors.primary,
                      },
                      borders: {
                        top: { style: BorderStyle.NIL },
                        bottom: { style: BorderStyle.NIL },
                        left: { style: BorderStyle.NIL },
                        right: { style: BorderStyle.NIL },
                      },
                      margins: { top: 300, bottom: 300, left: 200, right: 200 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "MEDIA MONITOR",
                              size: 20,
                              bold: true,
                              color: colors.white,
                              font: "Segoe UI",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            // Title
            new Paragraph({
              children: [
                new TextRun({
                  text: "INTELLIGENCE REPORT",
                  size: 18,
                  color: colors.primary,
                  bold: true,
                  font: "Segoe UI",
                }),
              ],
              spacing: { before: 300, after: 80 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Media Analysis Summary",
                  size: 48,
                  bold: true,
                  color: colors.text,
                  font: "Segoe UI",
                }),
              ],
              spacing: { after: 120 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${reportData.generatedDate}  •  Last ${formatTimeRange(reportData.timeRange)}  •  ${reportData.totalArticles} articles analyzed`,
                  size: 22,
                  color: colors.neutral,
                  font: "Segoe UI",
                }),
              ],
              spacing: { after: 400 },
              border: {
                bottom: {
                  color: colors.border,
                  size: 8,
                  style: BorderStyle.SINGLE,
                },
              },
            }),

            // Executive Summary Section Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "EXECUTIVE SUMMARY",
                  size: 24,
                  bold: true,
                  color: colors.neutral,
                  font: "Segoe UI",
                }),
              ],
              spacing: { before: 300, after: 200 },
            }),

            // Metrics Table
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    createMetricCell(
                      "Total Articles",
                      reportData.totalArticles.toString(),
                      colors.lightBg,
                      colors.text,
                    ),
                    createMetricCell(
                      "Sentiment Score",
                      reportData.sentimentScoreFormatted,
                      colors.lightBg,
                      reportData.sentimentScore > 0
                        ? colors.positive
                        : reportData.sentimentScore < 0
                          ? colors.negative
                          : colors.neutral,
                    ),
                    createMetricCell(
                      "Positive",
                      `${reportData.positiveCount}`,
                      colors.positiveLight,
                      colors.positive,
                      colors.positive,
                    ),
                    createMetricCell(
                      "Negative",
                      `${reportData.negativeCount}`,
                      colors.negativeLight,
                      colors.negative,
                      colors.negative,
                    ),
                  ],
                }),
              ],
            }),

            // Sentiment Distribution Bar
            new Paragraph({
              children: [
                new TextRun({
                  text: "SENTIMENT DISTRIBUTION",
                  size: 20,
                  bold: true,
                  color: colors.neutral,
                  font: "Segoe UI",
                }),
              ],
              spacing: { before: 400, after: 150 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  height: { value: 300, rule: docx.HeightRule.EXACT },
                  children: createProgressBar(
                    reportData.positivePercent,
                    reportData.neutralPercent,
                    reportData.negativePercent,
                  ),
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "● ", color: colors.positive, size: 18 }),
                new TextRun({
                  text: `Positive ${reportData.positivePercent}%`,
                  size: 18,
                  color: colors.neutral,
                }),
                new TextRun({
                  text: "     ● ",
                  color: colors.neutral,
                  size: 18,
                }),
                new TextRun({
                  text: `Neutral ${reportData.neutralPercent}%`,
                  size: 18,
                  color: colors.neutral,
                }),
                new TextRun({
                  text: "     ● ",
                  color: colors.negative,
                  size: 18,
                }),
                new TextRun({
                  text: `Negative ${reportData.negativePercent}%`,
                  size: 18,
                  color: colors.neutral,
                }),
              ],
              spacing: { before: 100, after: 300 },
            }),

            // AI Recommendation Box
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      shading: { type: ShadingType.SOLID, color: "EEF2FF" },
                      borders: {
                        top: {
                          style: BorderStyle.SINGLE,
                          size: 8,
                          color: "C7D2FE",
                        },
                        bottom: {
                          style: BorderStyle.SINGLE,
                          size: 8,
                          color: "C7D2FE",
                        },
                        left: {
                          style: BorderStyle.SINGLE,
                          size: 24,
                          color: colors.primary,
                        },
                        right: {
                          style: BorderStyle.SINGLE,
                          size: 8,
                          color: "C7D2FE",
                        },
                      },
                      margins: { top: 200, bottom: 200, left: 200, right: 200 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "💡 AI-POWERED RECOMMENDATION",
                              size: 18,
                              bold: true,
                              color: colors.primary,
                              font: "Segoe UI",
                            }),
                          ],
                          spacing: { after: 100 },
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: reportData.recommendation,
                              size: 22,
                              color: colors.textMuted,
                              font: "Segoe UI",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            // Period Metrics Section
            new Paragraph({
              children: [
                new TextRun({
                  text: "📈 PERIOD METRICS",
                  size: 24,
                  bold: true,
                  color: colors.neutral,
                  font: "Segoe UI",
                }),
              ],
              spacing: { before: 400, after: 200 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    createMetricCell(
                      "Avg Daily Volume",
                      reportData.avgDailyVolume,
                      colors.lightBg,
                      colors.primary,
                    ),
                    createMetricCell(
                      "Sentiment Trend",
                      `${reportData.sentimentTrend}%`,
                      colors.lightBg,
                      reportData.sentimentTrendDirection === "improving"
                        ? colors.positive
                        : reportData.sentimentTrendDirection === "declining"
                          ? colors.negative
                          : colors.neutral,
                    ),
                    createMetricCell(
                      "Unique Sources",
                      `${reportData.uniqueSources}`,
                      colors.lightBg,
                      colors.textMuted,
                    ),
                  ],
                }),
              ],
            }),

            // Critical Alerts Section (if any)
            ...(reportData.criticalAlerts.length > 0
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "⚠️ CRITICAL ALERTS (Last 48h)",
                        size: 24,
                        bold: true,
                        color: colors.negative,
                        font: "Segoe UI",
                      }),
                    ],
                    spacing: { before: 400, after: 200 },
                  }),
                  ...reportData.criticalAlerts.map(
                    (alert) =>
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                          new TableRow({
                            children: [
                              new TableCell({
                                width: {
                                  size: 100,
                                  type: WidthType.PERCENTAGE,
                                },
                                shading: {
                                  type: ShadingType.SOLID,
                                  color: colors.negativeLight,
                                },
                                borders: {
                                  top: {
                                    style: BorderStyle.SINGLE,
                                    size: 8,
                                    color: colors.negative,
                                  },
                                  bottom: {
                                    style: BorderStyle.SINGLE,
                                    size: 8,
                                    color: colors.negative,
                                  },
                                  left: {
                                    style: BorderStyle.SINGLE,
                                    size: 8,
                                    color: colors.negative,
                                  },
                                  right: {
                                    style: BorderStyle.SINGLE,
                                    size: 8,
                                    color: colors.negative,
                                  },
                                },
                                margins: {
                                  top: 100,
                                  bottom: 100,
                                  left: 150,
                                  right: 150,
                                },
                                children: [
                                  new Paragraph({
                                    children: [
                                      new TextRun({
                                        text: `${alert.source}  •  ${alert.date}`,
                                        size: 16,
                                        color: colors.negative,
                                        font: "Segoe UI",
                                      }),
                                    ],
                                    spacing: { after: 40 },
                                  }),
                                  new Paragraph({
                                    children: alert.url
                                      ? [
                                          new ExternalHyperlink({
                                            link: alert.url,
                                            children: [
                                              new TextRun({
                                                text: alert.title,
                                                size: 20,
                                                bold: true,
                                                color: colors.primary,
                                                font: "Segoe UI",
                                                underline: {},
                                              }),
                                            ],
                                          }),
                                        ]
                                      : [
                                          new TextRun({
                                            text: alert.title,
                                            size: 20,
                                            bold: true,
                                            color: colors.text,
                                            font: "Segoe UI",
                                          }),
                                        ],
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                  ),
                  new Paragraph({ spacing: { after: 150 }, children: [] }),
                ]
              : []),

            // Top Sources Section
            new Paragraph({
              children: [
                new TextRun({
                  text: "🏢 TOP SOURCES",
                  size: 24,
                  bold: true,
                  color: colors.neutral,
                  font: "Segoe UI",
                }),
              ],
              spacing: { before: 400, after: 200 },
            }),
            ...reportData.topSources.map(
              (source, index) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: source.name,
                      size: 22,
                      bold: true,
                      color: colors.text,
                      font: "Segoe UI",
                    }),
                    new TextRun({
                      text: `  •  ${source.total} articles  (`,
                      size: 20,
                      color: colors.neutral,
                      font: "Segoe UI",
                    }),
                    new TextRun({
                      text: `${source.positive} pos`,
                      size: 18,
                      color: colors.positive,
                      font: "Segoe UI",
                    }),
                    new TextRun({
                      text: `, ${source.neutral} neu, `,
                      size: 18,
                      color: colors.neutral,
                      font: "Segoe UI",
                    }),
                    new TextRun({
                      text: `${source.negative} neg`,
                      size: 18,
                      color: colors.negative,
                      font: "Segoe UI",
                    }),
                    new TextRun({
                      text: `)`,
                      size: 18,
                      color: colors.neutral,
                      font: "Segoe UI",
                    }),
                  ],
                  spacing: { after: 100 },
                  shading: {
                    type: ShadingType.SOLID,
                    color: index % 2 === 0 ? colors.lightBg : colors.white,
                  },
                }),
            ),

            // Trending Topics Section
            new Paragraph({
              children: [
                new TextRun({
                  text: "🔥 TRENDING TOPICS",
                  size: 24,
                  bold: true,
                  color: colors.neutral,
                  font: "Segoe UI",
                }),
              ],
              spacing: { before: 400, after: 200 },
            }),
            ...reportData.trends.map(
              (trend, index) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${trend.rank}. `,
                      size: 22,
                      bold: true,
                      color: colors.primary,
                      font: "Segoe UI",
                    }),
                    new TextRun({
                      text: trend.keyword,
                      size: 22,
                      color: colors.text,
                      font: "Segoe UI",
                    }),
                    new TextRun({
                      text: `  (${trend.count} mentions)`,
                      size: 20,
                      color: colors.neutral,
                      font: "Segoe UI",
                    }),
                  ],
                  spacing: { after: 100 },
                  shading: {
                    type: ShadingType.SOLID,
                    color: index % 2 === 0 ? colors.lightBg : colors.white,
                  },
                }),
            ),

            // Key Coverage Section
            new Paragraph({
              children: [
                new TextRun({
                  text: "📰 KEY COVERAGE",
                  size: 24,
                  bold: true,
                  color: colors.neutral,
                  font: "Segoe UI",
                }),
              ],
              spacing: { before: 400, after: 200 },
            }),
            ...reportData.articles.flatMap((article) => [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        shading: {
                          type: ShadingType.SOLID,
                          color:
                            article.sentiment === "positive"
                              ? colors.positiveLight
                              : article.sentiment === "negative"
                                ? colors.negativeLight
                                : colors.lightBg,
                        },
                        borders: {
                          top: {
                            style: BorderStyle.SINGLE,
                            size: 8,
                            color:
                              article.sentiment === "positive"
                                ? colors.positive
                                : article.sentiment === "negative"
                                  ? colors.negative
                                  : colors.border,
                          },
                          bottom: {
                            style: BorderStyle.SINGLE,
                            size: 8,
                            color:
                              article.sentiment === "positive"
                                ? colors.positive
                                : article.sentiment === "negative"
                                  ? colors.negative
                                  : colors.border,
                          },
                          left: {
                            style: BorderStyle.SINGLE,
                            size: 8,
                            color:
                              article.sentiment === "positive"
                                ? colors.positive
                                : article.sentiment === "negative"
                                  ? colors.negative
                                  : colors.border,
                          },
                          right: {
                            style: BorderStyle.SINGLE,
                            size: 8,
                            color:
                              article.sentiment === "positive"
                                ? colors.positive
                                : article.sentiment === "negative"
                                  ? colors.negative
                                  : colors.border,
                          },
                        },
                        margins: {
                          top: 150,
                          bottom: 150,
                          left: 150,
                          right: 150,
                        },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: article.sentimentUpper,
                                size: 16,
                                bold: true,
                                color:
                                  article.sentiment === "positive"
                                    ? colors.positive
                                    : article.sentiment === "negative"
                                      ? colors.negative
                                      : colors.neutral,
                                font: "Segoe UI",
                              }),
                              new TextRun({
                                text: `  •  ${article.source}  •  ${article.date}`,
                                size: 16,
                                color: colors.neutral,
                                font: "Segoe UI",
                              }),
                            ],
                            spacing: { after: 60 },
                          }),
                          new Paragraph({
                            children: article.url
                              ? [
                                  new ExternalHyperlink({
                                    link: article.url,
                                    children: [
                                      new TextRun({
                                        text: article.title,
                                        size: 22,
                                        bold: true,
                                        color: colors.primary,
                                        font: "Segoe UI",
                                        underline: {},
                                      }),
                                    ],
                                  }),
                                ]
                              : [
                                  new TextRun({
                                    text: article.title,
                                    size: 22,
                                    bold: true,
                                    color: colors.text,
                                    font: "Segoe UI",
                                  }),
                                ],
                            spacing: { after: 60 },
                          }),
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: article.snippet,
                                size: 20,
                                color: colors.textMuted,
                                font: "Segoe UI",
                              }),
                            ],
                          }),
                          ...(article.url
                            ? [
                                new Paragraph({
                                  children: [
                                    new ExternalHyperlink({
                                      link: article.url,
                                      children: [
                                        new TextRun({
                                          text: "🔗 Read full article",
                                          size: 16,
                                          color: colors.primary,
                                          font: "Segoe UI",
                                          underline: {},
                                        }),
                                      ],
                                    }),
                                  ],
                                  spacing: { before: 60 },
                                }),
                              ]
                            : []),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph({ spacing: { after: 150 }, children: [] }),
            ]),

            // Footer
            new Paragraph({
              children: [
                new TextRun({
                  text: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                  size: 16,
                  color: colors.border,
                }),
              ],
              spacing: { before: 400 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `📊 Generated by Media Monitor  •  ${reportData.generatedDate}`,
                  size: 18,
                  color: colors.neutral,
                  font: "Segoe UI",
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 150 },
            }),
          ],
        },
      ],
    });

    return await Packer.toBlob(doc);
  }

  /**
   * Download the generated report
   */
  downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const carboneService = new CarboneService();
