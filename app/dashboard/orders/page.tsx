"use client";
import { trpc } from "@/lib/trpc";

const STATUS_LABELS: Record<string, string> = {
  pending: "รอยืนยัน",
  preparing: "กำลังเตรียม",
  delivering: "กำลังจัดส่ง",
  delivered: "ส่งแล้ว",
  cancelled: "ยกเลิก",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  preparing: "bg-blue-100 text-blue-700",
  delivering: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

export default function OrdersPage() {
  // Using merchant listOrders but admin can see all — we'll use a different approach
  // Admin overview doesn't expose raw orders, so let's show per-restaurant orders via listRestaurants
  const { data: restaurants = [], isLoading: loadingR } = trpc.admin.listRestaurants.useQuery();

  if (loadingR) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ออเดอร์ทั้งหมด</h1>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm text-gray-500 mb-4">
          ระบบมี {restaurants.length} ร้านอาหาร — เลือกร้านเพื่อดูออเดอร์
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {restaurants.map(r => (
            <div key={r.id} className="border border-gray-100 rounded-lg p-4 hover:border-orange-200 transition-colors">
              <p className="font-medium text-gray-900 text-sm">{r.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {r.isOpen ? "🟢 เปิด" : "🔴 ปิด"} · {r.category ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
