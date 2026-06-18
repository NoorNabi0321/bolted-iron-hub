import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

const token = "b4947795816b4d66453812d4b30630e439871b8265d73bcad58b022aff8bd0bd";

const trpcClient = createTRPCClient({
  links: [
    httpBatchLink({
      url: "https://boltediron-jvzmywuk.manus.space/api/trpc",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
  ],
  transformer: superjson
});

console.log("Testing sequential requests with Bearer token...\n");

// Test 1: First request
console.log("Request 1 (immediate):");
try {
  const result = await trpcClient.projects.list.query({});
  console.log("✅ Status: 200, Projects:", result.length);
} catch (error) {
  console.log("❌ Error:", error.message);
}

// Test 2: Wait 2 seconds and try again
console.log("\nRequest 2 (after 2 seconds):");
await new Promise(r => setTimeout(r, 2000));
try {
  const result = await trpcClient.projects.list.query({});
  console.log("✅ Status: 200, Projects:", result.length);
} catch (error) {
  console.log("❌ Error:", error.message);
}

// Test 3: Immediate follow-up
console.log("\nRequest 3 (immediate follow-up):");
try {
  const result = await trpcClient.projects.list.query({});
  console.log("✅ Status: 200, Projects:", result.length);
} catch (error) {
  console.log("❌ Error:", error.message);
}

// Test 4: Multiple rapid requests
console.log("\nRequest 4-6 (rapid fire):");
for (let i = 1; i <= 3; i++) {
  try {
    const result = await trpcClient.projects.list.query({});
    console.log(`✅ Request ${3+i}: 200, Projects:`, result.length);
  } catch (error) {
    console.log(`❌ Request ${3+i}: Error -`, error.message);
  }
}
