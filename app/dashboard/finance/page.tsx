"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { BanknoteArrowDown, CheckCircle2, Download, RefreshCcw, XCircle } from "lucide-react";

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

function exportCsv(rows: Array<Record<string, unknown>>, filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinancePage() {
  const utils = trpc.useUtils();
  const [days, setDays] = useState(30);
  const [payoutStatus, setPayoutStatus] = useState<"pending" | "paid" | "rejected" | "all">("pending");
  const [topupStatus, setTopupStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [note, setNote] = useState("");
  const [topupNoteMap, setTopupNoteMap] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const settlement = trpc.admin.financeSettlement.useQuery({ days });
  const payoutOverview = trpc.payout.adminOverview.useQuery();
  const payoutList = trpc.payout.adminList.useQuery({ status: payoutStatus }, { refetchInterval: 15000 });
  const topupList = trpc.payout.adminTopupList.useQuery({ status: topupStatus }, { refetchInterval: 15000 });

  const markPaid = trpc.payout.adminMarkPaid.useMutation({
    onSuccess: async () => {
      await utils.payout.adminList.invalidate();
      await utils.payout.adminOverview.invalidate();
      setNotice("อัปเดต payout เป็น paid แล้ว");
      setTimeout(() => setNotice(null), 1800);
    },
  });

  const rejectPayout = trpc.payout.adminReject.useMutation({
    onSuccess: async () => {
      await utils.payout.adminList.invalidate();
      await utils.payout.adminOverview.invalidate();
      setNotice("ปฏิเสธ payout แล้ว");
      setTimeout(() => setNotice(null), 1800);
    },
  });

  const approveTopup = trpc.payout.adminApproveTopup.useMutation({
    onSuccess: async () => {
      await utils.payout.adminTopupList.invalidate();
      await utils.payout.adminOverview.invalidate();
      setNotice("อนุมัติเติมเงินไรเดอร์แล้ว");
      setTimeout(() => setNotice(null), 1800);
    },
  });

  const rejectTopup = trpc.payout.adminRejectTopup.useMutation({
    onSuccess: async () => {
      await utils.payout.adminTopupList.invalidate();
      await utils.payout.adminOverview.invalidate();
      setNotice("ปฏิเสธรายการเติมเงินแล้ว");
      setTimeout(() => setNotice(null), 1800);
    },
  });

  const pendingCount = useMemo(
    () => (payoutList.data || []).filter((p) => p.status === "pending").length,
    [payoutList.data],
  );
  const pendingTopupCount = useMemo(
    () => (topupList.data || []).filter((t) => t.status === "pending").length,
    [topupList.data],
  );
  const pendingTopupAmount = useMemo(
    () => (topupList.data || []).filter((t) => t.status === "pending").reduce((sum, t) => sum + t.amount, 0),
    [topupList.data],
  );

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
            <BanknoteArrowDown className="w-6 h-6 text-orange-500" /> การเงิน / Settlement
          </h1>
          <p className="text-sm text-gray-500 mt-1">ดูรายได้ระบบ, สรุปยอดร้าน/ไรเดอร์ และอนุมัติการถอนเงิน</p>
        </div>
        <button
          onClick={() => {
            settlement.refetch();
            payoutOverview.refetch();
            payoutList.refetch();
            topupList.refetch();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCcw className="w-4 h-4" /> รีเฟรช
        </button>
      </div>

      {notice && <div className="mb-4 rounded-lg bg-green-50 border border-green-100 text-green-700 text-sm px-3 py-2">{notice}</div>}
      {(settlement.error || payoutOverview.error || payoutList.error || topupList.error) && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2">
          {settlement.error?.message || payoutOverview.error?.message || payoutList.error?.message || topupList.error?.message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <div className="rounded-xl border border-gray-100 bg-white p-3"><div className="text-xs text-gray-500">ยอดรวมระบบ</div><div className="text-xl font-bold">฿{payoutOverview.data?.totalRevenue?.toLocaleString() ?? 0}</div></div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><div className="text-xs text-blue-600">ค่าแพลตฟอร์ม</div><div className="text-xl font-bold text-blue-700">฿{payoutOverview.data?.platformFee?.toLocaleString() ?? 0}</div></div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><div className="text-xs text-emerald-600">ไรเดอร์รวม</div><div className="text-xl font-bold text-emerald-700">฿{payoutOverview.data?.riderEarnings?.toLocaleString() ?? 0}</div></div>
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-3"><div className="text-xs text-orange-600">ร้านรวม</div><div className="text-xl font-bold text-orange-700">฿{payoutOverview.data?.restaurantRevenue?.toLocaleString() ?? 0}</div></div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3"><div className="text-xs text-amber-600">ถอนเงินค้างจ่าย</div><div className="text-xl font-bold text-amber-700">฿{payoutOverview.data?.pendingPayouts?.toLocaleString() ?? 0}</div></div>
      </div>

      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 mb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">เติมเงินไรเดอร์รอตรวจ</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              ไรเดอร์ต้องโอนเงินจริงและส่งสลิป รายการจะเพิ่มยอดกระเป๋าได้หลังแอดมินอนุมัติเท่านั้น
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={topupStatus}
              onChange={(e) => setTopupStatus(e.target.value as "pending" | "approved" | "rejected" | "all")}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
            >
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="all">all</option>
            </select>
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
              ค้าง: {pendingTopupCount} / ฿{pendingTopupAmount.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs text-gray-500">ID</th>
                <th className="text-left py-2 text-xs text-gray-500">ไรเดอร์</th>
                <th className="text-left py-2 text-xs text-gray-500">ยอด</th>
                <th className="text-left py-2 text-xs text-gray-500">สลิป</th>
                <th className="text-left py-2 text-xs text-gray-500">สถานะ</th>
                <th className="text-left py-2 text-xs text-gray-500">เวลา</th>
                <th className="text-left py-2 text-xs text-gray-500">หมายเหตุ</th>
                <th className="text-right py-2 text-xs text-gray-500">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {(topupList.data || []).map((row) => (
                <tr key={row.id} className="border-b border-gray-50 align-top">
                  <td className="py-3 font-mono text-xs text-gray-500">#{row.id}</td>
                  <td className="py-3">
                    <div className="font-medium text-gray-900">{row.riderName || `Rider #${row.riderId}`}</div>
                    <div className="text-xs text-gray-500">{row.riderPhone || "-"}</div>
                  </td>
                  <td className="py-3 font-semibold text-orange-600">฿{row.amount.toLocaleString()}</td>
                  <td className="py-3">
                    {row.slipImage ? (
                      <a
                        href={row.slipImage}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        เปิดสลิป
                      </a>
                    ) : (
                      <span className="text-xs text-red-500">ไม่มีสลิป</span>
                    )}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        row.status === "approved"
                          ? "bg-green-50 text-green-700"
                          : row.status === "rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {row.status}
                    </span>
                    {row.settledOrders > 0 && (
                      <div className="mt-1 text-[11px] text-green-700">ปิดยอดค้าง {row.settledOrders} ออเดอร์</div>
                    )}
                  </td>
                  <td className="py-3 text-xs text-gray-500">{formatThaiDateTime(row.createdAt)}</td>
                  <td className="py-3">
                    {row.status === "pending" ? (
                      <input
                        value={topupNoteMap[row.id] ?? ""}
                        onChange={(e) => setTopupNoteMap((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        className="w-48 rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                        placeholder="หมายเหตุ"
                      />
                    ) : (
                      <span className="text-xs text-gray-500">{row.adminNote || "-"}</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => approveTopup.mutate({ topupId: row.id, note: topupNoteMap[row.id]?.trim() || undefined })}
                        disabled={row.status !== "pending" || approveTopup.isPending || rejectTopup.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-30"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> อนุมัติ
                      </button>
                      <button
                        onClick={() => {
                          const topupNote = topupNoteMap[row.id]?.trim();
                          if (!topupNote) {
                            setNotice("กรอกหมายเหตุก่อนปฏิเสธรายการเติมเงิน");
                            setTimeout(() => setNotice(null), 1800);
                            return;
                          }
                          rejectTopup.mutate({ topupId: row.id, note: topupNote });
                        }}
                        disabled={row.status !== "pending" || approveTopup.isPending || rejectTopup.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-30"
                      >
                        <XCircle className="h-3.5 w-3.5" /> ปฏิเสธ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {topupList.isLoading && <div className="py-8 text-center text-sm text-gray-400">กำลังโหลดรายการเติมเงิน...</div>}
          {!topupList.isLoading && topupList.data?.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">ไม่มีรายการเติมเงินไรเดอร์</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">สรุป Settlement</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">ช่วงเวลา</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
            >
              <option value={7}>7 วัน</option>
              <option value={14}>14 วัน</option>
              <option value={30}>30 วัน</option>
              <option value={60}>60 วัน</option>
              <option value={90}>90 วัน</option>
            </select>
            <button
              onClick={() => {
                const rows = (settlement.data?.merchantSettlements || []).map((m) => ({
                  restaurantId: m.restaurantId,
                  restaurantName: m.restaurantName,
                  orders: m.orders,
                  gross: m.gross,
                  net: m.net,
                }));
                exportCsv(rows, `merchant-settlement-${Date.now()}.csv`);
              }}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-3.5 h-3.5" /> Export ร้าน
            </button>
            <button
              onClick={() => {
                const rows = (settlement.data?.riderSettlements || []).map((r) => ({
                  riderId: r.riderId,
                  riderName: r.riderName,
                  orders: r.orders,
                  earnings: r.earnings,
                }));
                exportCsv(rows, `rider-settlement-${Date.now()}.csv`);
              }}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-3.5 h-3.5" /> Export ไรเดอร์
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 mb-2">Top ร้าน (สุทธิ)</h3>
            <div className="max-h-64 overflow-auto rounded-lg border border-gray-100">
              {(settlement.data?.merchantSettlements || []).slice(0, 20).map((m) => (
                <div key={m.restaurantId} className="px-3 py-2 border-b border-gray-100 last:border-0 text-sm flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-900">{m.restaurantName}</div>
                    <div className="text-xs text-gray-500">{m.orders} ออเดอร์</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">ยอดสุทธิร้าน</div>
                    <div className="font-semibold text-gray-900">฿{m.net.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-500 mb-2">Top ไรเดอร์ (รายได้)</h3>
            <div className="max-h-64 overflow-auto rounded-lg border border-gray-100">
              {(settlement.data?.riderSettlements || []).slice(0, 20).map((r) => (
                <div key={r.riderId} className="px-3 py-2 border-b border-gray-100 last:border-0 text-sm flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-900">{r.riderName}</div>
                    <div className="text-xs text-gray-500">{r.orders} ออเดอร์</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">รายได้ไรเดอร์</div>
                    <div className="font-semibold text-gray-900">฿{r.earnings.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">คำขอถอนเงิน</h2>
          <div className="flex items-center gap-2">
            <select
              value={payoutStatus}
              onChange={(e) => setPayoutStatus(e.target.value as "pending" | "paid" | "rejected" | "all")}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
            >
              <option value="pending">pending</option>
              <option value="paid">paid</option>
              <option value="rejected">rejected</option>
              <option value="all">all</option>
            </select>
            <span className="text-xs text-gray-500">ค้าง: {pendingCount}</span>
          </div>
        </div>

        <div className="mb-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="หมายเหตุเวลาจ่าย/ปฏิเสธ (optional)"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs text-gray-500">ID</th>
                <th className="text-left py-2 text-xs text-gray-500">ผู้ขอ</th>
                <th className="text-left py-2 text-xs text-gray-500">บทบาท</th>
                <th className="text-left py-2 text-xs text-gray-500">ยอด</th>
                <th className="text-left py-2 text-xs text-gray-500">สถานะ</th>
                <th className="text-left py-2 text-xs text-gray-500">เวลา</th>
                <th className="text-right py-2 text-xs text-gray-500">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {(payoutList.data || []).map((row) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="py-2">#{row.id}</td>
                  <td className="py-2">{row.userName || "-"}</td>
                  <td className="py-2">{row.role}</td>
                  <td className="py-2">฿{row.amount.toLocaleString()}</td>
                  <td className="py-2">{row.status}</td>
                  <td className="py-2 text-xs text-gray-500">{formatThaiDateTime(row.createdAt)}</td>
                  <td className="py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => markPaid.mutate({ payoutId: row.id, note: note.trim() || undefined })}
                        disabled={row.status !== "pending" || markPaid.isPending}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-500 text-white disabled:opacity-30"
                      >
                        จ่ายแล้ว
                      </button>
                      <button
                        onClick={() => rejectPayout.mutate({ payoutId: row.id, note: note.trim() || "ไม่ผ่านเกณฑ์" })}
                        disabled={row.status !== "pending" || rejectPayout.isPending}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white disabled:opacity-30"
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payoutList.data?.length === 0 && <div className="py-8 text-center text-sm text-gray-400">ไม่มีคำขอถอนเงิน</div>}
        </div>
      </div>
    </div>
  );
}
