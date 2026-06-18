import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

const trpcClient = createTRPCClient({
  links: [
    httpBatchLink({
      url: "http://localhost:3000/api/trpc",
      headers: {
        "Authorization": "Bearer b4947795816b4d66453812d4b30630e439871b8265d73bcad58b022aff8bd0bd"
      }
    })
  ],
  transformer: superjson
});

// Test for project 1920001 (57 tehama st)
console.log("Testing project 1920001 (57 tehama st)...");
const result1 = await trpcClient.checklists.list.query({ projectId: 1920001 });
console.log("Result:", JSON.stringify(result1, null, 2));

// Test for project 60002 (104-106 emerson)
console.log("\nTesting project 60002 (104-106 emerson)...");
const result2 = await trpcClient.checklists.list.query({ projectId: 60002 });
console.log("Result:", JSON.stringify(result2, null, 2));
