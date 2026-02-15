import { serve } from "bun";
import { wsHandler } from "./ws";
import { startWatcher } from "./watcher";

const PORT = 3001;
const DB_PATH = process.env.DB_PATH || "opencode.db";

// Start watcher
console.log("Starting DB Watcher...");
startWatcher(DB_PATH);

// Start Server
console.log(`Starting WebSocket Server on port ${PORT}...`);
serve({
  port: PORT,
  fetch(req, server) {
    const success = server.upgrade(req);
    if (success) {
      // Bun automatically returns a 101 Switching Protocols response
      return undefined;
    }

    // handle HTTP request
    return new Response("WebSocket Server for Insight");
  },
  websocket: wsHandler,
});
