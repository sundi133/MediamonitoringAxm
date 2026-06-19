import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const dataApp = new Hono();

// Helper to create authenticated Supabase client from access token
function createAuthenticatedClient(accessToken: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

// Get user data (mentions and alerts)
dataApp.get("/data", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const accessToken = authHeader?.split(" ")[1];

    if (!accessToken) {
      console.log("No authorization token provided");
      return c.json({ error: "Authorization token required" }, 401);
    }

    // Create client with the user's access token
    const supabase = createAuthenticatedClient(accessToken);

    // Get the user from the session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.log("Authorization error:", error?.message || "No user");
      return c.json(
        { error: "Unauthorized", details: error?.message || "No user found" },
        401,
      );
    }

    console.log("User authenticated successfully:", user.id);

    // Get user data from KV store
    const dataKey = `user_data:${user.id}`;
    const data = await kv.get(dataKey);

    if (!data) {
      // Return default empty data
      return c.json({
        mentions: [],
        alerts: [],
        lastFetchTime: null,
      });
    }

    return c.json(data);
  } catch (error: unknown) {
    console.error("Error getting user data:", error);
    return c.json({ error: "Failed to get data" }, 500);
  }
});

// Save user data (mentions and alerts)
dataApp.post("/data", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const accessToken = authHeader?.split(" ")[1];

    if (!accessToken) {
      console.log("ERROR: No authorization token provided");
      return c.json(
        { error: "Unauthorized", details: "Authorization token required" },
        401,
      );
    }

    // Create client with the user's access token
    const supabase = createAuthenticatedClient(accessToken);

    // Get the user from the session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.log("ERROR: Authorization failed");
      return c.json(
        {
          error: "Unauthorized",
          details: error?.message || "Auth session missing!",
        },
        401,
      );
    }

    console.log("User authenticated successfully for data save:", user.id);

    const body = await c.req.json();
    const { mentions, alerts, lastFetchTime } = body;

    if (!Array.isArray(mentions) && !Array.isArray(alerts)) {
      return c.json({ error: "Invalid data format" }, 400);
    }

    // Save user data to KV store
    const dataKey = `user_data:${user.id}`;
    await kv.set(dataKey, {
      mentions: mentions || [],
      alerts: alerts || [],
      lastFetchTime: lastFetchTime || null,
      updatedAt: new Date().toISOString(),
    });

    console.log("Data saved successfully for user:", user.id, {
      mentionsCount: mentions?.length || 0,
      alertsCount: alerts?.length || 0,
    });

    return c.json({
      success: true,
      message: "Data saved successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("EXCEPTION in save data:", error);
    return c.json(
      {
        error: "Failed to save data",
        details: errorMessage,
      },
      500,
    );
  }
});

// Get user keyword reports
dataApp.get("/reports", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const accessToken = authHeader?.split(" ")[1];

    if (!accessToken) {
      console.log("No authorization token provided");
      return c.json({ error: "Authorization token required" }, 401);
    }

    // Create client with the user's access token
    const supabase = createAuthenticatedClient(accessToken);

    // Get the user from the session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.log("Authorization error:", error?.message || "No user");
      return c.json(
        { error: "Unauthorized", details: error?.message || "No user found" },
        401,
      );
    }

    console.log("Loading reports for user:", user.id);

    // Get user reports from KV store
    const reportsKey = `user_reports:${user.id}`;
    const reports = await kv.get(reportsKey);

    if (!reports) {
      // Return empty array if no reports exist
      return c.json({
        reports: [],
      });
    }

    console.log(
      `Loaded ${reports.reports?.length || 0} reports for user:`,
      user.id,
    );
    return c.json(reports);
  } catch (error: unknown) {
    console.error("Error getting user reports:", error);
    return c.json({ error: "Failed to get reports" }, 500);
  }
});

// Save user keyword reports
dataApp.post("/reports", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const accessToken = authHeader?.split(" ")[1];

    if (!accessToken) {
      console.log("ERROR: No authorization token provided");
      return c.json(
        { error: "Unauthorized", details: "Authorization token required" },
        401,
      );
    }

    // Create client with the user's access token
    const supabase = createAuthenticatedClient(accessToken);

    // Get the user from the session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.log("ERROR: Authorization failed");
      return c.json(
        {
          error: "Unauthorized",
          details: error?.message || "Auth session missing!",
        },
        401,
      );
    }

    console.log("User authenticated successfully for reports save:", user.id);

    const body = await c.req.json();
    const { reports } = body;

    if (!Array.isArray(reports)) {
      return c.json({ error: "Invalid reports format" }, 400);
    }

    // Save user reports to KV store
    const reportsKey = `user_reports:${user.id}`;
    await kv.set(reportsKey, {
      reports: reports || [],
      updatedAt: new Date().toISOString(),
    });

    console.log("Reports saved successfully for user:", user.id, {
      reportsCount: reports?.length || 0,
    });

    return c.json({
      success: true,
      message: "Reports saved successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("EXCEPTION in save reports:", error);
    return c.json(
      {
        error: "Failed to save reports",
        details: errorMessage,
      },
      500,
    );
  }
});

// Fetch og:image metadata from article URLs
dataApp.post("/fetch-og-image", async (c) => {
  try {
    const { url } = await c.req.json();

    if (!url) {
      return c.json({ error: "URL is required" }, 400);
    }

    console.log(`Fetching og:image for: ${url}`);

    // Fetch the HTML page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MediaMonitor/1.0)",
      },
    });

    if (!response.ok) {
      console.log(`Failed to fetch URL: ${response.status}`);
      return c.json({ image: null });
    }

    const html = await response.text();

    // Extract og:image using regex
    const ogImageMatch =
      html.match(
        /<meta[^>]*property=[\"']og:image[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>/i,
      ) ||
      html.match(
        /<meta[^>]*content=[\"']([^\"']+)[\"'][^>]*property=[\"']og:image[\"'][^>]*>/i,
      );

    let imageUrl = ogImageMatch ? ogImageMatch[1] : null;

    // If no og:image, try to find twitter:image
    if (!imageUrl) {
      const twitterImageMatch =
        html.match(
          /<meta[^>]*name=[\"']twitter:image[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>/i,
        ) ||
        html.match(
          /<meta[^>]*content=[\"']([^\"']+)[\"'][^>]*name=[\"']twitter:image[\"'][^>]*>/i,
        );
      imageUrl = twitterImageMatch ? twitterImageMatch[1] : null;
    }

    // Make relative URLs absolute
    if (imageUrl && !imageUrl.startsWith("http")) {
      const urlObj = new URL(url);
      if (imageUrl.startsWith("//")) {
        imageUrl = urlObj.protocol + imageUrl;
      } else if (imageUrl.startsWith("/")) {
        imageUrl = urlObj.origin + imageUrl;
      } else {
        imageUrl = urlObj.origin + "/" + imageUrl;
      }
    }

    console.log(`Found image: ${imageUrl || "none"}`);
    return c.json({ image: imageUrl });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching og:image:", errorMessage);
    return c.json({ image: null });
  }
});

export default dataApp;
