/**
 * Direct SQL migration to create the users table.
 * Run via: npx tsx src/db/migrate-users.ts
 */
import { db } from "./index";
import { sql } from "drizzle-orm";

console.log("[migrate-users] Creating users table...");

db.run(sql`
  CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "login_id" text NOT NULL,
    "email" text NOT NULL,
    "password_hash" text NOT NULL,
    "role" text DEFAULT 'USER' NOT NULL,
    "contact_id" text,
    "active" integer DEFAULT 1 NOT NULL,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON UPDATE NO ACTION ON DELETE SET NULL
  )
`);

db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS "users_login_id_uidx" ON "users" ("login_id")`);
db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS "users_email_uidx" ON "users" ("email")`);
db.run(sql`CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role")`);
db.run(sql`CREATE INDEX IF NOT EXISTS "users_contact_id_idx" ON "users" ("contact_id")`);

console.log("[migrate-users] ✅ Users table created successfully.");
