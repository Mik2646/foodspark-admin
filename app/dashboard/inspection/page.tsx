"use client";
/**
 * /dashboard/inspection — Phase 7 operator console for the
 * บริการนำรถไปตรวจสภาพ-พรบ. service. Mirrors /dashboard/transport's
 * shape: tab filter, 20s auto-refresh, row click → detail modal with
 * staff assignment, status flow buttons, final govt fee input,
 * cancel + chat panels.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Bike,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Save,
  Send,
  StickyNote,
  Wrench,
  X,
  XCircle,
} from "lucide-react";

type InspectionStatus =
  | "pending"
  | "scheduled"
  | "picked_up"
  | "in_service"
  | "returning"
  | "completed"
  | "cancelled";

const STATUS_TABS: Array<{ key: InspectionStatus | "all" | "active"; label: string }> = [
  { key: "pending", label: "รอจ่ายงาน" },
  { key: "active", label: "กำลังให้บริการ" },
  { key: "completed", label: "เสร็จสิ้น" },
  { key: "cancelled", label: "ยกเลิก" },
  { key: "all", label: "ทั้งหมด" },
];

const STATUS_BADGE: Record<InspectionStatus, { label: string; cls: string }> = {
  pending: { label: "รอจ่ายงาน", cls: "bg-amber-100 text-amber-700" },
  scheduled: { label: "นัดวันรับ", cls: "bg-blue-100 text-blue-700" },
  picked_up: { label: "รับรถแล้ว", cls: "bg-blue-100 text-blue-700" },
  in_service: { label: "ที่ขนส่ง", cls: "bg-purple-100 text-purple-700" },
  returning: { label: "นำรถกลับ", cls: "bg-purple-100 text-purple-700" },
  completed: { label: "เสร็จสิ้น", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "ยกเลิก", cls: "bg-rose-100 text-rose-700" },
};

const SERVICE_LABEL: Record<string, string> = {
  inspection: "ตรวจ",
  compulsory_insurance: "พรบ.",
  annual_tax: "ภาษี",
};

export default function AdminInspectionPage() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["key"]>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: all = [], isFetching, refetch } = trpc.admin.listInspections.useQuery(
    tab === "active" || tab === "all"
      ? { limit: 200 }
      : { status: tab as InspectionStatus, limit: 200 },
    { refetchInterval: 20 * 1000 },
  );

  const rows = useMemo(() => {
    if (tab === "active") {
      return all.filter((r) =>
        ["scheduled", "picked_up", "in_service", "returning"].includes(r.status),
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
          <h1 className="text-2xl font-bold text-gray-900">บริการตรวจสภาพ-พรบ.</h1>
          <p className="text-sm text-gray-400 mt-1">
            จ่ายงานเจ้าหน้าที่ ติดตามสถานะ และอัปเดตค่าราชการตามจริง —
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
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">ยังไม่มีออเดอร์ในสถานะนี้</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">รถ</th>
                <th className="text-left px-3 py-2">บริการ</th>
                <th className="text-left px-3 py-2">ลูกค้า</th>
                <th className="text-left px-3 py-2">เจ้าหน้าที่</th>
                <th className="text-right px-3 py-2">ค่าบริการ</th>
                <th className="text-left px-3 py-2">สถานะ</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const VehicleIcon = r.vehicleType === "motorcycle" ? Bike : Car;
                const svcLabels = (Array.isArray(r.services) ? r.services as string[] : [])
                  .map((s) => SERVICE_LABEL[s] ?? s).join(" / ");
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className="border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-3 py-2.5">
                      <div className="inline-flex items-center gap-1.5">
                        <VehicleIcon size={14} className="text-violet-600" />
                        <span className="text-xs font-bold text-gray-800">{r.vehiclePlate}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{r.id}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-700">{svcLabels}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs font-semibold text-gray-700">{r.customerName ?? "—"}</div>
                      <div className="text-[10px] text-gray-500">{r.customerPhone}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.staffName ? (
                        <>
                          <div className="text-xs font-semibold text-blue-700">{r.staffName}</div>
                          <div className="text-[10px] text-gray-500">{r.staffPhone}</div>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">ยังไม่จ่ายงาน</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="font-bold text-violet-700">฿{r.totalServiceFee.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400">
                        {r.finalGovtFee != null
                          ? `+ ฿${r.finalGovtFee} ราชการ`
                          : `~฿${r.estimatedGovtFee} ราชการ`}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[r.status as InspectionStatus]?.cls ?? ""}`}>
                        {STATUS_BADGE[r.status as InspectionStatus]?.label ?? r.status}
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
        <InspectionDetailModal
          order={selected}
          onClose={() => setSelectedId(null)}
          onChanged={async () => {
            await utils.admin.listInspections.invalidate();
            await utils.admin.getInspection.invalidate({ id: selected.id });
          }}
        />
      )}
    </div>
  );
}

function InspectionDetailModal({
  order,
  onClose,
  onChanged,
}: {
  order: {
    id: string;
    customerUserId: number;
    customerName: string | null;
    customerPhone: string | null;
    vehicleType: string;
    vehiclePlate: string;
    vehicleBrand: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    services: unknown;
    pickupAddress: string;
    pickupLat: number | null;
    pickupLng: number | null;
    pickupNote: string | null;
    preferredDate: string | Date | null;
    scheduledAt: string | Date | null;
    baseServiceFee: number;
    extraServiceFee: number;
    totalServiceFee: number;
    estimatedGovtFee: number;
    finalGovtFee: number | null;
    status: string;
    staffName: string | null;
    staffPhone: string | null;
    notes: string | null;
    cancelReason?: string | null;
    createdAt: string | Date;
  };
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [staffName, setStaffName] = useState(order.staffName ?? "");
  const [staffPhone, setStaffPhone] = useState(order.staffPhone ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    order.scheduledAt
      ? new Date(order.scheduledAt).toISOString().slice(0, 16)
      : order.preferredDate
        ? new Date(order.preferredDate).toISOString().slice(0, 16)
        : "",
  );
  const [govtFee, setGovtFee] = useState<string>(
    order.finalGovtFee != null ? String(order.finalGovtFee) : "",
  );
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    setStaffName(order.staffName ?? "");
    setStaffPhone(order.staffPhone ?? "");
    setScheduledAt(
      order.scheduledAt
        ? new Date(order.scheduledAt).toISOString().slice(0, 16)
        : order.preferredDate
          ? new Date(order.preferredDate).toISOString().slice(0, 16)
          : "",
    );
    setGovtFee(order.finalGovtFee != null ? String(order.finalGovtFee) : "");
    setCancelReason("");
    setShowCancel(false);
  }, [order.id, order.staffName, order.staffPhone, order.scheduledAt, order.preferredDate, order.finalGovtFee]);

  const assignMut = trpc.admin.assignInspectionStaff.useMutation({
    onSuccess: () => onChanged(),
  });
  const statusMut = trpc.admin.updateInspectionStatus.useMutation({
    onSuccess: () => onChanged(),
  });
  const govtFeeMut = trpc.admin.setInspectionGovtFee.useMutation({
    onSuccess: () => onChanged(),
  });
  const cancelMut = trpc.admin.cancelInspection.useMutation({
    onSuccess: async () => {
      await onChanged();
      onClose();
    },
  });

  const finalised = order.status === "completed" || order.status === "cancelled";
  const VehicleIcon = order.vehicleType === "motorcycle" ? Bike : Car;
  const services = Array.isArray(order.services) ? (order.services as string[]) : [];

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
            <VehicleIcon size={16} className="text-violet-600" />
            <h3 className="text-base font-extrabold text-gray-900">{order.vehiclePlate}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[order.status as InspectionStatus]?.cls ?? ""}`}>
              {STATUS_BADGE[order.status as InspectionStatus]?.label ?? order.status}
            </span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <DetailBlock title="ลูกค้า">
            <Row label="ชื่อ" value={order.customerName ?? "—"} />
            <Row label="เบอร์" value={order.customerPhone ?? "—"} />
            <p className="text-[10px] text-gray-400 font-mono mt-1">{order.id}</p>
          </DetailBlock>

          <DetailBlock title="รถ">
            <Row label="ทะเบียน" value={order.vehiclePlate} bold />
            {(order.vehicleBrand || order.vehicleModel || order.vehicleYear) && (
              <Row label="ยี่ห้อ-รุ่น" value={[order.vehicleBrand, order.vehicleModel, order.vehicleYear].filter(Boolean).join(" · ")} />
            )}
            <Row label="ประเภท" value={order.vehicleType === "motorcycle" ? "มอเตอร์ไซค์" : "รถยนต์"} />
          </DetailBlock>

          <DetailBlock title="บริการ" icon={<Wrench size={12} />}>
            <div className="flex flex-wrap gap-1.5">
              {services.map((s) => (
                <span key={s} className="inline-block px-2 py-1 rounded-full bg-violet-50 text-violet-700 text-[11px] font-bold">
                  {s === "inspection" ? "ตรวจสภาพ" : s === "compulsory_insurance" ? "ต่อ พ.ร.บ." : "ต่อภาษี"}
                </span>
              ))}
            </div>
          </DetailBlock>

          <DetailBlock title="จุดรับรถ" icon={<MapPin size={12} className="text-violet-500" />}>
            <p className="text-[13px] text-gray-900">{order.pickupAddress}</p>
            {order.pickupNote && <p className="text-[11px] text-gray-500 mt-1">{order.pickupNote}</p>}
            {order.pickupLat != null && order.pickupLng != null && (
              <a
                href={`https://www.google.com/maps?q=${order.pickupLat},${order.pickupLng}`}
                target="_blank" rel="noopener noreferrer"
                className="block text-[11px] text-violet-600 underline mt-1"
              >
                เปิด Maps
              </a>
            )}
          </DetailBlock>

          {order.notes && (
            <DetailBlock title="หมายเหตุ" icon={<StickyNote size={12} />}>
              <p className="text-[13px] text-gray-800 whitespace-pre-wrap">{order.notes}</p>
            </DetailBlock>
          )}

          <DetailBlock title="ค่าใช้จ่าย">
            <Row label="ค่าบริการ FoodSpark" value={`฿${order.totalServiceFee}`} />
            {order.finalGovtFee != null ? (
              <Row label="ค่าราชการตามจริง" value={`฿${order.finalGovtFee}`} bold />
            ) : (
              <Row label="ค่าราชการ (ประมาณ)" value={`~฿${order.estimatedGovtFee}`} />
            )}
            <Row
              label="รวม"
              value={
                order.finalGovtFee != null
                  ? `฿${(order.totalServiceFee + order.finalGovtFee).toLocaleString()}`
                  : `~฿${(order.totalServiceFee + order.estimatedGovtFee).toLocaleString()}`
              }
              bold
            />
          </DetailBlock>

          {/* Final govt fee input */}
          {!["pending", "cancelled"].includes(order.status) && (
            <DetailBlock title="กรอกค่าราชการตามจริง">
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={govtFee}
                  onChange={(e) => setGovtFee(e.target.value)}
                  placeholder="เช่น 1200"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <button
                  type="button"
                  disabled={govtFeeMut.isPending || govtFee === ""}
                  onClick={() => govtFeeMut.mutateAsync({ id: order.id, finalGovtFee: Math.max(0, Number(govtFee) || 0) })}
                  className="inline-flex items-center gap-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 text-sm font-bold disabled:opacity-60"
                >
                  {govtFeeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึก
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                จำเป็นก่อนเปลี่ยนเป็น "เสร็จสิ้น" — ลูกค้าเห็นยอดสุทธิจากตัวเลขนี้
              </p>
            </DetailBlock>
          )}

          {/* Staff assignment */}
          {!finalised && (
            <DetailBlock title="จ่ายงานให้เจ้าหน้าที่">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="ชื่อเจ้าหน้าที่"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <input
                  type="tel"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  placeholder="เบอร์โทร"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <button
                type="button"
                disabled={assignMut.isPending || !staffName.trim() || !staffPhone.trim()}
                onClick={() =>
                  assignMut.mutateAsync({
                    id: order.id,
                    staffName: staffName.trim(),
                    staffPhone: staffPhone.trim(),
                    scheduledAtISO: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
                  })
                }
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {assignMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                {order.staffName ? "อัปเดตเจ้าหน้าที่" : "จ่ายงาน + แจ้งลูกค้า"}
              </button>
            </DetailBlock>
          )}

          {/* Status flow */}
          {!finalised && (
            <DetailBlock title="เปลี่ยนสถานะ">
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {(["scheduled", "picked_up", "in_service", "returning", "completed"] as const).map((s) => {
                  const reached =
                    ["pending", "scheduled", "picked_up", "in_service", "returning", "completed"].indexOf(order.status) >=
                    ["pending", "scheduled", "picked_up", "in_service", "returning", "completed"].indexOf(s);
                  const requiresFinalFee = s === "completed" && order.finalGovtFee == null;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={reached || statusMut.isPending || requiresFinalFee}
                      onClick={() => statusMut.mutateAsync({ id: order.id, status: s })}
                      title={requiresFinalFee ? "ต้องกรอกค่าราชการตามจริงก่อน" : undefined}
                      className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                        reached
                          ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                          : requiresFinalFee
                            ? "border-amber-200 bg-amber-50 text-amber-700 cursor-not-allowed"
                            : "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
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

          {/* Chat */}
          <AdminInspectionChat inspectionId={order.id} />

          {finalised && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600 inline-flex items-center gap-1.5">
              {order.status === "completed" ? (
                <CheckCircle2 size={12} className="text-green-600" />
              ) : (
                <XCircle size={12} className="text-rose-600" />
              )}
              ออเดอร์ปิดเรียบร้อยแล้ว
              {order.cancelReason && ` · ${order.cancelReason}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailBlock({
  title, icon, children,
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
      <span className={bold ? "font-bold text-violet-700 text-base" : "text-gray-800"}>{value}</span>
    </div>
  );
}

function AdminInspectionChat({ inspectionId }: { inspectionId: string }) {
  const utils = trpc.useUtils();
  const { data: messages = [] } = trpc.admin.listInspectionMessages.useQuery(
    { inspectionId },
    { refetchInterval: 10 * 1000 },
  );
  const sendMut = trpc.admin.sendInspectionMessage.useMutation({
    onSuccess: () => utils.admin.listInspectionMessages.invalidate({ inspectionId }),
  });
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content || sendMut.isPending) return;
    setDraft("");
    sendMut.mutate({ inspectionId, content });
  };

  return (
    <section className="rounded-xl border border-violet-100 bg-violet-50/30 p-3">
      <p className="text-[11px] font-bold text-violet-700 uppercase tracking-wide mb-2 inline-flex items-center gap-1.5">
        <MessageSquare className="w-3 h-3" /> ห้องแชทกับลูกค้า
      </p>
      <div ref={scrollRef} className="max-h-[220px] overflow-y-auto space-y-2 mb-2 px-0.5">
        {messages.length === 0 && (
          <p className="text-[11px] text-gray-400 text-center py-2">ยังไม่มีข้อความ</p>
        )}
        {messages.map((m) => {
          const role = m.senderRole;
          const colorCls =
            role === "customer" ? "bg-orange-100 text-orange-900"
            : role === "admin" ? "bg-amber-100 text-amber-900"
            : "bg-gray-100 text-gray-800";
          const label = role === "customer" ? "ลูกค้า" : role === "admin" ? "แอดมิน" : "ระบบ";
          return (
            <div key={m.id} className={`rounded-lg px-2.5 py-1.5 text-[12px] ${colorCls}`}>
              <p className="text-[10px] opacity-75 mb-0.5">
                {label}{m.senderName ? ` · ${m.senderName}` : ""}
                {" · "}
                {new Date(m.createdAt).toLocaleString("th-TH", {
                  hour: "2-digit", minute: "2-digit", day: "numeric", month: "short",
                })}
              </p>
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
            </div>
          );
        })}
      </div>
      <div className="flex items-end gap-1.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="ส่งข้อความถึงลูกค้า..."
          className="flex-1 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim() || sendMut.isPending}
          className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0"
          aria-label="ส่ง"
        >
          <Send size={14} />
        </button>
      </div>
    </section>
  );
}
