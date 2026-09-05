import path from "node:path";

// Ensure process.env.SQLITE_DB_PATH points to ./test.db for all test processes
process.env.SQLITE_DB_PATH = "./test.db";

export async function setup() {
  console.log("⚡ [Vitest Global Setup] Initializing & seeding isolated test database (./test.db)...");
  const { seed } = await import("./src/db/seed");
  await seed();
}
