import { ServerWebSocket } from "bun";
import * as path from "path";
import type { SubscriptionTopic, WebSocketMessage } from "../core/types";
import { loadPlugins } from "../core/plugin-loader.server";

type SubscriptionMessage =
  | { type: "SUBSCRIBE"; topic: SubscriptionTopic }
  | { type: "UNSUBSCRIBE"; topic: SubscriptionTopic };

const clients = new Set<ServerWebSocket<unknown>>();
const subscriptionsByClient = new Map<ServerWebSocket<unknown>, Set<SubscriptionTopic>>();

function toTextMessage(message: string | Buffer): string {
  return typeof message === "string" ? message : message.toString("utf8");
}

function isSubscriptionTopic(topic: unknown): topic is SubscriptionTopic {
  return topic === "logs";
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

export const wsHandler = {
  open(ws: ServerWebSocket<unknown>) {
    clients.add(ws);
    subscriptionsByClient.set(ws, new Set<SubscriptionTopic>());

    console.log("Client connected");
    const exposeWorkspace = process.env.INSIGHT_EXPOSE_WORKSPACE === "true";
    const workspacePath = exposeWorkspace ? process.cwd() : path.basename(process.cwd());
    let plugins = [];

    try {
      plugins = loadPlugins();
    } catch (error) {
      console.error("Failed to load plugins:", error);
    }

    send(ws, {
      type: "INIT",
      payload: [
        { type: "WORKSPACE", workspacePath },
        ...plugins.map((plugin) => ({ type: "PLUGIN" as const, id: plugin.id, name: plugin.name })),
      ],
    });
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
