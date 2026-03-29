"use client";
import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, ToggleLeft, ToggleRight } from "lucide-react";

export default function RestaurantsPage() {
  const { data: restaurants = [], isLoading, refetch } = trpc.admin.listRestaurants.useQuery();
  const { data: users = [] } = trpc.admin.listUsers.useQuery();
  const assign = trpc.admin.assignRestaurant.useMutation({ onSuccess: () => refetch() });
  const toggle = trpc.admin.toggleRestaurant.useMutation({ onSuccess: () => refetch() });
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const merchants = users.filter(u => u.role === "merchant" || u.role === "admin");

  async function handleAssign(restaurantId: string, ownerId: number | null) {
    if (ownerId === null) return;
    setAssigningId(restaurantId);
    await assign.mutateAsync({ restaurantId, ownerId });
    setAssigningId(null);
  }

  async function handleToggle(restaurantId: string, isOpen: boolean) {
    setTogglingId(restaurantId);
    await toggle.mutateAsync({ restaurantId, isOpen });
    setTogglingId(null);
  }

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการร้านอาหาร</h1>
        <span className="text-sm text-gray-400">{restaurants.length} ร้าน</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อร้าน</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">หมวดหมู่</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">เจ้าของ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">มอบหมายให้</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">เปิด/ปิด</th>
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
                </tr>
              );
            })}
          </tbody>
        </table>
        {restaurants.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">ไม่มีร้านอาหาร</div>
        )}
      </div>
    </div>
  );
}
