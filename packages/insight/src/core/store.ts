import { createStore } from "solid-js/store";
import { onCleanup } from "solid-js";

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

  ws.onclose = () => {
    setStore("status", "disconnected");
    ws = null;
  };

  onCleanup(() => {
    // Only close if unmounting the root component that called this,
    // but here we want persistent connection.
    // Usually onCleanup runs when component unmounts.
    // If called in Layout, it unmounts only on full reload.
    if (ws) {
      ws.close();
      ws = null;
    }
  });
}
