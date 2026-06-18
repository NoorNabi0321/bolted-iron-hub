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

console.log("Testing Bearer token fix with multiple requests...\n");

// Test 1: Initial request
console.log("Request 1 (startup):");
try {
  const result = await trpcClient.projects.list.query({});
  console.log("✅ projects.list: 200");
} catch (error) {
  console.log("❌ Error:", error.message.substring(0, 100));
}

// Test 2: After delay
console.log("\nRequest 2 (after 1 second):");
await new Promise(r => setTimeout(r, 1000));
try {
  const result = await trpcClient.projects.list.query({});
  console.log("✅ projects.list: 200");
} catch (error) {
  console.log("❌ Error:", error.message.substring(0, 100));
}

// Test 3: Rapid fire
console.log("\nRequest 3-5 (rapid fire):");
for (let i = 0; i < 3; i++) {
  try {
    const result = await trpcClient.projects.list.query({});
    console.log(`✅ Request ${3+i}: 200`);
  } catch (error) {
    console.log(`❌ Request ${3+i}: Error`);
  }
}

// Test 4: Different procedure
console.log("\nRequest 6 (checklists.list):");
try {
  const result = await trpcClient.checklists.list.query({ projectId: 1920001 });
  console.log("✅ checklists.list: 200");
} catch (error) {
  console.log("❌ Error:", error.message.substring(0, 100));
}

console.log("\n✅ All tests completed!");
