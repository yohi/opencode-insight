import type { Message } from "./types";

export function normalizeTimestampToMs(value: string | number | Date | null | undefined): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return 0;

    const num = Number(trimmed);
    if (!isNaN(num)) {
      // Heuristic: less than 10 billion -> seconds, else milliseconds
      return num < 10000000000 ? num * 1000 : num;
    }
    const parsed = new Date(value).getTime();
    if (isNaN(parsed)) return 0;
    return parsed;
  }
  
  // Number
  return value < 10000000000 ? value * 1000 : value;
}

export function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const merged = [...existing];
  const existingIds = new Set(existing.map((m) => m.id));

  for (const msg of incoming) {
    if (!existingIds.has(msg.id)) {
      merged.push(msg);
      existingIds.add(msg.id);
    }
  }

  merged.sort((a, b) => {
    return normalizeTimestampToMs(a.timestamp) - normalizeTimestampToMs(b.timestamp);
  });

  return merged;
}
