"use client";
import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, ToggleLeft, ToggleRight, Pencil, Trash2 } from "lucide-react";

export default function RestaurantsPage() {
  const { data: restaurants = [], isLoading, refetch } = trpc.admin.listRestaurants.useQuery();
  const { data: users = [] } = trpc.admin.listUsers.useQuery();
  const assign = trpc.admin.assignRestaurant.useMutation({ onSuccess: () => refetch() });
  const toggle = trpc.admin.toggleRestaurant.useMutation({ onSuccess: () => refetch() });
  const deleteRestaurant = trpc.admin.deleteRestaurant.useMutation({ onSuccess: () => refetch() });
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const merchants = users.filter(u => u.role === "merchant" || u.role === "admin");

  async function handleAssign(restaurantId: string, ownerId: number | null) {
    if (ownerId === null) return;
    try {
      setAssigningId(restaurantId);
      await assign.mutateAsync({ restaurantId, ownerId });
    } finally {
      setAssigningId(null);
    }
  }

  async function handleToggle(restaurantId: string, isOpen: boolean) {
    try {
      setTogglingId(restaurantId);
      await toggle.mutateAsync({ restaurantId, isOpen });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(restaurantId: string, name: string) {
    if (!confirm(`ต้องการลบร้าน "${name}" ใช่หรือไม่?\nเมนูและรายการโปรดของร้านนี้จะถูกลบด้วย`)) return;
    try {
      setDeletingId(restaurantId);
      await deleteRestaurant.mutateAsync({ restaurantId });
      alert("ลบร้านอาหารสำเร็จ");
    } catch (error: any) {
      alert(error?.message ?? "ลบร้านอาหารไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการร้านอาหาร</h1>
        <span className="text-sm text-gray-400">{restaurants.length} ร้าน</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อร้าน</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">หมวดหมู่</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">เจ้าของ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">มอบหมายให้</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">เปิด/ปิด</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => {
              const owner = users.find(u => u.id === r.ownerId);
              return (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/dashboard/restaurants/${r.id}`} className="hover:text-orange-500 hover:underline transition-colors">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.isOpen ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" /> เปิด
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        <XCircle className="w-3 h-3" /> ปิด
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {owner ? `${owner.name ?? owner.email} (#${owner.id})` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.ownerId ?? ""}
                      disabled={assigningId === r.id}
                      onChange={e => handleAssign(r.id, e.target.value ? Number(e.target.value) : null)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50"
                    >
                      <option value="">— ไม่มีเจ้าของ —</option>
                      {merchants.map(m => (
                        <option key={m.id} value={m.id}>{m.name ?? m.email} (#{m.id})</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(r.id, !r.isOpen)}
                      disabled={togglingId === r.id}
                      className="flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                      {r.isOpen ? (
                        <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600">เปิดอยู่</span></>
                      ) : (
                        <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-400">ปิดอยู่</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/restaurants/${r.id}`}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="แก้ไขร้าน"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(r.id, r.name)}
                        disabled={deletingId === r.id}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="ลบร้าน"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {restaurants.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">ไม่มีร้านอาหาร</div>
        )}
      </div>
    </div>
  );
}
