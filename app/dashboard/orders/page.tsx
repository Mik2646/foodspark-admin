"use client";
import { useEffect, useRef, useState } from "react";
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const { data: orders = [], isLoading, refetch } = trpc.admin.listOrders.useQuery(
    { status: filterStatus || undefined },
    { refetchInterval: 15000 }
  );
  const updateStatus = trpc.admin.updateOrderStatus.useMutation({ onSuccess: () => refetch() });
  const deleteOrder = trpc.admin.deleteOrder.useMutation({
    onSuccess: () => { setConfirmDelete(null); refetch(); },
  });
  const deleteOrders = trpc.admin.deleteOrders.useMutation({
    onSuccess: () => { setSelected(new Set()); setBulkConfirm(false); refetch(); },
  });

  // Drop selections that are no longer in the visible list (e.g. after filter change or refetch)
  useEffect(() => {
    if (selected.size === 0) return;
    const visible = new Set(orders.map((o: any) => o.id));
    let changed = false;
    const next = new Set<string>();
    selected.forEach((id) => {
      if (visible.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelected(next);
  }, [orders, selected]);

  const allVisibleSelected = orders.length > 0 && orders.every((o: any) => selected.has(o.id));
  const someSelected = selected.size > 0 && !allVisibleSelected;
  const headerCbRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    if (allVisibleSelected) setSelected(new Set());
    else setSelected(new Set(orders.map((o: any) => o.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

      {selected.size > 0 && (
        <div className="flex items-center justify-between mb-3 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl">
          <span className="text-sm text-gray-700">
            เลือกแล้ว <b className="text-orange-600">{selected.size}</b> รายการ
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
              ลบ {selected.size} รายการ
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-10 text-gray-400 text-sm">กำลังโหลด...</div>
        ) : (
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
              {orders.map((o: any) => (
                <tr
                  key={o.id}
                  className={`border-b border-gray-50 transition-colors ${
                    selected.has(o.id) ? "bg-orange-50/50" : "hover:bg-gray-50/50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggleOne(o.id)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                      aria-label={`เลือก ${o.id.slice(-10)}`}
                    />
                  </td>
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

      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              ลบออเดอร์ {selected.size} รายการ?
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              การกระทำนี้ลบถาวร ไม่สามารถย้อนกลับได้ — ข้อมูลในตะกร้า, แชท, dispute และ incident
              ที่ผูกกับออเดอร์เหล่านี้จะถูกลบทั้งหมด
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBulkConfirm(false)}
                disabled={deleteOrders.isPending}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => deleteOrders.mutate({ orderIds: Array.from(selected) })}
                disabled={deleteOrders.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleteOrders.isPending ? "กำลังลบ..." : `ลบทั้งหมด`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
