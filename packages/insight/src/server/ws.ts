import { ServerWebSocket } from "bun";

export type WebSocketMessage =
  | { type: "INIT"; payload: any }
  | { type: "UPDATE_SESSION"; sessionId: string; data: any }
  | { type: "AGENT_LOG"; log: string };

const clients = new Set<ServerWebSocket<unknown>>();

export const wsHandler = {
  open(ws: ServerWebSocket<unknown>) {
    clients.add(ws);
    console.log("Client connected");
    ws.send(JSON.stringify({ type: "INIT", payload: { message: "Connected to Insight" } }));
  },
  message(ws: ServerWebSocket<unknown>, message: string | Buffer) {
    // Handle incoming messages if needed
  },
  close(ws: ServerWebSocket<unknown>) {
    clients.delete(ws);
    console.log("Client disconnected");
  },
};

export function broadcast(message: WebSocketMessage) {
  for (const client of clients) {
    client.send(JSON.stringify(message));
  }
}
