import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    url: { type: "string", default: "ws://localhost:3001" },
    subscribe: { type: "string" },
    expect: { type: "string" },
    timeout: { type: "string", default: "5000" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
});

if (values.help) {
  console.log(`
Usage: bun run scripts/ws-qa.ts [options]

Options:
  --url <url>        WebSocket URL (default: ws://localhost:3001)
  --subscribe <topic> Topic to subscribe to
  --expect <type>    Expected message type
  --timeout <ms>     Timeout in milliseconds (default: 5000)
  -h, --help         Show help
  `);
  process.exit(0);
}

const url = values.url!;
const subscribe = values.subscribe;
const expectType = values.expect;
const timeoutMs = parseInt(values.timeout!);

if (!expectType) {
  console.error("Error: --expect <type> is required.");
  process.exit(1);
}

console.log(`Connecting to ${url}...`);

const socket = new WebSocket(url);

const timeout = setTimeout(() => {
  console.error(`Timeout: Did not receive expected message "${expectType}" within ${timeoutMs}ms`);
  socket.close();
  process.exit(1);
}, timeoutMs);

socket.onopen = () => {
  console.log("WebSocket connected.");
  if (subscribe) {
    console.log(`Subscribing to ${subscribe}...`);
    socket.send(JSON.stringify({ type: "SUBSCRIBE", payload: subscribe }));
  }
};

socket.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data.toString());
    console.log(`Received message: ${data.type}`);
    
    if (data.type === expectType) {
      console.log(`SUCCESS: Received expected message type "${expectType}"`);
      clearTimeout(timeout);
      socket.close();
      process.exit(0);
    }
  } catch (e) {
    console.error(`Error parsing message: ${e}`);
  }
};

socket.onerror = (error) => {
  console.error("WebSocket error:", error);
  clearTimeout(timeout);
  process.exit(1);
};

socket.onclose = () => {
  console.log("WebSocket connection closed.");
};
