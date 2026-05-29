"use client";

import { trpc } from "@/lib/trpc";
import { MonitorSmartphone } from "lucide-react";

function formatThaiDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PosInterestPage() {
  const { data = [], isLoading, error } = trpc.admin.listPosInterest.useQuery(undefined, {
    refetchInterval: 30000,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
          <MonitorSmartphone className="w-6 h-6 text-orange-500" /> ร้านที่สนใจ POS
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          ร้านที่กดสนใจระบบ POS จาก teaser ในแอป — ใช้วัดดีมานด์ก่อนเปิดพัฒนาเต็ม
        </p>
      </div>

      <div className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-2">
        <span className="text-sm text-gray-600">รวมร้านที่สนใจ</span>
        <span className="text-xl font-bold text-orange-600">{data.length}</span>
        <span className="text-sm text-gray-500">ร้าน</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {error ? (
          <div className="p-6 text-sm text-red-600">โหลดข้อมูลไม่สำเร็จ: {error.message}</div>
        ) : isLoading ? (
          <div className="p-6 text-sm text-gray-500">กำลังโหลด...</div>
        ) : data.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">ยังไม่มีร้านกดสนใจ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">ร้าน</th>
                  <th className="px-4 py-3 font-medium">เจ้าของ</th>
                  <th className="px-4 py-3 font-medium">เบอร์โทร</th>
                  <th className="px-4 py-3 font-medium">วันที่สนใจ</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.restaurantId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.restaurantName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.ownerName ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{row.ownerPhone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{formatThaiDateTime(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
