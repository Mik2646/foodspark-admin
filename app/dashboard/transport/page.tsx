"use client";
/**
 * /dashboard/transport — admin operator console for Phase 5
 * บริการรับส่ง (transport service) orders.
 *
 * Operators see pending/active/closed orders, assign a rider by name +
 * phone (rider native app integration comes later), and walk the order
 * through the status flow. Each transition fires a LINE notify to the
 * customer.
 */
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Bike,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  ShoppingBag,
  StickyNote,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

type TransportStatus =
  | "pending"
  | "assigned"
  | "arriving"
  | "in_progress"
  | "completed"
  | "cancelled";

const STATUS_TABS: Array<{
  key: TransportStatus | "all" | "active";
  label: string;
}> = [
  { key: "pending", label: "รอจ่ายงาน" },
  { key: "active", label: "กำลังให้บริการ" },
  { key: "completed", label: "เสร็จสิ้น" },
  { key: "cancelled", label: "ยกเลิก" },
  { key: "all", label: "ทั้งหมด" },
];

const STATUS_BADGE: Record<TransportStatus, { label: string; cls: string }> = {
  pending: { label: "รอจ่ายงาน", cls: "bg-amber-100 text-amber-700" },
  assigned: { label: "จ่ายงานแล้ว", cls: "bg-blue-100 text-blue-700" },
  arriving: { label: "กำลังมารับ", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "กำลังเดินทาง", cls: "bg-purple-100 text-purple-700" },
  completed: { label: "เสร็จสิ้น", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "ยกเลิก", cls: "bg-rose-100 text-rose-700" },
};

const SERVICE_META: Record<string, { label: string; Icon: React.ComponentType<{ size?: number }> }> = {
  ride: { label: "ส่งคน", Icon: Bike },
  shopping: { label: "ซื้อของแทน", Icon: ShoppingBag },
};

