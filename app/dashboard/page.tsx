"use client";
import { trpc } from "@/lib/trpc";
import { ShoppingBag, Store, ClipboardList, DollarSign, Bike } from "lucide-react";

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
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
  const { data, isLoading, error } = trpc.admin.overview.useQuery();

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;
  if (error) return <div className="text-red-500 text-sm">เกิดข้อผิดพลาด: {error.message}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ภาพรวมระบบ</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={ShoppingBag} label="ผู้ใช้ทั้งหมด" value={data?.totalUsers ?? 0} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Store} label="ร้านอาหาร" value={data?.totalRestaurants ?? 0} color="bg-orange-50 text-orange-600" />
        <StatCard icon={ClipboardList} label="ออเดอร์ทั้งหมด" value={data?.totalOrders ?? 0} color="bg-purple-50 text-purple-600" />
        <StatCard icon={Bike} label="ไรเดอร์" value={data?.riderCount ?? 0} color="bg-cyan-50 text-cyan-600" />
        <StatCard icon={DollarSign} label="รายได้รวม" value={`฿${(data?.totalRevenue ?? 0).toLocaleString()}`} color="bg-green-50 text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">ออเดอร์แยกตามสถานะ</h2>
          {data?.ordersByStatus && Object.keys(data.ordersByStatus).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(data.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{status}</span>
                  <span className="text-sm font-medium text-gray-900 bg-gray-50 px-2.5 py-0.5 rounded-full">{String(count)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">ยังไม่มีออเดอร์</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">สรุปข้อมูล</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Merchant users</span>
              <span className="font-medium">{data?.merchantCount ?? 0} ร้าน</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Admin users</span>
              <span className="font-medium">{data?.adminCount ?? 0} คน</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Regular users</span>
              <span className="font-medium">{data?.regularCount ?? 0} คน</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Riders</span>
              <span className="font-medium">{data?.riderCount ?? 0} คน</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
