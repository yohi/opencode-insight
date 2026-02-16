import { ServerWebSocket } from "bun";
import type { SubscriptionTopic, WebSocketMessage } from "../core/types";

type SubscriptionMessage =
  | { type: "SUBSCRIBE"; topic: SubscriptionTopic }
  | { type: "UNSUBSCRIBE"; topic: SubscriptionTopic };

const clients = new Set<ServerWebSocket<unknown>>();
const subscriptionsByClient = new Map<ServerWebSocket<unknown>, Set<SubscriptionTopic>>();

function toTextMessage(message: string | Buffer): string {
  return typeof message === "string" ? message : message.toString("utf8");
}

function isSubscriptionTopic(topic: unknown): topic is SubscriptionTopic {
  return (
    topic === "sessions:list" ||
    topic === "logs" ||
    (typeof topic === "string" && topic.startsWith("sessions:detail:") && topic.length > "sessions:detail:".length)
  );
}

function parseSubscriptionMessage(raw: string | Buffer): SubscriptionMessage | null {
  try {
    const parsed = JSON.parse(toTextMessage(raw)) as Partial<SubscriptionMessage>;
    if (
      (parsed.type === "SUBSCRIBE" || parsed.type === "UNSUBSCRIBE") &&
      isSubscriptionTopic(parsed.topic)
    ) {
      return parsed as SubscriptionMessage;
    }
  } catch {
    // Ignore malformed inbound messages.
  }

  return null;
}

function getOrCreateSubscriptions(ws: ServerWebSocket<unknown>): Set<SubscriptionTopic> {
  let topics = subscriptionsByClient.get(ws);
  if (!topics) {
    topics = new Set<SubscriptionTopic>();
    subscriptionsByClient.set(ws, topics);
  }
  return topics;
}

function removeClient(ws: ServerWebSocket<unknown>) {
  clients.delete(ws);
  subscriptionsByClient.delete(ws);
}

export function getSubscriptionSnapshot(): {
  hasSessionListSubscribers: boolean;
  sessionDetailIds: string[];
} {
  const detailIds = new Set<string>();
  let hasSessionListSubscribers = false;

  for (const topics of subscriptionsByClient.values()) {
    if (topics.has("sessions:list")) {
      hasSessionListSubscribers = true;
    }

    for (const topic of topics) {
      if (!topic.startsWith("sessions:detail:")) {
        continue;
      }

      const sessionId = topic.slice("sessions:detail:".length);
      if (sessionId) {
        detailIds.add(sessionId);
      }
    }
  }

  return {
    hasSessionListSubscribers,
    sessionDetailIds: [...detailIds],
  };
}

export const wsHandler = {
  open(ws: ServerWebSocket<unknown>) {
    clients.add(ws);
    subscriptionsByClient.set(ws, new Set<SubscriptionTopic>());

    console.log("Client connected");
    send(ws, { type: "INIT", payload: { message: "Connected to Insight" } });
  },
  message(ws: ServerWebSocket<unknown>, rawMessage: string | Buffer) {
    const message = parseSubscriptionMessage(rawMessage);
    if (!message) {
      return;
    }

    const topics = getOrCreateSubscriptions(ws);
    if (message.type === "SUBSCRIBE") {
      topics.add(message.topic);
    } else {
      topics.delete(message.topic);
    }
  },
  close(ws: ServerWebSocket<unknown>) {
    removeClient(ws);
    console.log("Client disconnected");
  },
};

export function send(ws: ServerWebSocket<unknown>, message: WebSocketMessage) {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }

  try {
    ws.send(JSON.stringify(message));
  } catch {
    removeClient(ws);
  }
}

export function broadcast(
  message: WebSocketMessage,
  shouldSend?: (topics: ReadonlySet<SubscriptionTopic>) => boolean,
) {
  for (const client of clients) {
    const topics = subscriptionsByClient.get(client);
    if (!topics) {
      continue;
    }

    if (shouldSend && !shouldSend(topics)) {
      continue;
    }

    send(client, message);
  }
}

export function broadcastToTopic(topic: SubscriptionTopic, message: WebSocketMessage) {
  broadcast(message, (topics) => topics.has(topic));
}