export default function AdminTransportPage() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["key"]>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Polling — 20s is fast enough that operators see new orders without
  // refreshing, but slow enough we're not hammering the API.
  const { data: all = [], isFetching, refetch } = trpc.admin.listTransport.useQuery(
    tab === "active" || tab === "all"
      ? { limit: 200 }
      : { status: tab as TransportStatus, limit: 200 },
    { refetchInterval: 20 * 1000 },
  );

  const rows = useMemo(() => {
    if (tab === "active") {
      return all.filter((r) =>
        ["assigned", "arriving", "in_progress"].includes(r.status),
      );
    }
    return all;
  }, [all, tab]);

  const selected = useMemo(
    () => (selectedId ? all.find((r) => r.id === selectedId) ?? null : null),
    [selectedId, all],
  );

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">บริการรับส่ง</h1>
          <p className="text-sm text-gray-400 mt-1">
            จ่ายงานให้ไรเดอร์ ติดตามสถานะ และยกเลิกออเดอร์เมื่อจำเป็น —
            ลูกค้าจะได้รับ LINE notify ทุกครั้งที่สถานะเปลี่ยน
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

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
              tab === t.key
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            ยังไม่มีออเดอร์ในสถานะนี้
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">บริการ</th>
                <th className="text-left px-3 py-2">เส้นทาง</th>
                <th className="text-left px-3 py-2">ลูกค้า</th>
                <th className="text-left px-3 py-2">ไรเดอร์</th>
                <th className="text-right px-3 py-2">ค่าบริการ</th>
                <th className="text-left px-3 py-2">สถานะ</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meta = SERVICE_META[r.serviceType] ?? { label: r.serviceType, Icon: Car };
                const ServiceIcon = meta.Icon;
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className="border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-3 py-2.5">
                      <div className="inline-flex items-center gap-1.5">
                        <ServiceIcon size={14} />
                        <span className="text-xs font-semibold text-gray-700">{meta.label}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{r.id}</div>
                    </td>
                    <td className="px-3 py-2.5 max-w-[260px]">
                      <div className="text-xs text-gray-700 truncate">
                        <MapPin size={10} className="inline text-emerald-500" /> {r.pickupAddress}
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        <MapPin size={10} className="inline text-rose-500" /> {r.dropoffAddress}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {r.distanceKm.toFixed(2)} กม.
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs font-semibold text-gray-700">{r.customerName ?? "—"}</div>
                      <div className="text-[10px] text-gray-500">{r.customerPhone}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.riderName ? (
                        <>
                          <div className="text-xs font-semibold text-blue-700">{r.riderName}</div>
                          <div className="text-[10px] text-gray-500">{r.riderPhone}</div>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">ยังไม่จ่ายงาน</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-orange-600">
                      ฿{r.totalFare.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[r.status as TransportStatus]?.cls ?? ""}`}>
                        {STATUS_BADGE[r.status as TransportStatus]?.label ?? r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <ChevronRight size={14} className="inline text-gray-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <TransportDetailModal
          order={selected}
          onClose={() => setSelectedId(null)}
          onChanged={async () => {
            await utils.admin.listTransport.invalidate();
            await utils.admin.getTransport.invalidate({ id: selected.id });
          }}
        />
      )}
    </div>
  );
}

function TransportDetailModal({
  order,
  onClose,
  onChanged,
}: {
  order: {
    id: string;
    customerUserId: number;
    customerName: string | null;
    customerPhone: string | null;
    serviceType: string;
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    pickupNote: string | null;
    dropoffAddress: string;
    dropoffLat: number;
    dropoffLng: number;
    dropoffNote: string | null;
    distanceKm: number;
    shoppingList: string | null;
    shoppingBudgetEstimate: number | null;
    passengerCount: number | null;
    baseFee: number;
    distanceFee: number;
    serviceFee: number;
    totalFare: number;
    status: string;
    riderName: string | null;
    riderPhone: string | null;
    notes: string | null;
    createdAt: string | Date;
  };
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [pickRiderId, setPickRiderId] = useState<number | "manual" | "">("");
  const [riderName, setRiderName] = useState(order.riderName ?? "");
  const [riderPhone, setRiderPhone] = useState(order.riderPhone ?? "");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  // Approved-rider list for the dropdown. The admin can also fall back
  // to manual entry for partner riders that aren't on the platform yet.
  const { data: approvedRiders = [] } = trpc.admin.listApprovedRiders.useQuery();

  useEffect(() => {
    setPickRiderId("");
    setRiderName(order.riderName ?? "");
    setRiderPhone(order.riderPhone ?? "");
    setCancelReason("");
    setShowCancel(false);
  }, [order.id, order.riderName, order.riderPhone]);

  // When a registered rider is picked, auto-fill name + phone so the
  // operator sees what's about to be sent.
  useEffect(() => {
    if (typeof pickRiderId === "number") {
      const r = approvedRiders.find((x) => x.id === pickRiderId);
      if (r) {
        setRiderName(r.name ?? "");
        setRiderPhone(r.phone ?? "");
      }
    }
  }, [pickRiderId, approvedRiders]);

  const assignMut = trpc.admin.assignTransportRider.useMutation({
    onSuccess: () => onChanged(),
  });
  const statusMut = trpc.admin.updateTransportStatus.useMutation({
    onSuccess: () => onChanged(),
  });
  const cancelMut = trpc.admin.cancelTransport.useMutation({
    onSuccess: async () => {
      await onChanged();
      onClose();
    },
  });

  const finalised = order.status === "completed" || order.status === "cancelled";
  const meta = SERVICE_META[order.serviceType] ?? { label: order.serviceType, Icon: Car };
  const ServiceIcon = meta.Icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-3"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <ServiceIcon size={16} />
            <h3 className="text-base font-extrabold text-gray-900">{meta.label}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[order.status as TransportStatus]?.cls ?? ""}`}>
              {STATUS_BADGE[order.status as TransportStatus]?.label ?? order.status}
            </span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Customer */}
          <DetailBlock title="ลูกค้า">
            <Row label="ชื่อ" value={order.customerName ?? "—"} />
            <Row label="เบอร์" value={order.customerPhone ?? "—"} />
            <p className="text-[10px] text-gray-400 font-mono mt-1">{order.id}</p>
          </DetailBlock>

          {/* Route */}
          <DetailBlock title="เส้นทาง">
            <div className="flex items-start gap-2">
              <MapPin size={12} className="text-emerald-500 mt-1 flex-shrink-0" />
              <div className="text-[13px] text-gray-800">
                <span className="text-[10px] text-gray-500 block">จุดรับ</span>
                {order.pickupAddress}
                {order.pickupNote && <span className="block text-[11px] text-gray-500 mt-0.5">{order.pickupNote}</span>}
                <a
                  href={`https://www.google.com/maps?q=${order.pickupLat},${order.pickupLng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="block text-[11px] text-orange-500 underline mt-0.5"
                >
                  เปิด Maps
                </a>
              </div>
            </div>
            <div className="flex items-start gap-2 mt-2">
              <MapPin size={12} className="text-rose-500 mt-1 flex-shrink-0" />
              <div className="text-[13px] text-gray-800">
                <span className="text-[10px] text-gray-500 block">จุดส่ง</span>
                {order.dropoffAddress}
                {order.dropoffNote && <span className="block text-[11px] text-gray-500 mt-0.5">{order.dropoffNote}</span>}
                <a
                  href={`https://www.google.com/maps?q=${order.dropoffLat},${order.dropoffLng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="block text-[11px] text-orange-500 underline mt-0.5"
                >
                  เปิด Maps
                </a>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">ระยะทาง {order.distanceKm.toFixed(2)} กม.</p>
          </DetailBlock>

          {order.serviceType === "shopping" && order.shoppingList && (
            <DetailBlock title="รายการที่ให้ไปซื้อ" icon={<ShoppingBag size={12} />}>
              <pre className="text-[12px] whitespace-pre-wrap font-sans text-gray-800 leading-snug">
                {order.shoppingList}
              </pre>
              {(order.shoppingBudgetEstimate ?? 0) > 0 && (
                <p className="text-[11px] text-gray-500 mt-1 inline-flex items-center gap-1">
                  <Wallet size={10} /> งบประมาณค่าของ ฿{(order.shoppingBudgetEstimate ?? 0).toLocaleString()}
                </p>
              )}
            </DetailBlock>
          )}

          {order.serviceType === "ride" && (
            <DetailBlock title="ผู้โดยสาร" icon={<Users size={12} />}>
              <p className="text-[13px] text-gray-800">{order.passengerCount ?? 1} คน</p>
            </DetailBlock>
          )}

          {order.notes && (
            <DetailBlock title="หมายเหตุ" icon={<StickyNote size={12} />}>
              <p className="text-[13px] text-gray-800 whitespace-pre-wrap">{order.notes}</p>
            </DetailBlock>
          )}

          {/* Fare */}
          <DetailBlock title="ค่าบริการ">
            <Row label="ค่าเริ่มต้น" value={`฿${order.baseFee}`} />
            <Row label="ค่าระยะทาง" value={`฿${order.distanceFee}`} />
            {order.serviceFee > 0 && (
              <Row label="ค่าบริการซื้อแทน" value={`฿${order.serviceFee}`} />
            )}
            <Row label="รวม" value={`฿${order.totalFare.toLocaleString()}`} bold />
          </DetailBlock>

          {/* Action panel */}
          {!finalised && (
            <DetailBlock title="จ่ายงานให้ไรเดอร์">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                เลือกไรเดอร์ที่ลงทะเบียน (ส่ง LINE ให้ไรเดอร์ด้วย)
              </label>
              <select
                value={pickRiderId === "" ? "" : String(pickRiderId)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") setPickRiderId("");
                  else if (v === "manual") {
                    setPickRiderId("manual");
                    setRiderName("");
                    setRiderPhone("");
                  } else setPickRiderId(Number(v));
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="">— ยังไม่เลือก —</option>
                {approvedRiders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name ?? "ไรเดอร์"}{r.phone ? ` · ${r.phone}` : ""}
                  </option>
                ))}
                <option value="manual">— ใส่ชื่อ + เบอร์เอง (พาร์ตเนอร์นอกระบบ) —</option>
              </select>
              {(pickRiderId === "manual" || (pickRiderId === "" && (order.riderName || order.riderPhone))) && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={riderName}
                    onChange={(e) => setRiderName(e.target.value)}
                    placeholder="ชื่อไรเดอร์"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <input
                    type="tel"
                    value={riderPhone}
                    onChange={(e) => setRiderPhone(e.target.value)}
                    placeholder="เบอร์โทรไรเดอร์"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              )}
              <button
                type="button"
                disabled={
                  assignMut.isPending ||
                  (typeof pickRiderId !== "number" && (!riderName.trim() || !riderPhone.trim()))
                }
                onClick={() =>
                  assignMut.mutateAsync({
                    id: order.id,
                    ...(typeof pickRiderId === "number"
                      ? { riderId: pickRiderId }
                      : {
                          riderName: riderName.trim(),
                          riderPhone: riderPhone.trim(),
                        }),
                  })
                }
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {assignMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                {order.riderName ? "อัปเดตข้อมูลไรเดอร์" : "จ่ายงาน + แจ้งลูกค้า"}
              </button>
            </DetailBlock>
          )}

          {/* Status flow */}
          {!finalised && (
            <DetailBlock title="เปลี่ยนสถานะ">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(["assigned", "arriving", "in_progress", "completed"] as const).map((s) => {
                  const current = order.status === s;
                  const reached =
                    ["pending", "assigned", "arriving", "in_progress", "completed"].indexOf(order.status) >=
                    ["pending", "assigned", "arriving", "in_progress", "completed"].indexOf(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={reached || statusMut.isPending}
                      onClick={() => statusMut.mutateAsync({ id: order.id, status: s })}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                        current
                          ? "border-orange-300 bg-orange-50 text-orange-700"
                          : reached
                            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {STATUS_BADGE[s].label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                แต่ละสถานะส่ง LINE notify ให้ลูกค้าอัตโนมัติ
              </p>
            </DetailBlock>
          )}

          {/* Cancel */}
          {!finalised && (
            <DetailBlock title="ยกเลิกออเดอร์">
              {!showCancel ? (
                <button
                  type="button"
                  onClick={() => setShowCancel(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 px-4 py-2 text-sm font-semibold"
                >
                  <XCircle size={14} /> เปิดฟอร์มยกเลิก
                </button>
              ) : (
                <>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={2}
                    placeholder="เหตุผลที่ลูกค้าจะเห็นใน LINE"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowCancel(false); setCancelReason(""); }}
                      className="flex-1 rounded-lg bg-gray-100 text-gray-700 px-4 py-2 text-sm font-semibold"
                    >
                      ปิดฟอร์ม
                    </button>
                    <button
                      type="button"
                      disabled={cancelMut.isPending || !cancelReason.trim()}
                      onClick={() => cancelMut.mutateAsync({ id: order.id, reason: cancelReason.trim() })}
                      className="flex-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-1"
                    >
                      {cancelMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      ยืนยันยกเลิก
                    </button>
                  </div>
                </>
              )}
            </DetailBlock>
          )}

          {finalised && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600 inline-flex items-center gap-1.5">
              {order.status === "completed" ? (
                <CheckCircle2 size={12} className="text-green-600" />
              ) : (
                <XCircle size={12} className="text-rose-600" />
              )}
              ออเดอร์ปิดเรียบร้อยแล้ว
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-3">
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 inline-flex items-center gap-1.5">
        {icon}
        {title}
      </p>
      {children}
    </section>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={bold ? "font-bold text-orange-600 text-base" : "text-gray-800"}>{value}</span>
    </div>
  );
}
