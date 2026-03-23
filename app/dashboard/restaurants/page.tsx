"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle } from "lucide-react";

export default function RestaurantsPage() {
  const { data: restaurants = [], isLoading, refetch } = trpc.admin.listRestaurants.useQuery();
  const { data: users = [] } = trpc.admin.listUsers.useQuery();
  const assign = trpc.admin.assignRestaurant.useMutation({ onSuccess: () => refetch() });
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const merchants = users.filter(u => u.role === "merchant" || u.role === "admin");

  async function handleAssign(restaurantId: string, ownerId: number | null) {
    setAssigningId(restaurantId);
    await assign.mutateAsync({ restaurantId, ownerId });
    setAssigningId(null);
  }

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">จัดการร้านอาหาร</h1>

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
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => {
              const owner = users.find(u => u.id === r.ownerId);
              return (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
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
                        <option key={m.id} value={m.id}>
                          {m.name ?? m.email} (#{m.id})
                        </option>
                      ))}
                    </select>
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
