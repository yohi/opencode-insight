import { createHandler, renderAsync, StartServer } from "solid-start/entry-server";

// Watcher logic removed; use separate server process for WebSocket/DB updates
export default createHandler(
  renderAsync((event) => <StartServer event={event} />)
);
