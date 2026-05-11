import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import superjson from "superjson";
import { API_BASE_URL } from "@/lib/config";
import { clearSession, getSessionToken } from "@/lib/auth";

type AdminRouter = any;

export type AppRouter = AdminRouter;
export const trpc: any = createTRPCReact<AppRouter>();

export function getToken(): string | null {
  return getSessionToken();
}

// Local storage may still hold a session that the server has already
// rejected (token rotated server-side, role changed, etc.). When ANY
// tRPC call comes back UNAUTHORIZED, clear the stale session and bounce
// to /login instead of leaving the dashboard frozen on an error row.
function authBouncerLink(): any {
  return () =>
    ({ next, op }: any) =>
      observable((observer: any) => {
        const sub = next(op).subscribe({
          next(value: any) { observer.next(value); },
          error(err: any) {
            if (typeof window !== "undefined") {
              const code = err instanceof TRPCClientError ? err.data?.code : undefined;
              const httpStatus = err instanceof TRPCClientError ? err.data?.httpStatus : undefined;
              if (code === "UNAUTHORIZED" || httpStatus === 401) {
                if (window.location.pathname !== "/login") {
                  clearSession("server-401");
                  const next = encodeURIComponent(window.location.pathname + window.location.search);
                  window.location.replace(`/login?next=${next}`);
                }
              }
            }
            observer.error(err);
          },
          complete() { observer.complete(); },
        });
        return () => sub.unsubscribe();
      });
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      authBouncerLink(),
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
