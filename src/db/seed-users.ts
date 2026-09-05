/**
 * src/db/seed-users.ts
 *
 * Seed initial user accounts for Role-Based Authentication.
 * Accounts created:
 *   1. LoginID: admin      | Password: Admin@1234      | Role: ADMIN
 *   2. LoginID: accountant | Password: Accountant@1234 | Role: ACCOUNTANT
 *   3. LoginID: user       | Password: User@1234       | Role: USER (linked to Nimesh Pathak)
 *
 * Run via: npx tsx src/db/seed-users.ts
 */

import { db } from "./index";
import { users, contacts } from "./schema";
import { hashPassword } from "@/auth/password";
import { eq } from "drizzle-orm";

export async function seedUsers() {
  console.log("🔐 [Seed Users] Seeding role-based user accounts...");

  const adminPassHash = await hashPassword("Admin@1234");
  const accountantPassHash = await hashPassword("Accountant@1234");
  const userPassHash = await hashPassword("User@1234");

  // Find contact ID for Nimesh Pathak if available
  const nimeshContact = await db
    .select()
    .from(contacts)
    .where(eq(contacts.email, "nimesh.pathak@gmail.com"))
    .get();

  const userList = [
    {
      id: "u0000000-0000-4000-8000-000000000001",
      loginId: "admin",
      name: "Admin User",
      email: "admin@urbanfurniture.com",
      passwordHash: adminPassHash,
      role: "ADMIN" as const,
      active: true,
    },
    {
      id: "u0000000-0000-4000-8000-000000000002",
      loginId: "accountant",
      name: "Priya Sharma",
      email: "accountant@urbanfurniture.com",
      passwordHash: accountantPassHash,
      role: "ACCOUNTANT" as const,
      active: true,
    },
    {
      id: "u0000000-0000-4000-8000-000000000003",
      loginId: "user",
      name: "Nimesh Pathak",
      email: "user@urbanfurniture.com",
      passwordHash: userPassHash,
      role: "USER" as const,
      contactId: nimeshContact ? nimeshContact.id : null,
      active: true,
    },
  ];

  for (const u of userList) {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.loginId, u.loginId))
      .get();

    if (!existing) {
      await db.insert(users).values(u);
      console.log(`   ✓ Created user: ${u.loginId} (${u.role})`);
    } else {
      console.log(`   - User ${u.loginId} already exists`);
    }
  }

  console.log("✅ [Seed Users] User accounts seeded successfully.");
}

// Allow direct execution
if (require.main === module) {
  seedUsers().catch(console.error);
}
