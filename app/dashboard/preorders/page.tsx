"use client";

/**
 * /dashboard/preorders — Phase 3 batch view.
 *
 * Shows preorder orders grouped by delivery date (Asia/Bangkok) for
 * the next 14 days. Admin uses this to:
 *   - See "how many orders for tomorrow's rider run" at a glance
 *   - Drill into each order to confirm / cancel before the rider leaves
 *
 * Backed by trpc.admin.listPreorderBatches.
 */
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  CalendarClock,
  Package,
  ChevronRight,
  Store,
  MapPin,
  Loader2,
} from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-blue-100 text-blue-700",
  ready: "bg-indigo-100 text-indigo-700",
  delivering: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  preparing: "กำลังเตรียม",
  ready: "พร้อมส่ง",
  delivering: "กำลังส่ง",
  delivered: "ส่งแล้ว",
};

function formatDateLabel(yyyymmdd: string): string {
  // YYYY-MM-DD → "วันจันทร์ 13 พ.ค."
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const today = new Date();
  const bkkToday = new Date(today.getTime() + 7 * 60 * 60 * 1000);
  const todayKey = `${bkkToday.getUTCFullYear()}-${String(bkkToday.getUTCMonth() + 1).padStart(2, "0")}-${String(bkkToday.getUTCDate()).padStart(2, "0")}`;
  const tomorrow = new Date(bkkToday);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomKey = `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, "0")}-${String(tomorrow.getUTCDate()).padStart(2, "0")}`;
  if (yyyymmdd === todayKey) return `วันนี้ · ${dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`;
  if (yyyymmdd === tomKey) return `พรุ่งนี้ · ${dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`;
  return dt.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function formatTime(date: Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const bkk = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return `${String(bkk.getUTCHours()).padStart(2, "0")}:${String(bkk.getUTCMinutes()).padStart(2, "0")}`;
}

export default function PreordersPage() {
  const { data: batches = [], isLoading } =
    trpc.admin.listPreorderBatches.useQuery(undefined, {
      refetchInterval: 60 * 1000,
    });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-amber-500" />
            พรีออเดอร์
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            ออเดอร์รวมรอบส่งวันละครั้ง — จัดกลุ่มตามวันที่ส่ง 14 วันข้างหน้า
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <CalendarClock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            ยังไม่มีพรีออเดอร์ — เมื่อร้านพรีออเดอร์มีออเดอร์ คิวจะมารวมที่หน้านี้
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {batches.map((batch) => (
            <div
              key={batch.date}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Batch header */}
              <div className="px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-amber-900">
                      {formatDateLabel(batch.date)}
                    </p>
                    <p className="text-xs text-amber-700">
                      {batch.count} ออเดอร์ · รวม ฿
                      {batch.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-white border border-amber-200 text-amber-700 font-semibold flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  รอบส่ง
                </span>
              </div>

              {/* Orders in batch */}
              <div className="divide-y divide-gray-100">
                {batch.orders.map((o: any) => (
                  <Link
                    key={o.id}
                    href={`/dashboard/orders?focus=${o.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {o.restaurantName}
                        </p>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-500"}`}
                        >
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span className="font-mono">#{o.id.slice(-8)}</span>
                        <span>·</span>
                        <span>ส่ง {formatTime(o.scheduledFor)} น.</span>
                        {o.deliveryAddress && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5 truncate max-w-[180px]">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {o.deliveryAddress}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-orange-500">
                        ฿{o.totalAmount?.toLocaleString() ?? 0}
                      </p>
                      <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
