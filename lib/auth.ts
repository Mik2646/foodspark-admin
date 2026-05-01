import { API_BASE_URL } from "@/lib/config";

const USER_KEY = "admin_user_info";
const TOKEN_KEY = "admin_session_token";
const META_KEY = "admin_session_meta";
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const SESSION_REFRESH_GRACE_MS = 5 * 60 * 1000;

export type AdminUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
};

export type AdminSession = {
  token: string;
  user: AdminUser;
  expiresAt: number;
};

type SessionMeta = {
  savedAt: number;
  expiresAt: number;
};

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function removeStoredSession(storage: Storage) {
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USER_KEY);
  storage.removeItem(META_KEY);
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(padded);
}

function readJwtExpiryMs(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const parsed = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown };
    return typeof parsed.exp === "number" && Number.isFinite(parsed.exp) ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

function resolveSessionExpiry(token: string, savedAt: number): number {
  const jwtExpiry = readJwtExpiryMs(token);
  const cappedExpiry = savedAt + SESSION_MAX_AGE_MS;
  return jwtExpiry ? Math.min(jwtExpiry, cappedExpiry) : cappedExpiry;
}

function isAdminUser(value: unknown): value is AdminUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<AdminUser>;
  return typeof user.id === "number" && user.role === "admin";
}

function parseStoredUser(raw: string | null): AdminUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isAdminUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseStoredMeta(raw: string | null, token: string): SessionMeta {
  const now = Date.now();
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<SessionMeta>) : null;
    const savedAt = typeof parsed?.savedAt === "number" ? parsed.savedAt : now;
    const expiresAt = typeof parsed?.expiresAt === "number" ? parsed.expiresAt : resolveSessionExpiry(token, savedAt);
    return { savedAt, expiresAt };
  } catch {
    return { savedAt: now, expiresAt: resolveSessionExpiry(token, now) };
  }
}

export function saveSession(token: string, user: AdminUser) {
  const storage = browserStorage();
  if (!storage) return;
  const savedAt = Date.now();
  const expiresAt = resolveSessionExpiry(token, savedAt);
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
  storage.setItem(META_KEY, JSON.stringify({ savedAt, expiresAt } satisfies SessionMeta));
}

export function loadSession(): AdminSession | null {
  const storage = browserStorage();
  if (!storage) return null;
  const token = storage.getItem(TOKEN_KEY);
  const user = parseStoredUser(storage.getItem(USER_KEY));
  if (!token || !user) {
    removeStoredSession(storage);
    return null;
  }

  const meta = parseStoredMeta(storage.getItem(META_KEY), token);
  const jwtExpiry = readJwtExpiryMs(token);
  const hardExpiry = jwtExpiry ? Math.min(jwtExpiry, meta.expiresAt) : meta.expiresAt;
  if (hardExpiry <= Date.now() + SESSION_REFRESH_GRACE_MS) {
    removeStoredSession(storage);
    return null;
  }

  return { token, user, expiresAt: hardExpiry };
}

export function clearSession(reason = "manual") {
  const storage = browserStorage();
  if (!storage) return;
  removeStoredSession(storage);
  window.dispatchEvent(new CustomEvent("admin-session-cleared", { detail: { reason } }));
}

export function getSessionToken(): string | null {
  return loadSession()?.token ?? null;
}

export async function loginAdmin(email: string, password: string): Promise<{ ok: boolean; error?: string; user?: AdminUser }> {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/trpc/auth.login?batch=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": { json: { email, password } } }),
    });
    if (!resp.ok) return { ok: false, error: `เข้าสู่ระบบไม่สำเร็จ (${resp.status})` };

    const data = (await resp.json()) as Array<{
      error?: { json?: { message?: string } };
      result?: { data?: { json?: { token?: string; user?: AdminUser } } };
    }>;
    const result = data[0];
    if (result?.error) return { ok: false, error: result.error.json?.message ?? "เข้าสู่ระบบไม่สำเร็จ" };

    const token = result?.result?.data?.json?.token;
    const user = result?.result?.data?.json?.user;
    if (!token || !isAdminUser(user)) return { ok: false, error: "บัญชีนี้ไม่มีสิทธิ์เข้าถึงระบบแอดมิน" };

    const adminUser: AdminUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    saveSession(token, adminUser);
    return { ok: true, user: adminUser };
  } catch (error) {
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
    return { ok: false, error: message };
  }
}
