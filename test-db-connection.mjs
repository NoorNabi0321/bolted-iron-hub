import { drizzle } from "drizzle-orm/mysql2";
import { serviceTokens } from "./drizzle/schema.ts";
import { eq, and, gt } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);
const token = "b4947795816b4d66453812d4b30630e439871b8265d73bcad58b022aff8bd0bd";

console.log("Testing database connection and token validation...\n");

// Test 1: Direct query
console.log("Test 1: Direct database query");
try {
  const result = await db
    .select()
    .from(serviceTokens)
    .where(
      and(
        eq(serviceTokens.token, token),
        eq(serviceTokens.isActive, true),
        gt(serviceTokens.expiresAt, new Date())
      )
    )
    .limit(1);
  
  if (result.length > 0) {
    console.log("✅ Token found:", result[0].name);
  } else {
    console.log("❌ Token not found");
  }
} catch (error) {
  console.error("❌ Query error:", error.message);
}

// Test 2: Multiple sequential queries
console.log("\nTest 2: Multiple sequential queries");
for (let i = 1; i <= 3; i++) {
  try {
    const result = await db
      .select()
      .from(serviceTokens)
      .where(eq(serviceTokens.token, token))
      .limit(1);
    
    console.log(`✅ Query ${i}: Found token`);
  } catch (error) {
    console.error(`❌ Query ${i}: ${error.message}`);
  }
}

process.exit(0);
