"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ShieldCheck, Store, User, Bike, Search, Trash2 } from "lucide-react";

const ROLE_LABELS: Record<string, string> = { user: "ผู้ใช้", merchant: "ร้านค้า", admin: "แอดมิน", rider: "ไรเดอร์" };
const ROLE_STYLES: Record<string, string> = {
  user: "bg-gray-100 text-gray-600",
  merchant: "bg-blue-100 text-blue-700",
  admin: "bg-purple-100 text-purple-700",
  rider: "bg-cyan-100 text-cyan-700",
};
const ROLE_ICONS: Record<string, React.ElementType> = { user: User, merchant: Store, admin: ShieldCheck, rider: Bike };

export default function UsersPage() {
  const { data: users = [], isLoading, refetch } = trpc.admin.listUsers.useQuery();
  const setRole = trpc.admin.setUserRoleAll.useMutation({ onSuccess: () => refetch() });
  const deleteUser = trpc.admin.deleteUser.useMutation({ onSuccess: () => refetch() });
  const [changingId, setChangingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filtered = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleRoleChange(userId: number, role: "user" | "merchant" | "admin" | "rider") {
    setChangingId(userId);
    await setRole.mutateAsync({ userId, role });
    setChangingId(null);
  }

  function handleDelete(userId: number, name: string | null) {
    if (!confirm(`ลบผู้ใช้ "${name ?? userId}" ใช่ไหม? ไม่สามารถย้อนกลับได้`)) return;
    deleteUser.mutate({ userId });
  }

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้งาน</h1>
        <span className="text-sm text-gray-400">{users.length} คน</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหาชื่อหรืออีเมล..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">อีเมล</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">เข้าสู่ระบบล่าสุด</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">สิทธิ์</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">เปลี่ยนสิทธิ์</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const role = u.role ?? "user";
              const RoleIcon = ROLE_ICONS[role] ?? User;
              return (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString("th-TH") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[role] ?? ""}`}>
                      <RoleIcon className="w-3 h-3" />
                      {ROLE_LABELS[role] ?? role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={role}
                      disabled={changingId === u.id}
                      onChange={e => handleRoleChange(u.id, e.target.value as any)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50"
                    >
                      <option value="user">ผู้ใช้</option>
                      <option value="merchant">ร้านค้า</option>
                      <option value="rider">ไรเดอร์</option>
                      <option value="admin">แอดมิน</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(u.id, u.name)}
                      disabled={deleteUser.isPending}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">ไม่พบผู้ใช้</div>
        )}
      </div>
    </div>
  );
}
