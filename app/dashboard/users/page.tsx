"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
const BLOCKED_REASON_LABEL: Record<string, string> = {
  has_customer_orders: "มีประวัติสั่งอาหาร",
  has_payouts: "มีประวัติ payout",
  active_orders: "กำลังส่งของ",
};

export default function UsersPage() {
  const { data: users = [], isLoading, refetch } = trpc.admin.listUsers.useQuery();
  const setRole = trpc.admin.setUserRoleAll.useMutation({ onSuccess: () => refetch() });
  const deleteUser = trpc.admin.deleteUser.useMutation({ onSuccess: () => refetch() });
  const [changingId, setChangingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const deleteUsers = trpc.admin.deleteUsers.useMutation({
    onSuccess: (res: any) => {
      setBulkConfirm(false);
      setSelected(new Set());
      refetch();
      const deleted = res?.deleted ?? 0;
      const blocked = res?.blocked ?? [];
      if (blocked.length > 0) {
        const names = blocked.map((b: any) => `• ${b.name} — ${BLOCKED_REASON_LABEL[b.reason] ?? b.reason}`).join("\n");
        alert(`ลบสำเร็จ ${deleted} คน\n\nข้ามไป ${blocked.length} คน:\n${names}`);
      }
    },
    onError: (err: any) => alert(err?.message ?? "ลบหลายรายการไม่สำเร็จ"),
  });

  const filtered = users.filter((u: any) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Drop selections that left the filtered view
  useEffect(() => {
    if (selected.size === 0) return;
    const visible = new Set(filtered.map((u: any) => u.id));
    const next = new Set<number>();
    let changed = false;
    selected.forEach((id) => {
      if (visible.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelected(next);
  }, [filtered, selected]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((u: any) => selected.has(u.id));
  const someSelected = selected.size > 0 && !allVisibleSelected;
  const headerCbRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    if (allVisibleSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((u: any) => u.id)));
  };
  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

      {selected.size > 0 && (
        <div className="flex items-center justify-between mb-3 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl">
          <span className="text-sm text-gray-700">
            เลือกแล้ว <b className="text-orange-600">{selected.size}</b> คน
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-xs rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ยกเลิกการเลือก
            </button>
            <button
              onClick={() => setBulkConfirm(true)}
              className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ลบ {selected.size} คน
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 w-10">
                <input
                  ref={headerCbRef}
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                  aria-label="เลือกทั้งหมด"
                />
              </th>
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
            {filtered.map((u: any) => {
              const role = u.role ?? "user";
              const RoleIcon = ROLE_ICONS[role] ?? User;
              const isSelected = selected.has(u.id);
              return (
                <tr
                  key={u.id}
                  className={`border-b border-gray-50 transition-colors ${
                    isSelected ? "bg-orange-50/50" : "hover:bg-gray-50/50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(u.id)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                      aria-label={`เลือก ${u.name ?? u.email ?? u.id}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/dashboard/users/${u.id}`} className="hover:text-orange-500 hover:underline transition-colors">
                      {u.name ?? "—"}
                    </Link>
                  </td>
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

      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              ลบผู้ใช้ {selected.size} คน?
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              ลบถาวร — รายการโปรด, ที่อยู่จัดส่ง, สิทธิ์ admin ของผู้ใช้จะถูกลบ
              ร้านอาหารที่ผู้ใช้เป็นเจ้าของจะคงอยู่แต่ช่อง "เจ้าของ" จะกลายเป็นว่าง
            </p>
            <p className="text-xs text-gray-400 mb-5">
              ข้ามผู้ใช้ที่:
              <br />• มีประวัติสั่งอาหาร (เก็บข้อมูลออเดอร์ไว้)
              <br />• มี payout record (financial settlement)
              <br />• กำลังส่งของในออเดอร์ active
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBulkConfirm(false)}
                disabled={deleteUsers.isPending}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => deleteUsers.mutate({ userIds: Array.from(selected) })}
                disabled={deleteUsers.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleteUsers.isPending ? "กำลังลบ..." : "ลบทั้งหมด"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
