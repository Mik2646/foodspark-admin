"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { HandCoins, Plus } from "lucide-react";

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

const statusColors: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  investigating: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  refunded: "bg-purple-100 text-purple-700",
};

export default function DisputesPage() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<"all" | "open" | "investigating" | "approved" | "rejected" | "refunded">("all");
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [requestType, setRequestType] = useState<"full_refund" | "partial_refund" | "complaint" | "other">("other");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const { data = [], isLoading, error } = trpc.admin.listDisputes.useQuery({ status }, { refetchInterval: 15000 });

  const createDispute = trpc.admin.createDispute.useMutation({
    onSuccess: async () => {
      await utils.admin.listDisputes.invalidate();
      setOrderId("");
      setReason("");
      setDetail("");
      setRequestType("other");
      setRequestedAmount("");
      setNotice("สร้าง dispute แล้ว");
      setTimeout(() => setNotice(null), 1800);
    },
  });

  const updateDispute = trpc.admin.updateDispute.useMutation({
    onSuccess: async () => {
      await utils.admin.listDisputes.invalidate();
      setNotice("อัปเดตสถานะแล้ว");
      setTimeout(() => setNotice(null), 1800);
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
          <HandCoins className="w-6 h-6 text-orange-500" /> Refund / Dispute Center
        </h1>
        <p className="text-sm text-gray-500 mt-1">จัดการคำขอคืนเงินและข้อพิพาทของออเดอร์</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">สร้างเคส dispute แบบ manual</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Order ID"
            className="md:col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="เหตุผล"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as "full_refund" | "partial_refund" | "complaint" | "other")}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="other">อื่นๆ</option>
            <option value="complaint">ร้องเรียน</option>
            <option value="partial_refund">คืนเงินบางส่วน</option>
            <option value="full_refund">คืนเงินเต็มจำนวน</option>
          </select>
          <input
            value={requestedAmount}
            onChange={(e) => setRequestedAmount(e.target.value)}
            placeholder="ยอดขอคืน (ถ้ามี)"
            type="number"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            onClick={() =>
              createDispute.mutate({
                orderId: orderId.trim(),
                reason: reason.trim(),
                requestType,
                detail: detail.trim() || undefined,
                requestedAmount: requestedAmount ? Number(requestedAmount) : null,
              })
            }
            disabled={!orderId.trim() || !reason.trim() || createDispute.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 text-white text-sm font-semibold px-3 py-2 hover:bg-orange-600 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> เพิ่มเคส
          </button>
        </div>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          className="mt-3 w-full min-h-[70px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
          placeholder="รายละเอียดเพิ่มเติม"
        />
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {[
          { key: "all", label: "ทั้งหมด" },
          { key: "open", label: "เปิดเคส" },
          { key: "investigating", label: "กำลังตรวจ" },
          { key: "approved", label: "อนุมัติ" },
          { key: "rejected", label: "ปฏิเสธ" },
          { key: "refunded", label: "คืนเงินแล้ว" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setStatus(item.key as "all" | "open" | "investigating" | "approved" | "rejected" | "refunded")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              status === item.key ? "bg-orange-500 text-white border-orange-500" : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice && <div className="mb-4 rounded-lg bg-green-50 border border-green-100 text-green-700 text-sm px-3 py-2">{notice}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2">{error.message}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">กำลังโหลด disputes...</div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">ไม่มีเคส dispute</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-400">#{item.id}</span>
                      <span className="text-xs text-gray-500">{item.requestType}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Order {item.orderId.slice(-8)} · {item.reason}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{item.detail || "-"}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      ลูกค้า: {item.customerName || "-"} · ร้าน: {item.restaurantName || "-"} · ยอดออเดอร์: ฿{item.orderTotal ?? 0}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">เปิดเคสเมื่อ {formatThaiDateTime(item.createdAt)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        updateDispute.mutate({
                          disputeId: item.id,
                          status: e.target.value as "open" | "investigating" | "approved" | "rejected" | "refunded",
                          resolvedAmount: item.requestedAmount ?? null,
                        })
                      }
                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
                    >
                      <option value="open">open</option>
                      <option value="investigating">investigating</option>
                      <option value="approved">approved</option>
                      <option value="rejected">rejected</option>
                      <option value="refunded">refunded</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
