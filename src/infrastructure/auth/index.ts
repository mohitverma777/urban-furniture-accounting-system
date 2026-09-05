/**
 * src/infrastructure/auth/index.ts
 *
 * Auth provider factory & exports.
 */

import { env } from "@/config/env";
import type { AuthProvider } from "./provider";
import { localAuthProvider } from "./local";
import { productionAuthProvider } from "./production";

export * from "./provider";
export { LocalAuthProvider } from "./local";
export { ProductionAuthProvider } from "./production";

export function getAuthProvider(): AuthProvider {
  switch (env.AUTH_PROVIDER) {
    case "demo":
      return localAuthProvider;
    case "production":
      return productionAuthProvider;
    default:
      throw new Error(`Unsupported auth provider: ${env.AUTH_PROVIDER}`);
  }
}

export const authProvider = getAuthProvider();
