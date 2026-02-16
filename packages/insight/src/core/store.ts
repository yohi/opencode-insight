import { createStore } from "solid-js/store";
import type { SessionWithDetails, Agent, WebSocketMessage } from "./types";

type OutboundWebSocketMessage = Extract<WebSocketMessage, { type: "SUBSCRIBE" | "UNSUBSCRIBE" }>;

export const [store, setStore] = createStore({
  logs: [] as string[],
  status: "disconnected",
  sessions: {} as Record<string, SessionWithDetails>,
  agents: {} as Record<string, Agent>,
});

let ws: WebSocket | null = null;
const pendingMessages: OutboundWebSocketMessage[] = [];

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

    case "UPDATE_SESSION_LIST":
      // Reconcile session list: remove deleted sessions, update existing/new ones
      setStore("sessions", (prevSessions) => {
        const nextSessions: any = {};
        for (const s of data.sessions) {
          const prev = prevSessions[s.id];
          nextSessions[s.id] = {
            ...(prev || {}),
            ...s,
            messages: prev?.messages || [],
          };
        }
        return nextSessions;
      });
      break;

    case "UPDATE_SESSION_DETAIL":
      // Explicit merge for session details
      setStore("sessions", data.sessionId, (prev) => ({
        ...(prev || {}),
        ...data.session,
        messages: data.session.messages || prev?.messages || [],
      }));
      break;

    case "INIT":
      console.log("WebSocket initialized:", data.payload.message);
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

      // Keep some legacy logging if needed during transition, 
      // but the main logic is now in handleMessage
      if (data.type === "UPDATE_SESSION_DETAIL") {
        console.log("Session detail updated:", data.sessionId);
      }
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
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    pendingMessages.push(message);
    console.warn("WebSocket is not connected. Message queued:", message);
  }
}
