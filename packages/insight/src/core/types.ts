import type { Session, Message, Usage } from "./schema";

/**
 * Shared domain interfaces
 */

export type { Session, Message, Usage };

export type SessionWithDetails = Session & {
  messages: Message[];
  usage?: Usage;
};

export type AgentStatus = "idle" | "thinking" | "busy" | "error";

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  currentTool?: string;
  currentThought?: string;
  lastAction?: string;
  lastActive: number;
}

export type PluginState =
  | { type: "WORKSPACE"; workspacePath: string }
  | { type: "PLUGIN"; id: string; name: string };

/**
 * WebSocket Topic Definitions
 */
export type SubscriptionTopic =
  | "logs"
  | `session:${string}`;

/**
 * WebSocket Message Types (Discriminated Union)
 */
export type WebSocketMessage =
  | { type: "INIT"; payload: PluginState[] }
  | { type: "SUBSCRIBE"; topic: SubscriptionTopic }
  | { type: "UNSUBSCRIBE"; topic: SubscriptionTopic }
  | { type: "UPDATE_SESSION"; sessionId: string; data: Message[]; usage?: Usage }
  | { type: "AGENT_LOG"; log: string };
