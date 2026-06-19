import { MediaMentionData } from "../components/MediaMention";
import { projectId, publicAnonKey } from "../utils/supabase/info";

// Tavily API calls are now made through the server-side endpoint
// to avoid bundling Node.js-only dependencies in the browser

interface TavilyResponse {
  query: string;
  follow_up_questions?: string[];
  answer: string;
  images: string[];
  results: TavilyResult[];
  response_time: number;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  raw_content: string;
  score: number;
  published_date: string;
}

export class TavilyService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-211993fd`;
  }

  async searchNews(
    query: string,
    options: {
      timeRange?: "day" | "week" | "month";
      country?: string;
      includeDomains?: string[];
      maxResults?: number;
    } = {},
  ): Promise<TavilyResponse> {
    const {
      timeRange = "week",
      country = "india", // Always search within India only for localized monitoring
      includeDomains,
      maxResults = 50,
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/tavily/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          query,
          maxResults,
          timeRange,
          country,
          includeDomains,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            "Rate limit exceeded. Please wait before making more requests.",
          );
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Tavily search failed");
      }

      console.log(
        `🖼️ Tavily returned ${data.images?.length || 0} images for query: "${query}"`,
      );

      return {
        query: data.query,
        answer: data.answer,
        images: data.images || [],
        results: data.results || [],
        response_time: data.response_time,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("429")) {
        throw new Error(
          "Rate limit exceeded. Please wait before making more requests.",
        );
      }
      console.error("Tavily API request failed:", error);
      throw error;
    }
  }

  // Add "issues" to keywords for negative monitoring
  // Keywords are already prefixed with "assam india" before reaching this method
  enhanceKeywordForNegativeMonitoring(keyword: string): string {
    const negativeTerms = [
      "issues",
      "problems",
      "concerns",
      "crisis",
      "scandal",
    ];

    // If keyword already contains negative terms, return as is
    if (negativeTerms.some((term) => keyword.toLowerCase().includes(term))) {
      return keyword;
    }

    // Add "issues" to make it focus on negative news
    return `${keyword} issues`;
  }

  // Analyze sentiment using LLM (GPT-4o-mini) via backend API for accurate sentiment classification
  private async analyzeSentimentWithLLM(
    content: string,
    title: string,
  ): Promise<{
    sentiment: "positive" | "negative" | "neutral";
    score: number;
  }> {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/llm/analyze-sentiment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            title,
            content: content.substring(0, 1000), // Limit to 1000 chars for efficiency
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Sentiment analysis failed");
      }

      return {
        sentiment: data.sentiment,
        score: data.score,
      };
    } catch (error) {
      // Only log error once per batch to avoid console spam
      if (Math.random() < 0.1) {
        // Log ~10% of errors
        console.warn(
          "LLM sentiment analysis unavailable, using keyword-based fallback",
        );
      }
      // Fallback to simple keyword-based analysis
      return this.analyzeSentimentFallback(content, title);
    }
  }

  // Fallback sentiment analysis (simple keyword-based)
  private analyzeSentimentFallback(
    content: string,
    title: string,
  ): {
    sentiment: "positive" | "negative" | "neutral";
    score: number;
  } {
    const text = (title + " " + content).toLowerCase();

    const negativeWords = [
      "issue",
      "problem",
      "concern",
      "crisis",
      "scandal",
      "breach",
      "fail",
      "error",
      "bug",
      "vulnerability",
      "hack",
      "leak",
      "down",
      "outage",
      "criticism",
      "complaint",
      "lawsuit",
      "controversy",
      "dispute",
      "allegation",
      "investigation",
      "fraud",
      "abuse",
      "violence",
      "danger",
      "threat",
      "risk",
      "warning",
      "alert",
      "emergency",
    ];

    let negativeCount = 0;

    negativeWords.forEach((word) => {
      if (text.includes(word)) negativeCount++;
    });

    const totalWords = text.split(" ").length;
    const negativeScore = negativeCount / Math.max(totalWords * 0.01, 1);

    if (negativeCount > 0 && negativeScore > 0.1) {
      return {
        sentiment: "negative",
        score: -Math.min(negativeScore, 1),
      };
    } else {
      return {
        sentiment: "neutral",
        score: 0,
      };
    }
  }

  // Check if article is Assam-related (not from other Indian states)
  private isAssamRelated(content: string, title: string): boolean {
    const text = (title + " " + content).toLowerCase();

    // List of other major Indian states and their cities (to exclude)
    const otherStates = [
      // States
      "maharashtra",
      "mumbai",
      "pune",
      "nagpur",
      "delhi",
      "new delhi",
      "karnataka",
      "bangalore",
      "bengaluru",
      "mysore",
      "tamil nadu",
      "chennai",
      "coimbatore",
      "madurai",
      "west bengal",
      "kolkata",
      "calcutta",
      "gujarat",
      "ahmedabad",
      "surat",
      "vadodara",
      "rajasthan",
      "jaipur",
      "jodhpur",
      "udaipur",
      "uttar pradesh",
      "lucknow",
      "kanpur",
      "agra",
      "varanasi",
      "madhya pradesh",
      "bhopal",
      "indore",
      "gwalior",
      "andhra pradesh",
      "hyderabad",
      "visakhapatnam",
      "vijayawada",
      "telangana",
      "hyderabad",
      "kerala",
      "thiruvananthapuram",
      "kochi",
      "kozhikode",
      "punjab",
      "chandigarh",
      "ludhiana",
      "amritsar",
      "haryana",
      "gurgaon",
      "gurugram",
      "faridabad",
      "bihar",
      "patna",
      "gaya",
      "orissa",
      "bhubaneswar",
      "cuttack",
      "puri",
      "rourkela",
      "sambalpur",
      "berhampur",
      "jharkhand",
      "ranchi",
      "jamshedpur",
      "uttarakhand",
      "dehradun",
      "haridwar",
      "himachal pradesh",
      "shimla",
      "manali",
      "chhattisgarh",
      "raipur",
      "bilaspur",
      "goa",
      "panaji",
      "jammu and kashmir",
      "srinagar",
      "jammu",
      "meghalaya",
      "shillong",
      "manipur",
      "imphal",
      "tripura",
      "agartala",
      "mizoram",
      "aizawl",
      "nagaland",
      "kohima",
      "arunachal pradesh",
      "itanagar",
      "sikkim",
      "gangtok",
    ];

    // Assam keywords (must have at least one)
    const assamKeywords = [
      "assam",
      "guwahati",
      "dispur",
      "dibrugarh",
      "silchar",
      "jorhat",
      "nagaon",
      "tinsukia",
      "tezpur",
      "bongaigaon",
      "nalbari",
      "barpeta",
      "goalpara",
      "dhubri",
      "karimganj",
      "hailakandi",
      "sivasagar",
      "golaghat",
      "lakhimpur",
      "dhemaji",
      "sonitpur",
      "morigaon",
      "kokrajhar",
      "kamrup",
      "cachar",
      "hojai",
      "diphu",
      "haflong",
      "mangaldoi",
      "rangia",
      "biswanath",
      "majuli",
      "udalguri",
      "baksa",
      "chirang",
    ];

    // Check if article mentions other states (exclude these)
    const mentionsOtherStates = otherStates.some((state) => {
      // Use word boundaries to avoid false matches
      const regex = new RegExp(`\\b${state}\\b`, "i");
      return regex.test(text);
    });

    // Check if article mentions Assam (include these)
    const mentionsAssam = assamKeywords.some((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      return regex.test(text);
    });

    // Only include if it mentions Assam AND doesn't prominently mention other states
    return mentionsAssam && !mentionsOtherStates;
  }

  // Extract entities from content (simple implementation)
  private extractEntities(content: string, title: string): string[] {
    const text = title + " " + content;
    const entities: Set<string> = new Set();

    // Simple entity extraction - look for capitalized words
    const words = text.split(/\s+/);
    const capitalizedWords = words.filter(
      (word) =>
        /^[A-Z][a-z]+/.test(word) &&
        word.length > 2 &&
        !["The", "This", "That", "They", "There", "Then"].includes(word),
    );

    capitalizedWords.forEach((word) => {
      if (entities.size < 5) {
        // Limit to 5 entities
        entities.add(word);
      }
    });

    return Array.from(entities);
  }

  // Extract keywords from content
  private extractKeywords(
    content: string,
    title: string,
    originalKeyword: string,
  ): string[] {
    const text = (title + " " + content).toLowerCase();
    const words = text.split(/\W+/).filter((word) => word.length > 3);

    const commonWords = new Set([
      "this",
      "that",
      "with",
      "have",
      "will",
      "from",
      "they",
      "been",
      "said",
      "each",
      "which",
      "their",
      "time",
      "were",
      "than",
      "only",
      "its",
      "now",
    ]);

    const wordCount = new Map<string, number>();
    words.forEach((word) => {
      if (!commonWords.has(word)) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    const topKeywords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([word]) => word);

    // Always include the original keyword if not already present
    if (!topKeywords.includes(originalKeyword.toLowerCase())) {
      topKeywords.unshift(originalKeyword.toLowerCase());
    }

    return topKeywords.slice(0, 4);
  }

  async transformToMediaMention(
    tavilyResult: TavilyResult,
    originalKeyword: string,
    index: number,
    images?: string[], // Add images array from Tavily response
  ): Promise<MediaMentionData> {
    const { sentiment, score } = await this.analyzeSentimentWithLLM(
      tavilyResult.content,
      tavilyResult.title,
    );
    const entities = this.extractEntities(
      tavilyResult.content,
      tavilyResult.title,
    );
    const keywords = this.extractKeywords(
      tavilyResult.content,
      tavilyResult.title,
      originalKeyword,
    );

    // Extract domain name as source
    let source = "Unknown Source";
    try {
      const domain = new URL(tavilyResult.url).hostname;
      source = domain.replace("www.", "").split(".")[0];
      source = source.charAt(0).toUpperCase() + source.slice(1);
    } catch (e) {
      // Keep default source if URL parsing fails
    }

    // Try to get an image - prefer images from the result or use from the images array
    let image: string | undefined;
    if (images && images.length > index) {
      image = images[index];
    } else if (images && images.length > 0) {
      // Use first available image if index is out of range
      image = images[0];
    }

    // Ensure image is a string, not an object
    if (image && typeof image !== "string") {
      console.warn("Image is not a string, converting:", image);
      image = String(image);
    }

    // Validate image is a proper URL
    if (image && !image.startsWith("http")) {
      console.warn("Image is not a valid URL, discarding:", image);
      image = undefined;
    }

    // Debug log for image assignment
    if (index === 0 && images) {
      console.log(
        `🖼️ Image assignment: Total images=${images.length}, Using image at index ${index}: ${image ? "Yes" : "No"}`,
      );
    }

    const publishedDate =
      tavilyResult.published_date || new Date().toISOString();

    return {
      id: `tavily-${Date.now()}-${index}`,
      title: tavilyResult.title,
      source,
      url: tavilyResult.url,
      snippet:
        tavilyResult.content.substring(0, 400) +
        (tavilyResult.content.length > 400 ? "..." : ""),
      sentiment,
      sentimentScore: score,
      publishedAt: publishedDate,
      publishedDate: publishedDate, // Keep both for backwards compatibility
      entities,
      keywords,
      image,
    };
  }

  // Fetch media mentions with Assam-focused localization
  // All keywords are automatically prefixed with "assam india" for better regional targeting
  async fetchMediaMentions(
    keywords: string[],
    timeRange: "hour" | "day" | "week" | "month" = "week",
    onProgress?: (
      current: number,
      total: number,
      currentKeyword: string,
    ) => void,
  ): Promise<MediaMentionData[]> {
    const allMentions: MediaMentionData[] = [];
    console.log(keywords);

    // Determine API time range (API doesn't support 'hour', so use 'day')
    const apiTimeRange = timeRange === "hour" ? "day" : timeRange;

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];

      // Report progress before starting this keyword
      if (onProgress) {
        onProgress(i + 1, keywords.length, keyword);
      }

      try {
        // Prepend "assam india" to all keywords for better localized search
        const localizedKeyword = `assam india ${keyword}`;
        // const enhancedQuery = this.enhanceKeywordForNegativeMonitoring(localizedKeyword);
        // Search configuration matching Python client example:
        // country="india" ensures India-only search for localized monitoring
        // Search across ALL available domains for comprehensive coverage
        const response = await this.searchNews(localizedKeyword, {
          maxResults: 100, // Increased limit for better coverage across all domains
          country: "india", // Explicitly set to India for this search
          timeRange: apiTimeRange,
          // No domain restrictions - search all available domains within India
        });

        console.log(
          `📊 Tavily returned ${response.results.length} results for \"${keyword}\"`,
        );

        const mentionPromises = response.results.map((result, index) =>
          this.transformToMediaMention(
            result,
            localizedKeyword,
            index,
            response.images, // Pass images array from Tavily response
          ),
        );

        const mentions = await Promise.all(mentionPromises);

        // Filter to only include Assam-related articles (exclude other Indian states)
        const assamMentions = mentions.filter((mention) =>
          this.isAssamRelated(mention.snippet, mention.title),
        );

        console.log(
          `✅ Kept ${assamMentions.length}/${mentions.length} Assam-related articles for \"${keyword}\"`,
        );

        allMentions.push(...assamMentions);
      } catch (error) {
        console.error(
          `Failed to fetch mentions for keyword \"${keyword}\":`,
          error,
        );
        // Continue with other keywords even if one fails
      }
    }

    // Strictly filter by time range (Tavily's days param is not strict)
    const now = Date.now();
    let cutoffTime: number;

    switch (timeRange) {
      case "hour":
        cutoffTime = now - 60 * 60 * 1000; // 1 hour
        break;
      case "day":
        cutoffTime = now - 24 * 60 * 60 * 1000; // 24 hours
        break;
      case "week":
        cutoffTime = now - 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
      case "month":
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000; // 30 days
        break;
      default:
        cutoffTime = now - 24 * 60 * 60 * 1000; // Default to 24 hours
    }

    const cutoffDate = new Date(cutoffTime);
    const filteredByTime = allMentions.filter(
      (m) => new Date(m.publishedAt) >= cutoffDate,
    );

    console.log(
      `⏱️ Time filter (${timeRange}): ${allMentions.length} → ${filteredByTime.length} articles (cutoff: ${cutoffDate.toISOString()})`,
    );

    // Sort by published date (newest first)
    return filteredByTime.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }

  // Search based on user's natural language query
  async searchByQuery(
    query: string,
    timeRange: "hour" | "day" | "week" | "month" = "day",
  ): Promise<MediaMentionData[]> {
    try {
      // Add "assam india" to the query for localized search
      const localizedQuery = `assam india ${query}`;

      console.log(`🔍 Searching for: "${localizedQuery}"`);

      // Determine API time range
      const apiTimeRange = timeRange === "hour" ? "day" : timeRange;

      const response = await this.searchNews(localizedQuery, {
        maxResults: 100,
        country: "india",
        timeRange: apiTimeRange,
      });

      console.log(`📊 Tavily returned ${response.results.length} results`);

      const mentionPromises = response.results.map((result, index) =>
        this.transformToMediaMention(
          result,
          localizedQuery,
          index,
          response.images,
        ),
      );

      const mentions = await Promise.all(mentionPromises);

      // Filter to only include Assam-related articles (exclude other Indian states)
      const assamMentions = mentions.filter((mention) =>
        this.isAssamRelated(mention.snippet, mention.title),
      );

      console.log(
        `✅ Processed ${assamMentions.length}/${mentions.length} Assam-related articles`,
      );

      // Strictly filter by time range (Tavily's days param is not strict)
      const now = Date.now();
      let cutoffTime: number;

      switch (timeRange) {
        case "hour":
          cutoffTime = now - 60 * 60 * 1000; // 1 hour
          break;
        case "day":
          cutoffTime = now - 24 * 60 * 60 * 1000; // 24 hours
          break;
        case "week":
          cutoffTime = now - 7 * 24 * 60 * 60 * 1000; // 7 days
          break;
        case "month":
          cutoffTime = now - 30 * 24 * 60 * 60 * 1000; // 30 days
          break;
        default:
          cutoffTime = now - 24 * 60 * 60 * 1000; // Default to 24 hours
      }

      const cutoffDate = new Date(cutoffTime);
      const filteredByTime = assamMentions.filter(
        (m) => new Date(m.publishedAt) >= cutoffDate,
      );

      console.log(
        `⏱️ Time filter (${timeRange}): ${assamMentions.length} → ${filteredByTime.length} articles (cutoff: ${cutoffDate.toISOString()})`,
      );

      // Sort by published date (newest first)
      return filteredByTime.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    } catch (error) {
      console.error("Failed to search by query:", error);
      throw error;
    }
  }

  // Fetch og:image for a single article URL
  async fetchOgImage(url: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-211993fd/fetch-og-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ url }),
        },
      );

      const data = await response.json();
      return data.image || null;
    } catch (error) {
      console.error(`Failed to fetch og:image for ${url}:`, error);
      return null;
    }
  }

  // Enrich articles with og:images
  async enrichWithImages(
    mentions: MediaMentionData[],
  ): Promise<MediaMentionData[]> {
    console.log(`🖼️ Enriching ${mentions.length} articles with og:images...`);

    // Count existing images
    const existingImages = mentions.filter((m) => m.image).length;
    console.log(
      `📊 ${existingImages} articles already have images from Tavily`,
    );

    // Fetch images in batches of 5 to avoid overwhelming the server
    const batchSize = 5;
    const enrichedMentions: MediaMentionData[] = [];

    for (let i = 0; i < mentions.length; i += batchSize) {
      const batch = mentions.slice(i, i + batchSize);
      const enrichedBatch = await Promise.all(
        batch.map(async (mention) => {
          // Skip if image already exists
          if (mention.image) {
            console.log(
              `✅ Using existing image for: ${mention.title.substring(0, 50)}...`,
            );
            return mention;
          }

          console.log(
            `🔍 Fetching og:image for: ${mention.title.substring(0, 50)}...`,
          );
          const image = await this.fetchOgImage(mention.url);
          if (image) {
            console.log(`✅ Found og:image: ${image.substring(0, 80)}...`);
          } else {
            console.log(`❌ No og:image found`);
          }
          return {
            ...mention,
            image: image || undefined,
          };
        }),
      );
      enrichedMentions.push(...enrichedBatch);

      // Small delay between batches
      if (i + batchSize < mentions.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const withImages = enrichedMentions.filter((m) => m.image).length;
    console.log(
      `✅ Final count: ${withImages}/${mentions.length} articles have images`,
    );

    return enrichedMentions;
  }
}

export const tavilyService = new TavilyService();
