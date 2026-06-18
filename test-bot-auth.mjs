// Simulate exactly what the bot is doing
const bearerToken = "b4947795816b4d66453812d4b30630e439871b8265d73bcad58b022aff8bd0bd";
const apiUrl = "https://boltediron-jvzmywuk.manus.space/api/trpc";

const headers = {
  Authorization: `Bearer ${bearerToken}`,
  "Content-Type": "application/json"
};

console.log("Testing with headers:", headers);
console.log("Token length:", bearerToken.length);
console.log("Token value:", bearerToken);

// Test 1: projects.list
console.log("\n=== Test 1: projects.list ===");
try {
  const response = await fetch(`${apiUrl}/projects.list?input=%7B%7D`, {
    method: "GET",
    headers: headers
  });
  console.log("Status:", response.status);
  const data = await response.json();
  if (data.result) {
    console.log("✅ Success - Got", data.result.data.json.length, "projects");
  } else if (data.error) {
    console.log("❌ Error:", data.error.json.message);
  }
} catch (error) {
  console.error("Request failed:", error.message);
}

// Test 2: checklists.list
console.log("\n=== Test 2: checklists.list ===");
try {
  const response = await fetch(`${apiUrl}/checklists.list?input=%7B%22projectId%22%3A1920001%7D`, {
    method: "GET",
    headers: headers
  });
  console.log("Status:", response.status);
  const data = await response.json();
  if (data.result) {
    console.log("✅ Success - Got", data.result.data.json.length, "checklist items");
  } else if (data.error) {
    console.log("❌ Error:", data.error.json.message);
  }
} catch (error) {
  console.error("Request failed:", error.message);
}
