import {
  useState,
  useRef,
  useEffect,
  useDeferredValue,
  memo,
  useCallback,
} from "react";
import { ChatMessage, ChatMessageData } from "./ChatMessage";
import { MediaMentionData } from "../types";
import { ArrowUp, RotateCcw, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { conversationService } from "../services/conversationService";
import {
  chatHistoryService,
  SavedConversation,
} from "../services/chatHistoryService";
import { ConversationSidebar } from "./ConversationSidebar";
import { toast } from "sonner@2.0.3";

// Isolated input component that doesn't re-render when parent updates
const ChatInput = memo(function ChatInput({
  onSubmit,
  loading,
}: {
  onSubmit: (value: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || loading) return;
    onSubmit(value.trim());
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 shadow-sm focus-within:border-indigo-400 dark:focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:shadow-md transition-all duration-150">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask about news in Assam..."
          disabled={loading}
          className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-[15px]"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!value.trim() || loading}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-150"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 dark:border-slate-500 dark:border-t-white rounded-full animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </form>
  );
});

interface ChatInterfaceProps {
  onSearch: (
    query: string,
    timeRange?: "hour" | "day" | "week" | "month",
  ) => Promise<void>;
  searchReport?: string;
  currentSearchQuery?: string;
  filteredMentions: MediaMentionData[];
  loading: boolean;
  onDeleteMention: (id: string) => void;
  highlightedMentionId?: string | null;
  searchProgress?: { current: number; total: number; currentKeyword: string };
  isStreamingReport?: boolean;
}

export function ChatInterface({
  onSearch,
  searchReport,
  currentSearchQuery,
  filteredMentions,
  loading,
  onDeleteMention,
  highlightedMentionId,
  searchProgress,
  isStreamingReport,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentLoadingId, setCurrentLoadingId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>(
    () => `conv-${Date.now()}`,
  );
  const [savedConversations, setSavedConversations] = useState<
    SavedConversation[]
  >(() => chatHistoryService.getAll());
  const skipNextSaveRef = useRef(false);

  // Auto-save conversation when messages change (debounced via effect)
  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (messages.length > 0 && !messages.some((m) => m.loading)) {
      chatHistoryService.save(conversationId, messages);
      setSavedConversations(chatHistoryService.getAll());
    }
  }, [messages, conversationId]);

  const handleSelectConversation = useCallback((id: string) => {
    const saved = chatHistoryService.get(id);
    if (saved) {
      const restoredMessages = saved.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      conversationService.clearConversation();
      skipNextSaveRef.current = true;
      setMessages(restoredMessages);
      setConversationId(id);
      setCurrentLoadingId(null);
    }
  }, []);

  const handleNewConversation = useCallback(() => {
    conversationService.clearConversation();
    setMessages([]);
    setCurrentLoadingId(null);
    setConversationId(`conv-${Date.now()}`);
  }, []);

  const handleDeleteConversation = useCallback(
    (id: string) => {
      chatHistoryService.delete(id);
      setSavedConversations(chatHistoryService.getAll());
      if (id === conversationId) {
        handleNewConversation();
      }
    },
    [conversationId, handleNewConversation],
  );

  // Use deferred values to prevent blocking input during updates
  const deferredSearchReport = useDeferredValue(searchReport);
  const deferredSearchProgress = useDeferredValue(searchProgress);
  const deferredFilteredMentions = useDeferredValue(filteredMentions);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update conversation service when articles change (using deferred value)
  useEffect(() => {
    if (currentSearchQuery && deferredFilteredMentions.length > 0) {
      conversationService.setCurrentArticles(
        deferredFilteredMentions,
        currentSearchQuery,
      );
    }
  }, [deferredFilteredMentions, currentSearchQuery]);

  // Update the loading message with search progress (using deferred value)
  useEffect(() => {
    if (loading && deferredSearchProgress && currentLoadingId) {
      setMessages((prev) => {
        return prev.map((msg) =>
          msg.id === currentLoadingId
            ? { ...msg, searchProgress: deferredSearchProgress }
            : msg,
        );
      });
    }
  }, [loading, deferredSearchProgress, currentLoadingId]);

  // Update messages when search results come in
  useEffect(() => {
    if (currentSearchQuery && !loading && currentLoadingId) {
      setMessages((prev) => {
        const updated = prev.filter((m) => m.id !== currentLoadingId);

        // Add assistant response with results
        const assistantMessage: ChatMessageData = {
          id: `assistant-${Date.now()}`,
          type: "assistant",
          content:
            deferredFilteredMentions.length > 0
              ? `I found ${deferredFilteredMentions.length} article${deferredFilteredMentions.length !== 1 ? "s" : ""} about "${currentSearchQuery}".`
              : `I couldn't find any articles matching "${currentSearchQuery}". Try a different query or broader terms.`,
          timestamp: new Date(),
          mentions:
            deferredFilteredMentions.length > 0
              ? deferredFilteredMentions
              : undefined,
        };

        return [...updated, assistantMessage];
      });
      setCurrentLoadingId(null);
    }
  }, [loading, currentSearchQuery, deferredFilteredMentions, currentLoadingId]);

  // Add report to the last assistant message (using deferred value)
  useEffect(() => {
    if (deferredSearchReport !== undefined && currentSearchQuery) {
      setMessages((prev) => {
        const lastAssistantIndex = prev.findLastIndex(
          (m) => m.type === "assistant" && m.mentions,
        );
        if (lastAssistantIndex !== -1) {
          const updated = [...prev];
          const isStreaming = deferredSearchReport !== "" && loading;

          updated[lastAssistantIndex] = {
            ...updated[lastAssistantIndex],
            report: deferredSearchReport || undefined,
            isStreamingReport: isStreamingReport || isStreaming,
          };
          return updated;
        }
        return prev;
      });
    }
  }, [deferredSearchReport, currentSearchQuery, loading, isStreamingReport]);

  // Stable callback for input submission
  const handleInputSubmit = useCallback(
    async (userQuery: string) => {
      if (!userQuery || loading) return;

      const userMessage: ChatMessageData = {
        id: `user-${Date.now()}`,
        type: "user",
        content: userQuery,
        timestamp: new Date(),
      };

      const loadingId = `loading-${Date.now()}`;
      const loadingMessage: ChatMessageData = {
        id: loadingId,
        type: "assistant",
        content: "",
        timestamp: new Date(),
        loading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      try {
        // Use conversation service to decide what to do
        const response = await conversationService.chat(userQuery);

        if (response.requiresSearch && response.searchQuery) {
          // LLM wants to search - extract query and search with detected time range
          setCurrentLoadingId(loadingId);
          await onSearch(response.searchQuery, response.timeRange || "day");
          // The useEffect will handle adding the search results message
        } else {
          // LLM responded without needing to search
          setMessages((prev) => {
            const updated = prev.filter((m) => m.id !== loadingId);
            return [
              ...updated,
              {
                id: `assistant-${Date.now()}`,
                type: "assistant",
                content: response.message,
                timestamp: new Date(),
              },
            ];
          });
        }
      } catch (error) {
        console.error("Chat error:", error);
        setMessages((prev) => {
          const updated = prev.filter((m) => m.id !== loadingId);
          return [
            ...updated,
            {
              id: `error-${Date.now()}`,
              type: "assistant",
              content: "Sorry, I encountered an error. Please try again.",
              timestamp: new Date(),
            },
          ];
        });
        setCurrentLoadingId(null);
      }
    },
    [loading, onSearch],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      handleInputSubmit(suggestion);
    },
    [handleInputSubmit],
  );

  const suggestions = [
    { text: "Recent news about Assam", icon: "📰" },
    { text: "Cyclone updates", icon: "🌀" },
    { text: "Agriculture developments", icon: "🌾" },
    { text: "Tourism news", icon: "✈️" },
  ];

  const handleClearConversation = () => {
    handleNewConversation();
    toast.success("New conversation started!");
  };

  const isEmptyState = messages.length === 0;

  return (
    <div className="flex h-full bg-white dark:bg-slate-950">
      {/* Conversation History Sidebar */}
      <ConversationSidebar
        conversations={savedConversations}
        activeConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="max-w-5xl mx-auto px-6 py-8 w-full flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              {isEmptyState ? (
                /* Empty State - Welcome Screen */
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center flex-1"
                >
                  {/* Logo */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="mb-6"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                  </motion.div>

                  {/* Title */}
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl font-semibold text-slate-900 dark:text-white mb-2"
                  >
                    How can I help you today?
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-slate-500 dark:text-slate-400 mb-8 text-center max-w-md"
                  >
                    Search and analyze news from Assam, India
                  </motion.p>

                  {/* Suggestions */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 gap-4 w-full max-w-xl"
                  >
                    {suggestions.map((suggestion, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSuggestionClick(suggestion.text)}
                        className="flex flex-col items-center justify-center gap-3 px-4 py-6 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 hover:shadow-sm transition-all duration-150"
                      >
                        <span className="text-2xl">{suggestion.icon}</span>
                        <span className="font-medium">{suggestion.text}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                </motion.div>
              ) : (
                /* Chat Messages */
                <motion.div
                  key="messages"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6 pb-4"
                >
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onDeleteMention={onDeleteMention}
                      highlightedMentionId={highlightedMentionId}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            {/* Clear conversation button */}
            {messages.length > 0 && (
              <div className="flex justify-center mb-3">
                <button
                  onClick={handleClearConversation}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  New conversation
                </button>
              </div>
            )}

            {/* Input Container - Isolated component for performance */}
            <ChatInput onSubmit={handleInputSubmit} loading={loading} />

            {/* Footer text */}
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-3">
              Media Monitor searches news across Assam, India
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
