"use client";
import { use, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, WifiOff, Phone, Mail, MapPin, Bike, Car,
  Star, TrendingUp, Package, Calendar, Clock, CheckCircle2, XCircle,
  ShieldCheck, FileWarning, ImageOff, Loader2, X,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  preparing: "กำลังเตรียม",
  ready: "พร้อมส่ง",
  delivering: "กำลังส่ง",
  delivered: "ส่งแล้ว",
  cancelled: "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-blue-100 text-blue-700",
  ready: "bg-indigo-100 text-indigo-700",
  delivering: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

function formatThaiDateTime(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

type ReviewModalState =
  | { kind: "none" }
  | { kind: "approve" }
  | { kind: "reject"; note: string };

export default function RiderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = Number(id);
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.admin.getRiderDetail.useQuery(
    { userId },
    { enabled: Number.isFinite(userId), refetchInterval: 30000 },
  );
  const reviewDocs = trpc.admin.reviewRiderDocs.useMutation({
    onSuccess: () => {
      utils.admin.getRiderDetail.invalidate({ userId });
      setReview({ kind: "none" });
    },
  });
  const [review, setReview] = useState<ReviewModalState>({ kind: "none" });
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;
  if (error) {
    return (
      <div className="text-red-500 text-sm">
        โหลดไม่สำเร็จ: {error.message}{" "}
        <Link href="/dashboard/riders" className="underline">ย้อนกลับ</Link>
      </div>
    );
  }
  if (!data) return null;

  // Backend still returns `topups` until the cash-only cleanup ships;
  // the UI ignores them now that wallet is gone.
  const { rider, metrics, orders, activeOrder } = data as any;

  const approvalBadge = (() => {
    const s = rider.riderApprovalStatus;
    if (s === "approved") return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" />อนุมัติแล้ว</span>;
    if (s === "pending") return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">รอยืนยัน</span>;
    if (s === "rejected") return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600"><XCircle className="w-3 h-3" />ไม่อนุมัติ</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">{s ?? "—"}</span>;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/riders" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{rider.name ?? "—"}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <span className="font-mono text-xs">#{rider.id}</span>
            <span>•</span>
            {rider.riderOnline ? (
              <span className="inline-flex items-center gap-1 text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />ออนไลน์
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-gray-400"><WifiOff className="w-3 h-3" />ออฟไลน์</span>
            )}
            <span>•</span>
            {approvalBadge}
          </div>
        </div>
        {activeOrder && (
          <Link
            href={`/dashboard/orders`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            กำลังส่งออเดอร์ #{String(activeOrder.id).slice(-6)}
          </Link>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Package className="w-5 h-5" />}
          color="purple"
          label="ส่งสำเร็จทั้งหมด"
          value={`${metrics.totalDelivered} งาน`}
          sub={`วันนี้ ${metrics.todayDelivered} • 7 วัน ${metrics.weekDelivered}`}
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5" />}
          color="orange"
          label="รายได้รวม"
          value={`฿${metrics.totalEarnings.toLocaleString()}`}
          sub={`วันนี้ ฿${metrics.todayEarnings.toLocaleString()} • 30 วัน ฿${metrics.monthEarnings.toLocaleString()}`}
        />
        <KpiCard
          icon={<Star className="w-5 h-5" />}
          color="yellow"
          label="เรตติ้งเฉลี่ย"
          value={metrics.avgRating ? metrics.avgRating.toFixed(2) : "—"}
          sub={metrics.ratingCount > 0 ? `จาก ${metrics.ratingCount} รีวิว` : "ยังไม่มีรีวิว"}
        />
      </div>

      {/* Verification documents */}
      <DocsCard
        rider={rider}
        onApprove={() => setReview({ kind: "approve" })}
        onReject={() => setReview({ kind: "reject", note: "" })}
        onOpenImage={(url) => setLightbox(url)}
      />

      {/* Info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">ข้อมูลไรเดอร์</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <InfoRow icon={<Mail className="w-4 h-4 text-gray-400" />} label="อีเมล" value={rider.email ?? "—"} />
          <InfoRow icon={<Phone className="w-4 h-4 text-gray-400" />} label="เบอร์โทร" value={rider.phone ?? "—"} />
          <InfoRow icon={<MapPin className="w-4 h-4 text-gray-400" />} label="ที่อยู่" value={cleanAddress(rider.address)} />
          <InfoRow
            icon={rider.vehicleType === "car" ? <Car className="w-4 h-4 text-gray-400" /> : <Bike className="w-4 h-4 text-gray-400" />}
            label="ยานพาหนะ"
            value={[rider.vehicleType, rider.vehiclePlate].filter(Boolean).join(" • ") || "—"}
          />
          <InfoRow icon={<Calendar className="w-4 h-4 text-gray-400" />} label="สมัครเมื่อ" value={formatThaiDateTime(rider.createdAt)} />
          <InfoRow icon={<Clock className="w-4 h-4 text-gray-400" />} label="เข้าสู่ระบบล่าสุด" value={formatThaiDateTime(rider.lastSignedIn)} />
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">ประวัติออเดอร์</h2>
          <span className="text-xs text-gray-400">{orders.length} ออเดอร์ล่าสุด {metrics.cancelledCount > 0 ? `• ยกเลิก ${metrics.cancelledCount}` : ""}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-xs text-gray-500">
                <th className="text-left px-5 py-2.5 font-medium">Order ID</th>
                <th className="text-left px-4 py-2.5 font-medium">ร้าน</th>
                <th className="text-left px-4 py-2.5 font-medium">ยอดรวม</th>
                <th className="text-left px-4 py-2.5 font-medium">รายได้ไรเดอร์</th>
                <th className="text-left px-4 py-2.5 font-medium">เรตติ้ง</th>
                <th className="text-left px-4 py-2.5 font-medium">สถานะ</th>
                <th className="text-left px-4 py-2.5 font-medium">เวลา</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">ยังไม่มีออเดอร์</td>
                </tr>
              ) : orders.map((o: any) => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs">{String(o.id).slice(-10)}</td>
                  <td className="px-4 py-3 text-gray-900">{o.restaurantName ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">฿{Number(o.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-green-600">฿{Number(o.earningsResolved).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {o.riderRating ? (
                      <span className="inline-flex items-center gap-0.5 text-amber-500 text-xs font-medium">
                        <Star className="w-3 h-3 fill-current" /> {o.riderRating}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatThaiDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve modal */}
      {review.kind === "approve" ? (
        <ConfirmDialog
          title="อนุมัติไรเดอร์"
          message={`ยืนยันอนุมัติเอกสารของ ${rider.name ?? "ไรเดอร์"}? ระบบจะเปลี่ยนสถานะเป็น "อนุมัติแล้ว" และให้รับงานได้ทันที`}
          confirmLabel="อนุมัติ"
          tone="success"
          loading={reviewDocs.isPending}
          onConfirm={() => reviewDocs.mutate({ riderId: rider.id, decision: "approved" })}
          onCancel={() => setReview({ kind: "none" })}
        />
      ) : null}

      {/* Reject modal */}
      {review.kind === "reject" ? (
        <RejectDialog
          riderName={rider.name ?? "ไรเดอร์"}
          note={review.note}
          loading={reviewDocs.isPending}
          onChangeNote={(note) => setReview({ kind: "reject", note })}
          onConfirm={() =>
            reviewDocs.mutate({
              riderId: rider.id,
              decision: "rejected",
              rejectionNote: review.note.trim() || undefined,
            })
          }
          onCancel={() => setReview({ kind: "none" })}
        />
      ) : null}

      {/* Image lightbox */}
      {lightbox ? <Lightbox url={lightbox} onClose={() => setLightbox(null)} /> : null}
    </div>
  );
}

function cleanAddress(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.startsWith("REJECT_NOTE:")) return "—";
  return value;
}

function extractRejectNote(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("REJECT_NOTE:")) return null;
  return value.slice("REJECT_NOTE:".length);
}

const DOC_SPECS = [
  { kind: "license", title: "ใบขับขี่", urlKey: "riderLicenseUrl" },
  { kind: "vehicleReg", title: "เล่มทะเบียนรถ", urlKey: "riderVehicleRegUrl" },
  { kind: "idCard", title: "บัตรประชาชน", urlKey: "riderIdCardUrl" },
  { kind: "selfieId", title: "Selfie + บัตร", urlKey: "riderSelfieIdUrl" },
] as const;

function DocsCard({
  rider,
  onApprove,
  onReject,
  onOpenImage,
}: {
  rider: any;
  onApprove: () => void;
  onReject: () => void;
  onOpenImage: (url: string) => void;
}) {
  const status = rider.riderApprovalStatus as "none" | "pending" | "approved" | "rejected";
  const uploadedCount = DOC_SPECS.filter((d) => Boolean(rider[d.urlKey])).length;
  const rejectNote = extractRejectNote(rider.address);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex p-1.5 rounded-md bg-orange-50 text-orange-600">
            <ShieldCheck className="w-4 h-4" />
          </span>
          <h2 className="text-sm font-semibold text-gray-700">เอกสารยืนยันตัวตน</h2>
          <span className="text-xs text-gray-400">{uploadedCount}/4 ฉบับ</span>
        </div>
        {status !== "approved" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onReject}
              disabled={uploadedCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              ปฏิเสธ
            </button>
            <button
              onClick={onApprove}
              disabled={uploadedCount < 4}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              อนุมัติ
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3 h-3" /> อนุมัติแล้ว
          </span>
        )}
      </div>

      {status === "rejected" && rejectNote ? (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <FileWarning className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="text-sm text-red-700">
            <div className="font-semibold mb-0.5">เหตุผลที่ปฏิเสธ</div>
            <div>{rejectNote}</div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {DOC_SPECS.map((spec) => {
          const url = rider[spec.urlKey] as string | null;
          return (
            <div key={spec.kind} className="rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-600">
                {spec.title}
              </div>
              {url ? (
                <button
                  onClick={() => onOpenImage(url)}
                  className="w-full aspect-[4/3] bg-gray-100 hover:opacity-90 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={spec.title} className="w-full h-full object-cover" />
                </button>
              ) : (
                <div className="w-full aspect-[4/3] bg-gray-50 flex flex-col items-center justify-center gap-1 text-gray-300">
                  <ImageOff className="w-5 h-5" />
                  <span className="text-xs">ยังไม่ส่ง</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone = "success",
  loading,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "success" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const btn =
    tone === "success"
      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
      : "bg-red-600 hover:bg-red-700 text-white";
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 ${btn}`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectDialog({
  riderName,
  note,
  loading,
  onChangeNote,
  onConfirm,
  onCancel,
}: {
  riderName: string;
  note: string;
  loading: boolean;
  onChangeNote: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">ปฏิเสธเอกสาร</h3>
        <p className="text-sm text-gray-600">
          กำลังจะปฏิเสธเอกสารของ <span className="font-medium">{riderName}</span> — โปรดระบุเหตุผลให้ไรเดอร์ปรับแก้
        </p>
        <textarea
          value={note}
          onChange={(e) => onChangeNote(e.target.value)}
          rows={4}
          placeholder="เช่น รูปใบขับขี่เบลอ มองไม่เห็นเลขบัตร"
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
        />
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            ปฏิเสธ
          </button>
        </div>
      </div>
    </div>
  );
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/85 flex items-center justify-center p-4"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="w-5 h-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="document"
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full rounded-lg shadow-2xl"
      />
    </div>
  );
}

function KpiCard({ icon, color, label, value, sub }: { icon: React.ReactNode; color: string; label: string; value: string; sub?: string }) {
  const colorMap: Record<string, string> = {
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    yellow: "bg-yellow-50 text-yellow-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colorMap[color] ?? "bg-gray-50 text-gray-600"}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-gray-900 break-words">{value}</div>
      </div>
    </div>
  );
}
