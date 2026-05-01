import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { API_BASE_URL } from "@/lib/config";
import { getSessionToken } from "@/lib/auth";

type AdminRouter = any;

export type AppRouter = AdminRouter;
export const trpc: any = createTRPCReact<AppRouter>();

export function getToken(): string | null {
  return getSessionToken();
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
