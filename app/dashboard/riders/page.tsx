"use client";
import { trpc } from "@/lib/trpc";
import { Bike, Wifi, WifiOff, TrendingUp, Package } from "lucide-react";

export default function RidersPage() {
  const { data: riders = [], isLoading } = trpc.admin.listRiders.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const onlineCount = riders.filter(r => r.riderOnline).length;
  const totalDelivered = riders.reduce((s, r) => s + r.totalDelivered, 0);
  const totalEarnings = riders.reduce((s, r) => s + r.totalEarnings, 0);

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ไรเดอร์</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="inline-flex p-2 rounded-lg bg-blue-50 text-blue-600 mb-3">
            <Bike className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{riders.length}</p>
          <p className="text-sm text-gray-500 mt-1">ไรเดอร์ทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="inline-flex p-2 rounded-lg bg-green-50 text-green-600 mb-3">
            <Wifi className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{onlineCount}</p>
          <p className="text-sm text-gray-500 mt-1">ออนไลน์ตอนนี้</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="inline-flex p-2 rounded-lg bg-purple-50 text-purple-600 mb-3">
            <Package className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalDelivered}</p>
          <p className="text-sm text-gray-500 mt-1">ส่งสำเร็จรวม</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="inline-flex p-2 rounded-lg bg-orange-50 text-orange-600 mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">฿{totalEarnings.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">รายได้รวมทั้งหมด</p>
        </div>
      </div>

      {/* Riders table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">ไรเดอร์</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">วันนี้</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">รายได้วันนี้</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ทั้งหมด</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">รายได้รวม</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">งานปัจจุบัน</th>
            </tr>
          </thead>
          <tbody>
            {riders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">ยังไม่มีไรเดอร์</td>
              </tr>
            ) : riders.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{r.name ?? "—"}</div>
                  <div className="text-xs text-gray-400">{r.email ?? r.phone ?? "—"}</div>
                </td>
                <td className="px-4 py-3">
                  {r.riderOnline ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      ออนไลน์
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      <WifiOff className="w-3 h-3" />
                      ออฟไลน์
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.todayDelivered} งาน</td>
                <td className="px-4 py-3 font-medium text-green-600">฿{r.todayEarnings.toLocaleString()}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.totalDelivered} งาน</td>
                <td className="px-4 py-3 font-medium text-green-600">฿{r.totalEarnings.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {r.activeOrder ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      กำลังส่ง
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">ว่าง</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
