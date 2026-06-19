import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import authApp from "./auth.ts";
import llmApp from "./llm.ts";
import settingsApp from "./settings.ts";
import dataApp from "./data.ts";
import conversationApp from "./conversation.ts";
import tavilyApp from "./tavily.ts";
import carboneApp from "./carbone.ts";

const app = new Hono();

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-211993fd/health", (c) => {
  return c.json({ status: "ok" });
});

// Mount auth routes
app.route("/make-server-211993fd", authApp);

// Mount LLM routes
app.route("/make-server-211993fd", llmApp);

// Mount settings routes
app.route("/make-server-211993fd", settingsApp);

// Mount data routes
app.route("/make-server-211993fd", dataApp);

// Mount conversation routes
app.route("/make-server-211993fd", conversationApp);

// Mount Tavily routes
app.route("/make-server-211993fd", tavilyApp);

// Mount Carbone routes
app.route("/make-server-211993fd", carboneApp);

Deno.serve(app.fetch);
