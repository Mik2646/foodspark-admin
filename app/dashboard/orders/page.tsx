"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Trash2 } from "lucide-react";

const STATUSES = ["", "pending", "preparing", "ready", "delivering", "delivered", "cancelled"] as const;
const STATUS_LABELS: Record<string, string> = {
  "": "ทั้งหมด", pending: "รอยืนยัน", preparing: "กำลังเตรียม",
  ready: "พร้อมส่ง", delivering: "กำลังส่ง", delivered: "ส่งแล้ว", cancelled: "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  preparing: "bg-blue-100 text-blue-700",
  ready: "bg-indigo-100 text-indigo-700",
  delivering: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

export default function OrdersPage() {
  const [filterStatus, setFilterStatus] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { data: orders = [], isLoading, refetch } = trpc.admin.listOrders.useQuery(
    { status: filterStatus || undefined },
    { refetchInterval: 15000 }
  );
  const updateStatus = trpc.admin.updateOrderStatus.useMutation({ onSuccess: () => refetch() });
  const deleteOrder = trpc.admin.deleteOrder.useMutation({
    onSuccess: () => { setConfirmDelete(null); refetch(); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ออเดอร์ทั้งหมด</h1>
        <span className="text-sm text-gray-400">{orders.length} รายการ</span>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterStatus === s ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-10 text-gray-400 text-sm">กำลังโหลด...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Order ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ร้าน</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ที่อยู่</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ไรเดอร์</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ยอด</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">เวลา</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{o.id.slice(-10)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{o.restaurantName}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate text-xs">{o.deliveryAddress}</td>
                  <td className="px-4 py-3 text-gray-500">{o.riderName ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">฿{o.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={o.status}
                        disabled={updateStatus.isPending}
                        onChange={e => updateStatus.mutate({ orderId: o.id, status: e.target.value as any })}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50"
                      >
                        {(["pending","preparing","ready","delivering","delivered","cancelled"] as const).map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                      {confirmDelete === o.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteOrder.mutate({ orderId: o.id })}
                            disabled={deleteOrder.isPending}
                            className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                          >
                            ยืนยัน
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(o.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && orders.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">ไม่มีออเดอร์</div>
        )}
      </div>
    </div>
  );
}
