"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { KeyRound, ShieldCheck } from "lucide-react";

const ROLE_OPTIONS = ["super_admin", "ops", "finance", "support"] as const;

export default function RBACPage() {
  const utils = trpc.useUtils();
  const [draftRoles, setDraftRoles] = useState<Record<number, string>>({});
  const [draftPermissions, setDraftPermissions] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const myAccess = trpc.admin.myAccess.useQuery();
  const roles = trpc.admin.listAdminRoles.useQuery(undefined, { retry: false });

  const setRole = trpc.admin.setAdminRole.useMutation({
    onSuccess: async () => {
      await utils.admin.listAdminRoles.invalidate();
      await utils.admin.myAccess.invalidate();
      setNotice("อัปเดต RBAC แล้ว");
      setTimeout(() => setNotice(null), 1800);
    },
  });

  const roleById = useMemo(() => {
    const map: Record<number, string> = {};
    for (const row of roles.data || []) map[row.userId] = row.role;
    return map;
  }, [roles.data]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-orange-500" /> RBAC สิทธิ์แอดมิน
        </h1>
        <p className="text-sm text-gray-500 mt-1">กำหนดบทบาทและสิทธิ์ย่อยของแอดมินเพื่อควบคุมงาน Production</p>
      </div>

      {notice && <div className="mb-4 rounded-lg bg-green-50 border border-green-100 text-green-700 text-sm px-3 py-2">{notice}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2 inline-flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-orange-500" /> สิทธิ์ของฉัน
        </h2>
        {myAccess.isLoading ? (
          <div className="text-sm text-gray-400">กำลังโหลด...</div>
        ) : myAccess.error ? (
          <div className="rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2">{myAccess.error.message}</div>
        ) : (
          <div className="text-sm text-gray-700">
            <div>บทบาท: <span className="font-semibold text-orange-600">{myAccess.data?.role}</span></div>
            <div className="mt-1">สิทธิ์: {(myAccess.data?.permissions || []).join(", ") || "-"}</div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">จัดการสิทธิ์ทีมแอดมิน</h2>
        </div>

        {roles.isLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">กำลังโหลด RBAC...</div>
        ) : roles.error ? (
          <div className="p-4">
            <div className="rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2">{roles.error.message}</div>
            <p className="text-xs text-gray-500 mt-2">หน้านี้ต้องใช้สิทธิ์ Super Admin</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(roles.data || []).map((row) => {
              const selectedRole = draftRoles[row.userId] ?? roleById[row.userId] ?? row.role;
              const permissionText = draftPermissions[row.userId] ?? row.permissions.join(",");
              return (
                <div key={row.userId} className="px-4 py-3">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-center">
                    <div className="lg:col-span-2">
                      <div className="text-sm font-semibold text-gray-900">{row.name}</div>
                      <div className="text-xs text-gray-500">{row.email || `user #${row.userId}`}</div>
                    </div>
                    <select
                      value={selectedRole}
                      onChange={(e) =>
                        setDraftRoles((prev) => ({
                          ...prev,
                          [row.userId]: e.target.value,
                        }))
                      }
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <input
                      value={permissionText}
                      onChange={(e) =>
                        setDraftPermissions((prev) => ({
                          ...prev,
                          [row.userId]: e.target.value,
                        }))
                      }
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      placeholder="permissions คั่นด้วย comma (ปล่อยว่าง = ตาม role)"
                    />
                    <button
                      onClick={() => {
                        const perms = (draftPermissions[row.userId] ?? "")
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        setRole.mutate({
                          userId: row.userId,
                          role: selectedRole as "super_admin" | "ops" | "finance" | "support",
                          permissions: perms.length ? perms : undefined,
                        });
                      }}
                      disabled={setRole.isPending}
                      className="px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-40"
                    >
                      บันทึก
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">สิทธิ์ปัจจุบัน: {row.permissions.join(", ") || "-"}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
