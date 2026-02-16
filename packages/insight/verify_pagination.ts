import { GET } from "./src/routes/api/sessions";

// Mock APIEvent
const createEvent = (url: string) => ({
  request: new Request(url),
  params: {},
  clientAddress: "127.0.0.1",
  locals: {},
  env: {},
  fetch: fetch,
  $type: "$FETCH" as const, // mock internal solid-start property
});

async function runTests() {
  console.log("Starting tests...");

  // Test 1: Default (limit 20, offset 0)
  try {
    const response = await GET(createEvent("http://localhost:3000/api/sessions"));
    const data = await response.json();
    console.log(`Test 1 (Default): Got ${data.length} sessions.`);
    if (data.length > 20) throw new Error("Default limit exceeded 20");
    if (data.length === 0) console.warn("Warning: No sessions found. Check seeding.");
  } catch (e) {
    console.error("Test 1 Failed:", e);
  }

  // Test 2: Limit 5
  try {
    const response = await GET(createEvent("http://localhost:3000/api/sessions?limit=5"));
    const data = await response.json();
    console.log(`Test 2 (Limit 5): Got ${data.length} sessions.`);
    if (data.length !== 5) throw new Error(`Expected 5 sessions, got ${data.length}`);
  } catch (e) {
    console.error("Test 2 Failed:", e);
  }

  // Test 3: Offset 5 (Check distinct results)
  try {
    const response1 = await GET(createEvent("http://localhost:3000/api/sessions?limit=5"));
    const data1 = await response1.json();
    
    const response2 = await GET(createEvent("http://localhost:3000/api/sessions?limit=5&offset=5"));
    const data2 = await response2.json();

    console.log(`Test 3 (Offset 5): Got ${data2.length} sessions.`);
    
    // Check if the first item of page 2 is different from page 1
    if (data1.length > 0 && data2.length > 0 && data1[0].id === data2[0].id) {
        throw new Error("Offset didn't work. First item is same.");
    }
  } catch (e) {
    console.error("Test 3 Failed:", e);
  }

  console.log("Tests finished.");
}

runTests();
