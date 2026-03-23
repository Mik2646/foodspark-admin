"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ShieldCheck, Store, User } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  user: "ผู้ใช้",
  merchant: "ร้านค้า",
  admin: "แอดมิน",
};

const ROLE_STYLES: Record<string, string> = {
  user: "bg-gray-100 text-gray-600",
  merchant: "bg-blue-100 text-blue-700",
  admin: "bg-purple-100 text-purple-700",
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  user: User,
  merchant: Store,
  admin: ShieldCheck,
};

export default function UsersPage() {
  const { data: users = [], isLoading, refetch } = trpc.admin.listUsers.useQuery();
  const setRole = trpc.admin.setUserRole.useMutation({ onSuccess: () => refetch() });
  const [changingId, setChangingId] = useState<number | null>(null);

  async function handleRoleChange(userId: number, role: "user" | "merchant" | "admin") {
    setChangingId(userId);
    await setRole.mutateAsync({ userId, role });
    setChangingId(null);
  }

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">จัดการผู้ใช้งาน</h1>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">อีเมล</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">เปลี่ยนสิทธิ์</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const role = u.role ?? "user";
              const RoleIcon = ROLE_ICONS[role] ?? User;
              return (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-400">{u.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email ?? "—"}</td>
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
                      onChange={e => handleRoleChange(u.id, e.target.value as "user" | "merchant" | "admin")}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50"
                    >
                      <option value="user">ผู้ใช้</option>
                      <option value="merchant">ร้านค้า</option>
                      <option value="admin">แอดมิน</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">ไม่มีผู้ใช้</div>
        )}
      </div>
    </div>
  );
}
