import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../foodspark/server/routers";

export type { AppRouter };
export const trpc = createTRPCReact<AppRouter>();

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_session_token");
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_BASE_URL}/api/trpc`,
        transformer: superjson,
        headers() {
          const token = getToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
