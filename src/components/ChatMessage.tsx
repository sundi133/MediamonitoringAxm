import { MediaMentionData } from "../types";
import { MentionCard } from "./MentionCard";
import {
  Bot,
  User,
  Download,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Newspaper,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from "docx";
import { useState } from "react";

export interface ChatMessageData {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  mentions?: MediaMentionData[];
  report?: string;
  loading?: boolean;
  searchProgress?: { current: number; total: number; currentKeyword: string };
  isStreamingReport?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
  onDeleteMention?: (id: string) => void;
  highlightedMentionId?: string | null;
}

export function ChatMessage({
  message,
  onDeleteMention,
  highlightedMentionId,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showAllArticles, setShowAllArticles] = useState(false);

  // Show first 5 articles by default, rest on expand
  const INITIAL_ARTICLES_COUNT = 5;
  const hasMoreArticles =
    (message.mentions?.length || 0) > INITIAL_ARTICLES_COUNT;
  const visibleMentions = showAllArticles
    ? message.mentions
    : message.mentions?.slice(0, INITIAL_ARTICLES_COUNT);

  const handleCopyReport = async () => {
    if (!message.report) return;
    await navigator.clipboard.writeText(message.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!message.report) return;

    const blob = new Blob([message.report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `media-monitor-report-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReportAsDocx = async () => {
    if (!message.report) return;

    // Parse markdown and convert to DOCX paragraphs
    const lines = message.report.split("\n");
    const children: any[] = [];

    // Add title
    children.push(
      new Paragraph({
        text: "Media Monitor Analysis Report",
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 },
      }),
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines
      if (!line.trim()) {
        children.push(new Paragraph({ text: "" }));
        continue;
      }

      // H1 - # Heading
      if (line.startsWith("# ")) {
        children.push(
          new Paragraph({
            text: line.replace("# ", ""),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
        );
      }
      // H2 - ## Heading
      else if (line.startsWith("## ")) {
        children.push(
          new Paragraph({
            text: line.replace("## ", ""),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 250, after: 150 },
          }),
        );
      }
      // H3 - ### Heading
      else if (line.startsWith("### ")) {
        children.push(
          new Paragraph({
            text: line.replace("### ", ""),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          }),
        );
      }
      // Bullet list - * or -
      else if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
        const text = line.trim().replace(/^[*-]\s+/, "");
        children.push(
          new Paragraph({
            text: text,
            bullet: { level: 0 },
            spacing: { after: 100 },
          }),
        );
      }
      // Regular paragraph - handle bold **text**
      else {
        // Parse bold text
        const textRuns: TextRun[] = [];
        const parts = line.split(/(\*\*.*?\*\*)/g);

        for (const part of parts) {
          if (part.startsWith("**") && part.endsWith("**")) {
            textRuns.push(
              new TextRun({
                text: part.replace(/\*\*/g, ""),
                bold: true,
              }),
            );
          } else if (part) {
            textRuns.push(new TextRun({ text: part }));
          }
        }

        children.push(
          new Paragraph({
            children: textRuns,
            spacing: { after: 150 },
          }),
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);

    // Use native browser download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `media-monitor-report-${new Date().toISOString().split("T")[0]}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (message.type === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%]">
          <div className="bg-white text-gray-900 p-2 px-5 py-3 rounded-2xl rounded-br-md shadow-sm border border-gray-100">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-4"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
        <Bot className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1 min-w-0 space-y-4">
        {/* Loading State */}
        {message.loading && (
          <div className="space-y-3">
            {/* Typing indicator */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <motion.div
                  className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                />
              </div>
              {message.searchProgress?.currentKeyword && (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {message.searchProgress.currentKeyword}
                </span>
              )}
            </div>

            {/* Progress bar */}
            {message.searchProgress && message.searchProgress.total > 0 && (
              <div className="max-w-sm space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-500">
                  <span>Searching...</span>
                  <span>
                    {Math.round(
                      (message.searchProgress.current /
                        message.searchProgress.total) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(message.searchProgress.current / message.searchProgress.total) * 100}%`,
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Content */}
        {!message.loading && message.content && (
          <div className="max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h3: ({ node, ...props }) => (
                  <h3
                    className="text-[17px] font-bold mt-5 mb-2.5 text-gray-900 dark:text-white tracking-tight"
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    className="text-lg font-bold mt-6 mb-3 text-gray-900 dark:text-white tracking-tight"
                    {...props}
                  />
                ),
                h1: ({ node, ...props }) => (
                  <h1
                    className="text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-white tracking-tight"
                    {...props}
                  />
                ),
                p: ({ node, ...props }) => (
                  <p
                    className="text-[15px] text-gray-800 dark:text-gray-200 leading-[1.7] mb-4 last:mb-0"
                    {...props}
                  />
                ),
                strong: ({ node, ...props }) => (
                  <strong
                    className="font-bold text-gray-900 dark:text-white"
                    {...props}
                  />
                ),
                em: ({ node, ...props }) => (
                  <em
                    className="italic text-gray-700 dark:text-gray-300"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    className="list-disc list-outside mb-4 space-y-2 ml-5 marker:text-indigo-500"
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    className="list-decimal list-outside mb-4 space-y-2 ml-5 marker:text-indigo-500 marker:font-semibold"
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li
                    className="text-[15px] text-gray-800 dark:text-gray-200 leading-[1.7] pl-1"
                    {...props}
                  />
                ),
                code: ({ node, inline, ...props }: any) =>
                  inline ? (
                    <code
                      className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[13px] font-mono text-indigo-600 dark:text-indigo-400 font-medium"
                      {...props}
                    />
                  ) : (
                    <code
                      className="block p-4 bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg text-[13px] font-mono overflow-x-auto mb-4"
                      {...props}
                    />
                  ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-3 border-indigo-500 pl-4 py-1 my-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-r-lg"
                    {...props}
                  />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Report - Show FIRST for better UX */}
        {message.report && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden"
          >
            {/* Report Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Analysis Report
                </span>
                {message.isStreamingReport && (
                  <motion.div
                    className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="w-1.5 h-1.5 bg-indigo-500 rounded-full"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="text-xs">Writing...</span>
                  </motion.div>
                )}
              </div>

              {/* Action buttons */}
              {!message.isStreamingReport && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyReport}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Copy report"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleDownloadReport}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Download as Markdown"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDownloadReportAsDocx}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Download as DOCX"
                  >
                    DOCX
                  </button>
                </div>
              )}
            </div>

            {/* Report Content */}
            <div className="px-6 py-6">
              <div className="max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1
                        className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4 first:mt-0 tracking-tight"
                        {...props}
                      />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2
                        className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-3 tracking-tight"
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3
                        className="text-[16px] font-bold text-gray-800 dark:text-gray-100 mt-5 mb-2 tracking-tight"
                        {...props}
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p
                        className="text-[15px] text-gray-700 dark:text-gray-300 leading-[1.75] mb-4"
                        {...props}
                      />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong
                        className="font-bold text-gray-900 dark:text-white"
                        {...props}
                      />
                    ),
                    em: ({ node, ...props }) => (
                      <em
                        className="italic text-gray-600 dark:text-gray-400"
                        {...props}
                      />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul
                        className="list-disc list-outside space-y-2 mb-4 ml-5 marker:text-indigo-500"
                        {...props}
                      />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol
                        className="list-decimal list-outside space-y-2 mb-4 ml-5 marker:text-indigo-500 marker:font-bold"
                        {...props}
                      />
                    ),
                    li: ({ node, ...props }) => (
                      <li
                        className="text-[15px] text-gray-700 dark:text-gray-300 leading-[1.75] pl-1"
                        {...props}
                      />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-r-lg text-gray-700 dark:text-gray-300"
                        {...props}
                      />
                    ),
                    hr: ({ node, ...props }) => (
                      <hr
                        className="my-6 border-gray-200 dark:border-gray-700"
                        {...props}
                      />
                    ),
                    code: ({ node, inline, ...props }: any) =>
                      inline ? (
                        <code
                          className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[13px] font-mono text-indigo-600 dark:text-indigo-400 font-medium"
                          {...props}
                        />
                      ) : (
                        <code
                          className="block p-4 bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg text-[13px] font-mono overflow-x-auto mb-4"
                          {...props}
                        />
                      ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <table
                          className="min-w-full text-sm divide-y divide-slate-200 dark:divide-slate-700"
                          {...props}
                        />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead
                        className="bg-slate-50 dark:bg-slate-800"
                        {...props}
                      />
                    ),
                    tbody: ({ node, ...props }) => (
                      <tbody
                        className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900"
                        {...props}
                      />
                    ),
                    tr: ({ node, ...props }) => (
                      <tr
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        {...props}
                      />
                    ),
                    th: ({ node, ...props }) => (
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td
                        className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap"
                        {...props}
                      />
                    ),
                  }}
                >
                  {message.report}
                </ReactMarkdown>
              </div>
            </div>

            {/* Report Footer */}
            {!message.isStreamingReport && (
              <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/20">
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Generated{" "}
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Articles Section - Collapsible, shown AFTER report */}
        {message.mentions && message.mentions.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            {/* Articles Header - Clickable to expand/collapse */}
            <button
              onClick={() => setShowAllArticles(!showAllArticles)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Newspaper className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {message.mentions.length} Source Article
                    {message.mentions.length !== 1 ? "s" : ""}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {showAllArticles
                      ? "Click to collapse"
                      : `Showing ${Math.min(INITIAL_ARTICLES_COUNT, message.mentions.length)} of ${message.mentions.length}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasMoreArticles && !showAllArticles && (
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    +{message.mentions.length - INITIAL_ARTICLES_COUNT} more
                  </span>
                )}
                {showAllArticles ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Articles List */}
            <AnimatePresence>
              <motion.div
                initial={false}
                animate={{ height: "auto" }}
                className="border-t border-slate-200 dark:border-slate-700"
              >
                <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                  {visibleMentions?.map((mention) => (
                    <MentionCard
                      key={mention.id}
                      mention={mention}
                      onDelete={onDeleteMention}
                      isHighlighted={highlightedMentionId === mention.id}
                    />
                  ))}
                </div>

                {/* Show more/less button */}
                {hasMoreArticles && (
                  <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3">
                    <button
                      onClick={() => setShowAllArticles(!showAllArticles)}
                      className="w-full py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                      {showAllArticles
                        ? "Show less"
                        : `View all ${message.mentions.length} articles`}
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
