import { MediaMentionData } from "../components/MediaMention";
import { Alert } from "../components/AlertsPanel";
import { MonitoringSource } from "../types/settings";

export const mockSentimentData = [
  { date: "2026-01-01", positive: 45, negative: 12, neutral: 28 },
  { date: "2026-01-02", positive: 52, negative: 8, neutral: 35 },
  { date: "2026-01-03", positive: 38, negative: 18, neutral: 22 },
  { date: "2026-01-04", positive: 41, negative: 15, neutral: 31 },
  { date: "2026-01-05", positive: 49, negative: 6, neutral: 29 },
  { date: "2026-01-06", positive: 44, negative: 22, neutral: 26 },
  { date: "2026-01-07", positive: 55, negative: 9, neutral: 33 },
];

export const mockMentions: MediaMentionData[] = [
  {
    id: "1",
    title: "Tech Company Faces Security Breach Concerns",
    source: "TechNews Daily",
    url: "https://example.com/article1",
    snippet:
      "Recent reports suggest potential vulnerabilities in the company's security infrastructure, raising concerns among users and investors about data protection measures.",
    sentiment: "negative",
    sentimentScore: -0.75,
    publishedAt: "2026-01-07T10:30:00Z",
    entities: ["Security", "Data Protection", "Company"],
    keywords: ["breach", "vulnerability", "security", "concerns"],
  },
  {
    id: "2",
    title: "Industry Leader Announces New Partnership",
    source: "Business Weekly",
    url: "https://example.com/article2",
    snippet:
      "The strategic partnership aims to enhance innovation and deliver better services to customers worldwide, marking a significant milestone in the company's growth.",
    sentiment: "positive",
    sentimentScore: 0.85,
    publishedAt: "2026-01-07T09:15:00Z",
    entities: ["Partnership", "Innovation", "Growth"],
    keywords: ["partnership", "innovation", "growth", "milestone"],
  },
  {
    id: "3",
    title: "Mixed Reviews on Latest Product Launch",
    source: "Product Review Hub",
    url: "https://example.com/article3",
    snippet:
      "While some users praise the innovative features, others criticize the pricing strategy and limited availability, creating divided opinions in the market.",
    sentiment: "neutral",
    sentimentScore: 0.1,
    publishedAt: "2026-01-07T08:45:00Z",
    entities: ["Product Launch", "Pricing", "Market"],
    keywords: ["launch", "features", "pricing", "availability"],
  },
  {
    id: "4",
    title: "Customer Service Issues Spark Social Media Backlash",
    source: "Social Media Monitor",
    url: "https://example.com/article4",
    snippet:
      "Multiple customers report poor response times and unhelpful support staff, leading to viral complaints across social media platforms.",
    sentiment: "negative",
    sentimentScore: -0.82,
    publishedAt: "2026-01-06T16:20:00Z",
    entities: ["Customer Service", "Social Media", "Support"],
    keywords: ["customer service", "response time", "complaints", "support"],
  },
  {
    id: "5",
    title:
      "Hasidim clash with MPs outside military prison, free one draft dodger - Ynetnews",
    source: "Ynetnews",
    url: "https://example.com/article5",
    snippet:
      "After the incident, the military vehicle — apparently carrying about 10 draft dodgers — continued on and eventually reached the prison. One protester was lightly injured by stones and treated at the s...",
    sentiment: "negative",
    sentimentScore: -0.68,
    publishedAt: "2026-01-07T12:00:00Z",
    entities: ["Hasidim", "Ynetnews", "After", "One", "While"],
    keywords: ["assam india dharma", "prison", "draft", "vehicle"],
  },
  {
    id: "6",
    title:
      "Oklahoma prosecutor: No charges after report of explicit images on education chief's TV - Greenwich Time",
    source: "Greenwich Time",
    url: "https://example.com/article6",
    snippet:
      "Oklahoma authorities announced no criminal charges will be filed following reports of explicit images appearing during a state education meeting broadcast.",
    sentiment: "negative",
    sentimentScore: -0.55,
    publishedAt: "2026-01-07T11:30:00Z",
    entities: ["Oklahoma", "prosecutor", "charges", "report", "education"],
    keywords: ["explicit images", "education", "charges", "broadcast"],
  },
];

export const mockAlerts: Alert[] = [
  {
    id: "1",
    title: "High Volume of Negative Mentions Detected",
    message:
      "Security breach concerns have generated 47 negative mentions in the last 2 hours.",
    severity: "high",
    source: "TechNews Daily",
    timestamp: "2026-01-07T10:30:00Z",
    url: "https://example.com/article1",
    dismissed: false,
  },
  {
    id: "2",
    title: "Sentiment Score Drop Alert",
    message:
      "Overall sentiment score has dropped by 15% compared to yesterday.",
    severity: "medium",
    source: "Sentiment Analysis Engine",
    timestamp: "2026-01-07T09:00:00Z",
    dismissed: false,
  },
];

export const initialSources: MonitoringSource[] = [
  { id: "1", name: "Times of India", type: "news", enabled: true },
  { id: "2", name: "Hindustan Times", type: "news", enabled: true },
  { id: "3", name: "Reddit", type: "social", enabled: true },
  { id: "4", name: "Twitter", type: "social", enabled: false },
];

// Initial keywords - comprehensive negative media monitoring keywords for Assam, India
export const initialKeywords = [
  // Core governance & crime
  "corruption",
  "crime",
  "violence",
  "illegal activities",

  // Public unrest & protests
  "protest",
  "protests",
  "student agitation",
  "labor issues",

  // Infrastructure & safety
  "accident",
  "traffic jam",
  "power outage",
  "outage",

  // Environmental & natural disasters
  "pollution",
  "flood",
  "flood damage",
  "cyclone",
  "drought",

  // Social & economic issues
  "unemployment",
  "water issues",
  "farmer problems",

  // Media coverage
  "media",
];

// Full comprehensive keyword base for negative media monitoring
export const availableKeywords = [
  // Governance & Corruption
  "corruption",
  "scam",
  "fraud",
  "bribery",
  "mismanagement",
  "fund misuse",
  "irregularities",
  "illegal tender",
  "nepotism",
  "accountability failure",

  // Law & Order / Crime
  "violence",
  "crime",
  "murder",
  "theft",
  "robbery",
  "sexual harassment",
  "rape case",
  "police brutality",
  "custodial death",
  "trafficking",

  // Protests & Public Unrest
  "protest",
  "strike",
  "bandh",
  "agitation",
  "dharna",
  "unrest",
  "demonstration",
  "farmers protest",
  "labor unrest",
  "student agitation",

  // Infrastructure & Civic Issues
  "potholes",
  "road accident",
  "bridge collapse",
  "building collapse",
  "traffic jam",
  "drainage problem",
  "electricity outage",
  "water shortage",
  "sanitation crisis",
  "flood damage",

  // Social & Environmental Risks
  "deforestation",
  "illegal mining",
  "pollution",
  "cyclone damage",
  "flood relief failure",
  "drought",
  "health crisis",
  "hospital negligence",
  "unemployment",
  "poverty",
];
