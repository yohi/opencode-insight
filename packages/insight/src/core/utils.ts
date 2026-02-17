import type { Message } from "./types";

// Helper to merge and deduplicate messages
export function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const map = new Map<string, Message>();

  const getMessageKey = (m: Message) => {
    if (m.id) return m.id;
    return `${m.timestamp}-${m.role}-${m.content}`;
  };

  existing.forEach((m) => {
    map.set(getMessageKey(m), m);
  });
  incoming.forEach((m) => {
    map.set(getMessageKey(m), m);
  });

  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeA - timeB;
  });
}
