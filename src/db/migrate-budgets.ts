import { db } from "./index";
import { sql } from "drizzle-orm";

console.log("[migrate-budgets] Adding responsible_person column to budgets table...");

try {
  db.run(sql`ALTER TABLE budgets ADD COLUMN responsible_person TEXT;`);
  console.log("✓ Column responsible_person added to budgets table successfully.");
} catch (err) {
  console.log("- Column responsible_person may already exist:", err);
}
