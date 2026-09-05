/**
 * src/auth/password.ts
 *
 * Secure password hashing and verification using bcryptjs.
 * Never stores or exposes plaintext passwords.
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt.
 * Returns the hash string suitable for database storage.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a stored bcrypt hash.
 * Returns true if they match.
 */
export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
