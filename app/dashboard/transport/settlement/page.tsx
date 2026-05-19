"use client";
/**
 * /dashboard/transport/settlement — Phase 6.1
 *
 * Daily settlement view for transport-service riders. Sums every
 * completed transport order's fare grouped by rider + day, so the
 * merchant can pay riders out in cash with the right number.
 *
 * Date range picker defaults to the last 7 calendar days (Asia/
 * Bangkok local).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Bike,
  Calendar,
  DollarSign,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function TransportSettlementPage() {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [dateFrom, setDateFrom] = useState(toLocalDateString(weekAgo));
  const [dateTo, setDateTo] = useState(toLocalDateString(today));
  const [expanded, setExpanded] = useState<string | null>(null);

  // Convert local dates → ISO bounds at start/end of day.
  const range = useMemo(() => {
    const fromDate = new Date(`${dateFrom}T00:00:00`);
    const toDate = new Date(`${dateTo}T23:59:59`);
    return {
      dateFromISO: fromDate.toISOString(),
      dateToISO: toDate.toISOString(),
    };
  }, [dateFrom, dateTo]);

  const { data, isFetching, refetch } = trpc.admin.transportSettlement.useQuery(range, {
    staleTime: 60 * 1000,
  });

  const rows = data?.rows ?? [];
  const totals = data?.totals ?? { count: 0, fare: 0 };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-sm text-gray-400">
            <Link
              href="/dashboard/transport"
              className="inline-flex items-center gap-1 hover:text-orange-500"
            >
              <ArrowLeft className="w-3 h-3" /> ออเดอร์รับส่ง
            </Link>
            <span>/</span>
            <span>Settlement</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">รายได้ไรเดอร์ — บริการรับส่ง</h1>
          <p className="text-sm text-gray-400 mt-1">
            รวมค่าบริการของออเดอร์ที่เสร็จสิ้น จัดกลุ่มตามไรเดอร์ + วัน เพื่อใช้
            ตั้งโต๊ะจ่ายเงินสด
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          รีเฟรช
        </button>
      </div>

      {/* Date range */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1 inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" /> ตั้งแต่
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1 inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" /> ถึง
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                setDateFrom(toLocalDateString(t));
                setDateTo(toLocalDateString(t));
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                const w = new Date(t.getTime() - 6 * 24 * 60 * 60 * 1000);
                setDateFrom(toLocalDateString(w));
                setDateTo(toLocalDateString(t));
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
            >
              7 วันย้อนหลัง
            </button>
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                const m = new Date(t.getTime() - 29 * 24 * 60 * 60 * 1000);
                setDateFrom(toLocalDateString(m));
                setDateTo(toLocalDateString(t));
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
            >
              30 วันย้อนหลัง
            </button>
          </div>
        </div>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Tile icon={Bike} label="ไรเดอร์ที่มีงานในช่วงนี้" value={rows.length.toString()} color="text-blue-600" bg="bg-blue-50" />
        <Tile icon={TrendingUp} label="ออเดอร์ที่เสร็จสิ้น" value={totals.count.toLocaleString()} color="text-emerald-600" bg="bg-emerald-50" />
        <Tile icon={DollarSign} label="ค่าบริการรวม" value={`฿${totals.fare.toLocaleString()}`} color="text-green-600" bg="bg-green-50" />
      </div>

      {/* Per-rider rows */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            ไม่มีออเดอร์ที่เสร็จในช่วงเวลานี้
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">ไรเดอร์</th>
                <th className="text-right px-4 py-2">จำนวนออเดอร์</th>
                <th className="text-right px-4 py-2">รวมรายได้</th>
                <th className="text-right px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const key = r.riderId
                  ? `id:${r.riderId}`
                  : `manual:${r.riderName}|${r.riderPhone}`;
                const open = expanded === key;
                return (
                  <>
                    <tr key={key} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">
                          {r.riderName}
                          {!r.riderId && (
                            <span className="ml-2 text-[10px] font-normal text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                              ไรเดอร์นอกระบบ
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{r.riderPhone || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {r.orderCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600">
                        ฿{r.totalFare.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setExpanded(open ? null : key)}
                          className="text-xs font-semibold text-orange-600"
                        >
                          {open ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-t border-gray-100 bg-gray-50/60">
                        <td colSpan={4} className="px-4 py-3">
                          <p className="text-xs font-bold text-gray-600 mb-2">แยกตามวัน</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                            {r.byDay.map((d) => (
                              <div key={d.date} className="rounded-lg bg-white border border-gray-100 p-2">
                                <p className="text-[10px] text-gray-400">{d.date}</p>
                                <p className="text-sm font-bold text-orange-600">฿{d.fare.toLocaleString()}</p>
                                <p className="text-[10px] text-gray-500">{d.count} ออเดอร์</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs font-bold text-gray-600 mb-2">ออเดอร์</p>
                          <ul className="space-y-1 text-xs text-gray-700">
                            {r.orders.map((o) => (
                              <li key={o.id} className="flex items-center justify-between gap-2 bg-white border border-gray-100 rounded-lg px-2 py-1.5">
                                <span className="font-mono text-[10px] text-gray-400">{o.id}</span>
                                <span className="text-[10px] text-gray-500">
                                  {new Date(o.completedAt).toLocaleString("th-TH", {
                                    day: "numeric", month: "short",
                                    hour: "2-digit", minute: "2-digit",
                                  })}
                                </span>
                                <span className="font-bold text-orange-600">฿{o.fare.toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}
