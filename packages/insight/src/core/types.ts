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

/**
 * WebSocket Topic Definitions
 */
export type SubscriptionTopic =
  | "sessions:list"
  | `sessions:detail:${string}`
  | "logs";

/**
 * WebSocket Message Types (Discriminated Union)
 */
export type WebSocketMessage =
  | { type: "INIT"; payload: { message: string } }
  | { type: "SUBSCRIBE"; topic: SubscriptionTopic }
  | { type: "UNSUBSCRIBE"; topic: SubscriptionTopic }
  | { type: "UPDATE_SESSION_LIST"; sessions: Session[] }
  | { type: "UPDATE_SESSION_DETAIL"; sessionId: string; session: SessionWithDetails }
  | { type: "AGENT_LOG"; log: string };
