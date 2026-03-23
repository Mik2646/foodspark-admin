"use client";
import { trpc } from "@/lib/trpc";
import { ShoppingBag, Store, ClipboardList, DollarSign, Bike } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "รอยืนยัน", preparing: "กำลังเตรียม", ready: "พร้อมส่ง",
  delivering: "กำลังส่ง", delivered: "ส่งแล้ว", cancelled: "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  preparing: "bg-blue-100 text-blue-700",
  ready: "bg-indigo-100 text-indigo-700",
  delivering: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = trpc.admin.overview.useQuery(undefined, { refetchInterval: 30000 });
  const { data: recentOrders = [] } = trpc.admin.listOrders.useQuery({ limit: 10 }, { refetchInterval: 15000 });

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;
  if (error) return <div className="text-red-500 text-sm">เกิดข้อผิดพลาด: {error.message}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ภาพรวมระบบ</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={ShoppingBag} label="ผู้ใช้ทั้งหมด" value={data?.totalUsers ?? 0} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Store} label="ร้านอาหาร" value={data?.totalRestaurants ?? 0} color="bg-orange-50 text-orange-600" />
        <StatCard icon={ClipboardList} label="ออเดอร์ทั้งหมด" value={data?.totalOrders ?? 0} color="bg-purple-50 text-purple-600" />
        <StatCard icon={Bike} label="ไรเดอร์" value={data?.riderCount ?? 0} color="bg-cyan-50 text-cyan-600" />
        <StatCard icon={DollarSign} label="รายได้รวม" value={`฿${(data?.totalRevenue ?? 0).toLocaleString()}`} color="bg-green-50 text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Orders by status */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">ออเดอร์แยกตามสถานะ</h2>
          {data?.ordersByStatus && Object.keys(data.ordersByStatus).length > 0 ? (
            <div className="space-y-2.5">
              {Object.entries(data.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[status] ?? status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{String(count)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">ยังไม่มีออเดอร์</p>
          )}
        </div>

        {/* User summary */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">สรุปผู้ใช้</h2>
          <div className="space-y-3">
            {[
              { label: "ผู้ใช้ทั่วไป", value: data?.regularCount ?? 0 },
              { label: "ร้านค้า (Merchant)", value: data?.merchantCount ?? 0 },
              { label: "ไรเดอร์", value: data?.riderCount ?? 0 },
              { label: "แอดมิน", value: data?.adminCount ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900">{value} คน</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active orders */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">ออเดอร์ที่กำลังดำเนินการ</h2>
          {(() => {
            const active = Object.entries(data?.ordersByStatus ?? {}).filter(([s]) => !["delivered","cancelled"].includes(s));
            const total = active.reduce((s, [, c]) => s + Number(c), 0);
            return total > 0 ? (
              <div className="space-y-2">
                <p className="text-3xl font-bold text-orange-500">{total}</p>
                <p className="text-sm text-gray-500">ออเดอร์ที่รอดำเนินการ</p>
                <div className="mt-3 space-y-1.5">
                  {active.map(([s, c]) => (
                    <div key={s} className="flex justify-between text-xs text-gray-500">
                      <span>{STATUS_LABELS[s] ?? s}</span><span className="font-medium">{String(c)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-sm text-gray-400">ไม่มีออเดอร์ที่ดำเนินการอยู่</p>;
          })()}
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">ออเดอร์ล่าสุด</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">Order ID</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">ร้าน</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">ยอด</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">สถานะ</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">เวลา</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 text-gray-400 font-mono text-xs">{o.id.slice(-10)}</td>
                  <td className="py-2.5 text-gray-900 font-medium">{o.restaurantName}</td>
                  <td className="py-2.5 text-gray-900">฿{o.totalAmount.toLocaleString()}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-400 text-xs">
                    {new Date(o.createdAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentOrders.length === 0 && <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีออเดอร์</p>}
        </div>
      </div>
    </div>
  );
}
