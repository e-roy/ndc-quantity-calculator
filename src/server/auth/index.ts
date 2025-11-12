import "server-only";

import NextAuth from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

const auth = cache(uncachedAuth);

// Export uncached auth for use in middleware (Edge runtime)
export { auth, handlers, signIn, signOut, uncachedAuth as authMiddleware };
