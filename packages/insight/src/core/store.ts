import { createStore } from "solid-js/store";

export const [store, setStore] = createStore({
  logs: [] as string[],
  status: "disconnected",
});

let ws: WebSocket | null = null;

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
      } else if (data.type === "UPDATE_SESSION") {
        // Handle session updates (could refetch or update store)
        // For now, we rely on refetching on navigation or implementing a resource reload
        console.log("Session update received:", data);
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
