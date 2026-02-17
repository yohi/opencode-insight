import { createStore } from "solid-js/store";
import type { SessionWithDetails, Agent, WebSocketMessage, Message } from "./types";

type OutboundWebSocketMessage = Extract<WebSocketMessage, { type: "SUBSCRIBE" | "UNSUBSCRIBE" }>;

// Helper to merge and deduplicate messages
function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
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

export const [store, setStore] = createStore({
  logs: [] as string[],
  status: "disconnected",
  sessions: {} as Record<string, SessionWithDetails>,
  agents: {} as Record<string, Agent>,
  workspacePath: null as string | null,
});

let ws: WebSocket | null = null;
const pendingMessages: OutboundWebSocketMessage[] = [];
const activeSubscriptions = new Set<string>();

function getSubscriptionKey(msg: OutboundWebSocketMessage): string | null {
  if (msg.type === "SUBSCRIBE" || msg.type === "UNSUBSCRIBE") {
    return JSON.stringify({ type: msg.type, ...("sessionId" in msg ? { sessionId: msg.sessionId } : {}) });
  }
  return null;
}

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

function appendLog(logs: string[], message: string) {
  const newLogs = [...logs, message];
  return newLogs.length > 1000 ? newLogs.slice(newLogs.length - 1000) : newLogs;
}

function handleMessage(data: WebSocketMessage) {
  switch (data.type) {
    case "AGENT_LOG":
      setStore("logs", (logs) => appendLog(logs, data.log));
      updateAgentStateFromLog(data.log);
      break;

    case "UPDATE_SESSION":
      // Spec-compatible message: update messages for a single session.
      setStore("sessions", data.sessionId, (prev) => ({
        ...(prev || { id: data.sessionId }),
        messages: mergeMessages(prev?.messages || [], data.data),
      }));
      break;

    case "INIT":
      for (const entry of data.payload) {
        if (entry.type === "WORKSPACE") {
          setStore("workspacePath", entry.workspacePath);
        }
      }
      break;
  }
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

    // Resubscribe to active topics
    activeSubscriptions.forEach((subJson) => {
      try {
        const sub = JSON.parse(subJson);
        // We only resubscribe if it's a SUBSCRIBE message
        if (sub.type === "SUBSCRIBE" && ws) {
          ws.send(subJson);
        }
      } catch (e) {
        console.error("Failed to resubscribe:", e);
      }
    });
    
    // Flush pending messages
    while (pendingMessages.length > 0) {
      const msg = pendingMessages.shift();
      if (msg && ws) {
        ws.send(JSON.stringify(msg));
      }
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as WebSocketMessage;
      handleMessage(data);

      // No additional legacy handling.
    } catch (e) {
      console.error("Failed to parse message:", e);
    }
  };

  ws.onerror = (event) => {
    console.error("WebSocket error:", event);
    setStore("status", "error");
    // Also surface the error in logs so it's visible in the UI if logs are shown
    setStore("logs", (logs) => appendLog(logs, "WebSocket connection error occurred."));
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

export function sendWebSocketMessage(message: OutboundWebSocketMessage) {
  // Track subscriptions
  if (message.type === "SUBSCRIBE") {
    activeSubscriptions.add(JSON.stringify(message));
  } else if (message.type === "UNSUBSCRIBE") {
    // To remove, we need to find the matching SUBSCRIBE message.
    // However, the spec says we should remove it. 
    // Usually UNSUBSCRIBE has the same payload structure except the type.
    const subMessage = { ...message, type: "SUBSCRIBE" };
    activeSubscriptions.delete(JSON.stringify(subMessage));
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    pendingMessages.push(message);
    console.warn("WebSocket is not connected. Message queued:", message);
  }
}
