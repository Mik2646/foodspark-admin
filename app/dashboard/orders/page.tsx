"use client";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Trash2,
  X,
  User,
  Phone,
  Mail,
  Store,
  CalendarClock,
  Footprints,
  Bike,
  CreditCard,
  MapPin,
  Hash,
  Clock,
  ShoppingCart,
  Ban,
  Send,
  CheckCircle2,
} from "lucide-react";

const STATUSES = ["", "pending", "preparing", "ready", "delivering", "delivered", "cancelled"] as const;
const STATUS_LABELS: Record<string, string> = {
  "": "ทั้งหมด",
  pending: "รอยืนยัน",
  preparing: "กำลังเตรียม",
  ready: "พร้อมส่ง",
  delivering: "กำลังส่ง",
  delivered: "ส่งแล้ว",
  cancelled: "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  preparing: "bg-blue-100 text-blue-700",
  ready: "bg-indigo-100 text-indigo-700",
  delivering: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

// Cash-only — PromptPay + Wallet payment options removed. Legacy
// orders may still carry non-cash methods, so the renderer falls back
// to the raw value when it's not in the map.
const PAYMENT_LABELS: Record<string, string> = {
  cash: "เงินสด",
};

export default function OrdersPage() {
  const [filterStatus, setFilterStatus] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [detailOpen, setDetailOpen] = useState<string | null>(null);

  const { data: orders = [], isLoading, refetch } = trpc.admin.listOrders.useQuery(
    { status: filterStatus || undefined },
    { refetchInterval: 15000 },
  );
  const updateStatus = trpc.admin.updateOrderStatus.useMutation({ onSuccess: () => refetch() });
  const deleteOrder = trpc.admin.deleteOrder.useMutation({
    onSuccess: () => {
      setConfirmDelete(null);
      refetch();
    },
  });
  const deleteOrders = trpc.admin.deleteOrders.useMutation({
    onSuccess: () => {
      setSelected(new Set());
      setBulkConfirm(false);
      refetch();
    },
  });

  // Drop selections that are no longer in the visible list.
  useEffect(() => {
    if (selected.size === 0) return;
    const visible = new Set(orders.map((o) => o.id));
    let changed = false;
    const next = new Set<string>();
    selected.forEach((id) => {
      if (visible.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelected(next);
  }, [orders, selected]);

  const allVisibleSelected = orders.length > 0 && orders.every((o) => selected.has(o.id));
  const someSelected = selected.size > 0 && !allVisibleSelected;
  const headerCbRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    if (allVisibleSelected) setSelected(new Set());
    else setSelected(new Set(orders.map((o) => o.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ออเดอร์ทั้งหมด</h1>
        <span className="text-sm text-gray-400">{orders.length} รายการ</span>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterStatus === s ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between mb-3 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl">
          <span className="text-sm text-gray-700">
            เลือกแล้ว <b className="text-orange-600">{selected.size}</b> รายการ
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-xs rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ยกเลิกการเลือก
            </button>
            <button
              onClick={() => setBulkConfirm(true)}
              className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ลบ {selected.size} รายการ
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-10 text-gray-400 text-sm">กำลังโหลด...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 w-10">
                  <input
                    ref={headerCbRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                    aria-label="เลือกทั้งหมด"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Order ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ร้าน</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ประเภท</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ที่อยู่</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ไรเดอร์</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ยอด</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">เวลา</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const isPreorder = (o as { orderType?: string | null }).orderType === "preorder";
                const isPickup = (o as { deliveryType?: string | null }).deliveryType === "pickup";
                return (
                  <tr
                    key={o.id}
                    className={`border-b border-gray-50 transition-colors cursor-pointer ${
                      selected.has(o.id) ? "bg-orange-50/50" : "hover:bg-gray-50/50"
                    }`}
                    onClick={(e) => {
                      // Don't open detail when clicking interactive elements
                      const t = e.target as HTMLElement;
                      if (t.closest("input,select,button,a")) return;
                      setDetailOpen(o.id);
                    }}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggleOne(o.id)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                        aria-label={`เลือก ${o.id.slice(-10)}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setDetailOpen(o.id)}
                        className="hover:text-orange-600 transition-colors"
                      >
                        #{o.id.slice(-10)}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{o.restaurantName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {isPreorder && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                            <CalendarClock className="w-2.5 h-2.5" /> พรีออเดอร์
                          </span>
                        )}
                        {isPickup && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                            <Footprints className="w-2.5 h-2.5" /> รับที่ร้าน
                          </span>
                        )}
                        {!isPreorder && !isPickup && (
                          <span className="text-[11px] text-gray-400">เดลิเวอรี</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate text-xs">{o.deliveryAddress}</td>
                    <td className="px-4 py-3 text-gray-500">{o.riderName ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">฿{o.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleString("th-TH", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <select
                          value={o.status}
                          disabled={updateStatus.isPending}
                          onChange={(e) => updateStatus.mutate({ orderId: o.id, status: e.target.value as any })}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50"
                        >
                          {(["pending", "preparing", "ready", "delivering", "delivered", "cancelled"] as const).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        {confirmDelete === o.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteOrder.mutate({ orderId: o.id })}
                              disabled={deleteOrder.isPending}
                              className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                            >
                              ยืนยัน
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(o.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!isLoading && orders.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">ไม่มีออเดอร์</div>
        )}
      </div>

      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              ลบออเดอร์ {selected.size} รายการ?
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              การกระทำนี้ลบถาวร ไม่สามารถย้อนกลับได้ — ข้อมูลในตะกร้า, แชท, dispute และ incident
              ที่ผูกกับออเดอร์เหล่านี้จะถูกลบทั้งหมด
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBulkConfirm(false)}
                disabled={deleteOrders.isPending}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => deleteOrders.mutate({ orderIds: Array.from(selected) })}
                disabled={deleteOrders.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleteOrders.isPending ? "กำลังลบ..." : `ลบทั้งหมด`}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailOpen && (
        <OrderDetailModal orderId={detailOpen} onClose={() => setDetailOpen(null)} />
      )}
    </div>
  );
}

/**
 * Full-order modal — fetches admin.getOrderDetail when opened so we
 * don't bloat the list query. Shows the customer (name + contact),
 * the restaurant + owner, the priced items breakdown, and payment +
 * type flags so the admin has everything they need to triage a
 * specific order without leaving the list.
 */
// Preset cancel reasons — fastest path is "click → send". The textarea
// is for one-off cases the presets don't cover. Tweak this list when
// the team finds new recurring reasons.
const CANCEL_REASON_PRESETS = [
  "ร้านยังไม่เปิด",
  "ของหมด ไม่สามารถทำได้",
  "ลูกค้าขอยกเลิก",
  "ที่อยู่ส่งไม่ถึง / นอกพื้นที่",
  "ไม่มีไรเดอร์รับงาน",
  "ร้านไม่ตอบรับนาน",
];

function OrderDetailModal({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.getOrderDetail.useQuery({ orderId });
  const [cancelPanelOpen, setCancelPanelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelResult, setCancelResult] = useState<
    | { ok: true; refundAmount?: number; refundedToWallet?: boolean }
    | null
  >(null);
  const cancelOrder = trpc.admin.cancelOrderWithReason.useMutation({
    onSuccess: (res) => {
      setCancelResult(res);
      utils.admin.getOrderDetail.invalidate({ orderId });
      utils.admin.listOrders.invalidate();
    },
    onError: (e) => alert("ยกเลิกไม่สำเร็จ: " + e.message),
  });

  // Esc to close — keeps the modal keyboard-friendly for admin power users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const o = data?.order;
  const customer = data?.customer;
  const items = data?.items ?? [];
  const restaurant = data?.restaurant;
  const merchantOwner = data?.merchantOwner;

  const isPreorder = o?.orderType === "preorder";
  const isPickup = o?.deliveryType === "pickup";

  const formatDateTime = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 px-5 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-mono">{orderId.slice(-10)}</span>
              </h2>
              {o && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(o.createdAt)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-10">กำลังโหลด...</p>
          ) : !o ? (
            <p className="text-sm text-red-500 text-center py-10">ไม่พบออเดอร์</p>
          ) : (
            <>
              {/* Status + type pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABELS[o.status] ?? o.status}
                </span>
                {isPreorder && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                    <CalendarClock className="w-3 h-3" /> พรีออเดอร์
                  </span>
                )}
                {isPickup ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                    <Footprints className="w-3 h-3" /> รับที่ร้าน
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                    <Bike className="w-3 h-3" /> เดลิเวอรี
                  </span>
                )}
                {/* Payment — cash-only platform. Legacy non-cash methods
                    fall through to the raw value so admin can still ID them. */}
                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                  <CreditCard className="w-3 h-3" />
                  {!o.paymentMethod || o.paymentMethod === "cash"
                    ? "เงินสด"
                    : (PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod)}
                </span>
              </div>

              {/* Customer */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  ลูกค้า
                </p>
                {customer ? (
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <User className="w-4 h-4 text-gray-400" />
                      {customer.name ?? "(ไม่มีชื่อ)"}
                      <span className="text-gray-400 font-normal text-xs">#{customer.id}</span>
                    </p>
                    {customer.phone && (
                      <a
                        href={`tel:${customer.phone.replace(/\D/g, "")}`}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <Phone className="w-4 h-4" />
                        {customer.phone}
                      </a>
                    )}
                    {customer.email && (
                      <p className="flex items-center gap-2 text-xs text-gray-500">
                        <Mail className="w-3.5 h-3.5" />
                        {customer.email}
                      </p>
                    )}
                    {customer.openId && (
                      <p className="text-[10px] text-gray-400 font-mono break-all">
                        {customer.openId}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Guest order (userId={o.userId})
                  </p>
                )}
              </div>

              {/* Restaurant */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  ร้านอาหาร
                </p>
                <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Store className="w-4 h-4 text-gray-400" />
                  {restaurant?.name ?? o.restaurantName}
                </p>
                {restaurant?.address && (
                  <p className="text-xs text-gray-500 mt-1 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    {restaurant.address}
                  </p>
                )}
                {merchantOwner && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs space-y-1">
                    <p className="text-gray-600">
                      เจ้าของ: <span className="font-semibold">{merchantOwner.name ?? "—"}</span>
                    </p>
                    {merchantOwner.phone && (
                      <a
                        href={`tel:${merchantOwner.phone.replace(/\D/g, "")}`}
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {merchantOwner.phone}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Delivery */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  จัดส่ง
                </p>
                <p className="text-sm text-gray-900 flex items-start gap-1.5">
                  {isPickup ? (
                    <Footprints className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  ) : (
                    <MapPin className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  )}
                  <span className="break-words">{o.deliveryAddress ?? "—"}</span>
                </p>
                {o.deliveryNote && (
                  <p className="text-xs text-gray-500 mt-2">
                    หมายเหตุ: <span className="text-gray-700">{o.deliveryNote}</span>
                  </p>
                )}
                {o.scheduledFor && (
                  <p className="text-xs text-amber-700 mt-2 font-semibold flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5" />
                    นัดส่ง: {formatDateTime(o.scheduledFor)}
                  </p>
                )}
                {o.riderName && (
                  <p className="text-xs text-purple-700 mt-2 flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5" />
                    ไรเดอร์: <span className="font-semibold">{o.riderName}</span>
                  </p>
                )}
                {isPickup && o.pickupCode && o.status !== "delivered" && o.status !== "cancelled" && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">
                      Pickup code
                    </p>
                    <p className="text-2xl font-extrabold text-emerald-900 tracking-[0.25em] mt-1">
                      {o.pickupCode}
                    </p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    รายการอาหาร ({items.length})
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((it) => (
                    <div key={it.id} className="px-4 py-3 flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {it.quantity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {it.name}
                        </p>
                        {(it as { specialRequest?: string | null }).specialRequest && (
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {(it as { specialRequest?: string | null }).specialRequest}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-900 tabular-nums">
                        ฿{(it.price * it.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="px-4 py-6 text-sm text-gray-400 text-center">
                      ไม่มีรายการ
                    </p>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>ค่าส่ง</span>
                  <span className="tabular-nums">฿{(o.deliveryFee ?? 0).toLocaleString()}</span>
                </div>
                {(o.tipAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>ทิป</span>
                    <span className="tabular-nums">฿{(o.tipAmount ?? 0).toLocaleString()}</span>
                  </div>
                )}
                {(o.promoDiscount ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>ส่วนลด ({o.promoCode})</span>
                    <span className="tabular-nums">−฿{(o.promoDiscount ?? 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 mt-1 border-t border-orange-200 text-base font-extrabold text-gray-900">
                  <span>ยอดรวม</span>
                  <span className="text-orange-600 tabular-nums">
                    ฿{o.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Admin cancel action — shows only while the order is in
                  a cancellable state. Confirmation result reports the
                  refund amount + destination (wallet vs admin-handled). */}
              {!["cancelled", "delivered"].includes(o.status) && !cancelResult && (
                <div className="border-t border-gray-100 pt-4">
                  {!cancelPanelOpen ? (
                    <button
                      onClick={() => setCancelPanelOpen(true)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-sm font-bold rounded-xl transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                      ยกเลิกออเดอร์ + แจ้งลูกค้า
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-bold text-red-900">
                        ยกเลิกออเดอร์ + ส่งข้อความแจ้งลูกค้าทาง LINE
                      </p>
                      <p className="text-xs text-red-700 leading-relaxed">
                        เลือกเหตุผลที่ใช้บ่อย หรือพิมพ์เหตุผลเองด้านล่าง — ลูกค้าจะได้รับการแจ้งเตือนพร้อมเหตุผล
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {CANCEL_REASON_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCancelReason(preset)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                              cancelReason === preset
                                ? "bg-red-500 text-white border-red-500"
                                : "bg-white text-red-700 border-red-200 hover:bg-red-100"
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="หรือพิมพ์เหตุผลเอง..."
                        rows={2}
                        maxLength={280}
                        className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setCancelPanelOpen(false);
                            setCancelReason("");
                          }}
                          className="px-4 py-2 text-sm rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
                        >
                          ยกเลิก
                        </button>
                        <button
                          onClick={() =>
                            cancelOrder.mutate({
                              orderId,
                              reason: cancelReason.trim(),
                            })
                          }
                          disabled={
                            !cancelReason.trim() || cancelOrder.isPending
                          }
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          {cancelOrder.isPending
                            ? "กำลังยกเลิก..."
                            : "ยืนยันยกเลิก + แจ้งลูกค้า"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Success card — replaces the cancel panel after we
                  successfully push the LINE message + refund. */}
              {cancelResult && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-green-900">
                        ยกเลิกสำเร็จ + แจ้งลูกค้าทาง LINE แล้ว
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        ไม่มีการคืนเงิน (จ่ายเงินสดปลายทาง)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
