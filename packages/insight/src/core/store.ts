import { createStore, reconcile } from "solid-js/store";
import type { Session, Message, Usage } from "./schema";

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

export const [store, setStore] = createStore({
  logs: [] as string[],
  status: "disconnected",
  sessions: {} as Record<string, SessionWithDetails>,
  agents: {} as Record<string, Agent>,
});

let ws: WebSocket | null = null;

// Helper to parse logs and update agent state
function updateAgentStateFromLog(log: string) {
  // Simple heuristic for single-agent system (using fixed ID "system-agent")
  const agentId = "system-agent";
  const now = Date.now();

  setStore("agents", agentId, (prev) => {
    const current: Agent = prev || {
      id: agentId,
      name: "System Agent",
      status: "idle",
      lastActive: now,
    };

    let updates: Partial<Agent> = { lastActive: now, lastAction: log };

    // Heuristics
    if (log.match(/Calling tool/i) || log.match(/Running command/i)) {
      updates.status = "busy";
      const toolMatch = log.match(/tool[:\s]+['"]?(\w+)['"]?/i) || log.match(/command[:\s]+['"]?(\w+)['"]?/i);
      if (toolMatch) updates.currentTool = toolMatch[1];
    } else if (log.match(/Thinking/i) || log.match(/thought:/i)) {
      updates.status = "thinking";
      const thoughtMatch = log.match(/Thinking[:\s]+(.*)/i) || log.match(/thought[:\s]+(.*)/i);
      if (thoughtMatch) updates.currentThought = thoughtMatch[1];
      updates.currentTool = undefined; // Clear tool when thinking
    } else if (log.match(/Tool output/i) || log.match(/Command output/i)) {
      updates.status = "idle";
      updates.currentTool = undefined;
    } else if (log.match(/Error/i)) {
      updates.status = "error";
    }

    return { ...current, ...updates };
  });
}

export function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.hostname}:3001/`;

  console.log("Connecting to WebSocket:", wsUrl);
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    setStore("status", "connected");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "AGENT_LOG") {
        setStore("logs", (logs) => [...logs, data.log]);
        updateAgentStateFromLog(data.log);
      } else if (data.type === "UPDATE_SESSION") {
        // Handle session updates (could refetch or update store)
        // For now, we rely on refetching on navigation or implementing a resource reload
        console.log("Session update received:", data);
        if (data.session && data.session.id) {
             setStore("sessions", data.session.id, (prev) => ({ ...prev, ...data.session }));
        }
      } else if (data.type === "MESSAGE_ADDED") {
        console.log("Message added:", data);
        if (data.sessionId && data.message) {
             setStore("sessions", data.sessionId, "messages", (msgs) => [...(msgs || []), data.message]);
        }
      } else if (data.type === "USAGE_UPDATED") {
         console.log("Usage updated:", data);
         if (data.sessionId && data.usage) {
             setStore("sessions", data.sessionId, "usage", reconcile(data.usage));
         }
      }
    } catch (e) {
      console.error("Failed to parse message:", e);
    }
  };

  ws.onerror = (event) => {
    console.error("WebSocket error:", event);
    setStore("status", "error");
    // Also surface the error in logs so it's visible in the UI if logs are shown
    setStore("logs", (logs) => [...logs, "WebSocket connection error occurred."]);
  };

  ws.onclose = () => {
    setStore("status", "disconnected");
    ws = null;
  };
}

export function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
  }
}
