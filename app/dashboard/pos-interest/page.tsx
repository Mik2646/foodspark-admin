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

// เปิด POS = ให้ plan "pro" หมดอายุอีก 1 ปี (manual; ราคาเก็บนอกระบบ)
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export default function PosInterestPage() {
  const utils = trpc.useUtils();
  const { data = [], isLoading, error } = trpc.admin.listPosInterest.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: payments = [] } = (trpc.admin as any).listPosPayments.useQuery(undefined, { refetchInterval: 30000 });
  const confirmPay = (trpc.admin as any).confirmPosPayment.useMutation({
    onSuccess: () => { utils.admin.listPosPayments.invalidate(); utils.admin.listPosInterest.invalidate(); },
  });

  const setPlan = trpc.admin.setMerchantPlan.useMutation({
    onSuccess: () => utils.admin.listPosInterest.invalidate(),
  });

  const enablePos = (restaurantId: string) =>
    setPlan.mutate({ restaurantId, plan: "pro", proUntil: new Date(Date.now() + ONE_YEAR_MS).toISOString() });
  const disablePos = (restaurantId: string) =>
    setPlan.mutate({ restaurantId, plan: "free", proUntil: null });

  const busyId = setPlan.isPending ? setPlan.variables?.restaurantId : undefined;
  const activeCount = data.filter((r) => r.isPro).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
          <MonitorSmartphone className="w-6 h-6 text-orange-500" /> ร้านที่สนใจ POS
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          ร้านที่กดสนใจระบบ POS จาก teaser ในแอป — กด &ldquo;เปิด POS&rdquo; เพื่อให้ร้านนั้นใช้งานได้ทันที
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-2">
          <span className="text-sm text-gray-600">สนใจทั้งหมด</span>
          <span className="text-xl font-bold text-orange-600">{data.length}</span>
          <span className="text-sm text-gray-500">ร้าน</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-green-100 bg-green-50 px-4 py-2">
          <span className="text-sm text-gray-600">เปิด POS แล้ว</span>
          <span className="text-xl font-bold text-green-600">{activeCount}</span>
          <span className="text-sm text-gray-500">ร้าน</span>
        </div>
      </div>

      {payments.length > 0 ? (
        <div className="mb-6 bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 text-sm font-medium text-amber-700">รอยืนยันการชำระเงิน ({payments.length})</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">ร้าน</th>
                <th className="px-4 py-3 font-medium">รอบ</th>
                <th className="px-4 py-3 font-medium">ยอด</th>
                <th className="px-4 py-3 font-medium">สลิป</th>
                <th className="px-4 py-3 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.restaurantName ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{p.cycle === "annual" ? "รายปี" : "รายเดือน"}</td>
                  <td className="px-4 py-3 text-gray-700">฿{p.amount}</td>
                  <td className="px-4 py-3">{p.slipUrl ? <a href={p.slipUrl} target="_blank" className="text-orange-600 underline">ดูสลิป</a> : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => confirmPay.mutate({ paymentId: p.id })}
                      disabled={confirmPay.isPending}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {confirmPay.isPending ? "..." : "ยืนยัน & เปิด POS"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

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
                  <th className="px-4 py-3 font-medium">สถานะ POS</th>
                  <th className="px-4 py-3 font-medium text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const busy = busyId === row.restaurantId;
                  return (
                    <tr key={row.restaurantId} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.restaurantName ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{row.ownerName ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{row.ownerPhone ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{formatThaiDateTime(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        {row.isPro ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                            เปิดใช้งาน
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            ยังไม่เปิด
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.isPro ? (
                          <button
                            onClick={() => disablePos(row.restaurantId)}
                            disabled={busy}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                          >
                            {busy ? "..." : "ปิด POS"}
                          </button>
                        ) : (
                          <button
                            onClick={() => enablePos(row.restaurantId)}
                            disabled={busy}
                            className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                          >
                            {busy ? "..." : "เปิด POS"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
