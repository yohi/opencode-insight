import { serve } from "bun";
import { wsHandler } from "./ws";
import { startWatcher } from "./watcher";
import { startLogWatcher } from "./log-watcher";

const PORT = 3001;
const HOST = process.env.HOST || "127.0.0.1";
const DB_PATH = process.env.DB_PATH || "opencode.db";
const LOG_PATH = process.env.AGENT_LOG_PATH || "logs/opencode.log";

// Start watcher
console.log("Starting DB Watcher...");
startWatcher(DB_PATH);

// Start log watcher
console.log("Starting Log Watcher...");
startLogWatcher(LOG_PATH);

// Start Server
console.log(`Starting WebSocket Server on ${HOST}:${PORT}...`);
serve({
  port: PORT,
  hostname: HOST,
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
