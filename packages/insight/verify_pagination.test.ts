import { test, expect, mock, beforeAll } from "bun:test";

// Set up globals that solid-start/api expects
globalThis.$API_ROUTES = [];

// Mock solid-start/api
mock.module("solid-start/api", () => {
  return {
    json: (data: any) => new Response(JSON.stringify(data)),
  };
});

const createEvent = (url: string) => ({
  request: new Request(url),
  params: {},
  clientAddress: "127.0.0.1",
  locals: {},
  env: {},
  fetch: fetch,
  $type: "$FETCH" as const,
});

test("GET /api/sessions defaults to limit 20, offset 0", async () => {
  const { GET } = await import("./src/routes/api/sessions");
  const event = createEvent("http://localhost:3000/api/sessions");
  const response = await GET(event as any);
  const data = await response.json();
  
  expect(data.length).toBeLessThanOrEqual(20);
});

test("GET /api/sessions respects limit query param", async () => {
  const { GET } = await import("./src/routes/api/sessions");
  const event = createEvent("http://localhost:3000/api/sessions?limit=5");
  const response = await GET(event as any);
  const data = await response.json();
  
  expect(data.length).toBe(5);
});

test("GET /api/sessions respects offset query param", async () => {
  const { GET } = await import("./src/routes/api/sessions");
  
  // Get first 5 items
  const event1 = createEvent("http://localhost:3000/api/sessions?limit=5");
  const response1 = await GET(event1 as any);
  const data1 = await response1.json();
  
  // Get next 5 items (offset 5)
  const event2 = createEvent("http://localhost:3000/api/sessions?limit=5&offset=5");
  const response2 = await GET(event2 as any);
  const data2 = await response2.json();
  
  expect(data2.length).toBeGreaterThan(0);
  // Ensure the first item is different
  expect(data1[0].id).not.toBe(data2[0].id);
});

test("GET /api/sessions caps limit at 100", async () => {
  const { GET } = await import("./src/routes/api/sessions");
  const event = createEvent("http://localhost:3000/api/sessions?limit=150");
  const response = await GET(event as any);
  const data = await response.json();
  expect(data.length).toBeLessThanOrEqual(100);
});
