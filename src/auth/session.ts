/**
 * src/auth/session.ts
 *
 * Server-side session management using iron-session.
 *
 * Session data is stored in an encrypted, signed, HTTP-only cookie.
 * The secret key (SESSION_PASSWORD) must remain server-side only
 * and must NEVER be prefixed with NEXT_PUBLIC_.
 */

import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// Session data shape
// ---------------------------------------------------------------------------

export interface SessionData {
  userId: string;
  loginId: string;
  name: string;
  role: "ADMIN" | "ACCOUNTANT" | "USER";
  contactId?: string | null;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SESSION_PASSWORD =
  process.env.SESSION_PASSWORD || "complex_password_at_least_32_characters_long!!";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "uf_session";

const sessionOptions: SessionOptions = {
  password: SESSION_PASSWORD,
  cookieName: COOKIE_NAME,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  },
};

// ---------------------------------------------------------------------------
// Mock Cookie Store for non-Next request context (e.g. Unit Tests)
// ---------------------------------------------------------------------------

class MockCookieStore {
  private map = new Map<string, string>();
  get(name: string) {
    const val = this.map.get(name);
    return val ? { name, value: val } : undefined;
  }
  set(name: string, value: string) {
    this.map.set(name, value);
  }
  delete(name: string) {
    this.map.delete(name);
  }
}

const mockStore = new MockCookieStore();

async function getSafeCookieStore(): Promise<any> {
  try {
    return await cookies();
  } catch {
    return mockStore;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the current iron-session from the request cookies.
 * Returns the session object (may be empty if not authenticated).
 */
export async function getSession() {
  const cookieStore = await getSafeCookieStore();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}

/**
 * Save user data into the session cookie.
 */
export async function setUserSession(data: SessionData) {
  const session = await getSession();
  session.userId = data.userId;
  session.loginId = data.loginId;
  session.name = data.name;
  session.role = data.role;
  session.contactId = data.contactId;
  await session.save();

  // Set lightweight plaintext cookies for Edge middleware (cannot decrypt iron-session)
  const cookieStore = await getSafeCookieStore();
  const cookieOpts = {
    httpOnly: false, // Middleware needs to read these
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24,
    path: "/",
  };
  if (cookieStore.set) {
    try {
      cookieStore.set("uf_user_id", data.userId, cookieOpts);
      cookieStore.set("uf_user_role", data.role, cookieOpts);
    } catch {
      // Ignore if headers already sent
    }
  }

  return session;
}

/**
 * Destroy the current session (logout).
 */
export async function destroySession() {
  const session = await getSession();
  session.destroy();

  // Clear the lightweight middleware cookies
  const cookieStore = await getSafeCookieStore();
  if (cookieStore.delete) {
    try {
      cookieStore.delete("uf_user_id");
      cookieStore.delete("uf_user_role");
    } catch {
      // Ignore
    }
  }
}

/**
 * Get the current authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.userId || !session.loginId || !session.name || !session.role) {
    return null;
  }
  return {
    userId: session.userId,
    loginId: session.loginId,
    name: session.name,
    role: session.role,
    contactId: session.contactId,
  };
}
