import { ChatMessageData } from "../components/ChatMessage";

export interface SavedConversation {
  id: string;
  title: string;
  messages: ChatMessageData[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "media-monitor-chat-history";
const MAX_CONVERSATIONS = 50;

function loadAll(): SavedConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(conversations: SavedConversation[]) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(conversations.slice(0, MAX_CONVERSATIONS)),
  );
}

function generateTitle(messages: ChatMessageData[]): string {
  const firstUserMsg = messages.find((m) => m.type === "user");
  if (!firstUserMsg) return "New conversation";
  const text = firstUserMsg.content;
  return text.length > 60 ? text.slice(0, 57) + "..." : text;
}

export const chatHistoryService = {
  getAll(): SavedConversation[] {
    return loadAll().sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  },

  save(conversationId: string, messages: ChatMessageData[]) {
    if (messages.length === 0) return;
    // Strip out loading messages and mentions data to save space
    const cleanMessages = messages
      .filter((m) => !m.loading)
      .map((m) => ({
        ...m,
        mentions: m.mentions ? m.mentions.map((a) => ({ ...a })) : undefined,
      }));

    const conversations = loadAll();
    const existing = conversations.findIndex((c) => c.id === conversationId);
    const now = new Date().toISOString();

    if (existing !== -1) {
      conversations[existing].messages = cleanMessages;
      conversations[existing].updatedAt = now;
      conversations[existing].title = generateTitle(cleanMessages);
    } else {
      conversations.unshift({
        id: conversationId,
        title: generateTitle(cleanMessages),
        messages: cleanMessages,
        createdAt: now,
        updatedAt: now,
      });
    }

    saveAll(conversations);
  },

  get(conversationId: string): SavedConversation | undefined {
    return loadAll().find((c) => c.id === conversationId);
  },

  delete(conversationId: string) {
    const conversations = loadAll().filter((c) => c.id !== conversationId);
    saveAll(conversations);
  },

  deleteAll() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
