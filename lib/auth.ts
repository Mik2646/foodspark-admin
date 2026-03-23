const USER_KEY = "admin_user_info";
const TOKEN_KEY = "admin_session_token";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export type AdminUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
};

export function saveSession(token: string, user: AdminUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadSession(): { token: string; user: AdminUser } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    if (!token || !raw) return null;
    return { token, user: JSON.parse(raw) };
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginAdmin(email: string, password: string): Promise<{ ok: boolean; error?: string; user?: AdminUser }> {
  try {
    const resp = await fetch(`${API_BASE}/api/trpc/auth.login?batch=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": { json: { email, password } } }),
    });
    const data = await resp.json();
    const result = data[0];
    if (result.error) return { ok: false, error: result.error.json.message };
    const { token, user } = result.result.data.json;
    if (user.role !== "admin") return { ok: false, error: "บัญชีนี้ไม่มีสิทธิ์เข้าถึงระบบแอดมิน" };
    const adminUser: AdminUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    saveSession(token, adminUser);
    return { ok: true, user: adminUser };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "เกิดข้อผิดพลาด" };
  }
}
