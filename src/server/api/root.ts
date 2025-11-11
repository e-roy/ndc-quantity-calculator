import {
  createCallerFactory,
  createTRPCRouter,
  publicProcedure,
} from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  // Placeholder to ensure router type is valid
  // Remove this when adding actual routers
  _health: publicProcedure.query(() => ({ status: "ok" })),
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 */
export const createCaller = createCallerFactory(appRouter);
