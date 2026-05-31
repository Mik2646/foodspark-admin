"use client";
import { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, ShieldCheck, Store, User, Bike, Phone, Mail, MapPin,
  Calendar, Clock, ShoppingBag, TrendingUp, CheckCircle2, XCircle, Gift,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = { user: "ผู้ใช้", merchant: "ร้านค้า", admin: "แอดมิน", rider: "ไรเดอร์" };
const ROLE_STYLES: Record<string, string> = {
  user: "bg-gray-100 text-gray-600",
  merchant: "bg-blue-100 text-blue-700",
  admin: "bg-purple-100 text-purple-700",
  rider: "bg-cyan-100 text-cyan-700",
};
const ROLE_ICONS: Record<string, React.ElementType> = { user: User, merchant: Store, admin: ShieldCheck, rider: Bike };
const STATUS_LABELS: Record<string, string> = {
  pending: "รอยืนยัน", confirmed: "ยืนยันแล้ว", preparing: "กำลังเตรียม",
  ready: "พร้อมส่ง", delivering: "กำลังส่ง", delivered: "ส่งแล้ว", cancelled: "ยกเลิก",
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
function fmt(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = Number(id);
  const { data, isLoading, error } = trpc.admin.getUserDetail.useQuery(
    { userId },
    { enabled: Number.isFinite(userId), refetchInterval: 30000 },
  );

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;
  if (error) {
    return (
      <div className="text-red-500 text-sm">
        โหลดไม่สำเร็จ: {error.message}{" "}
        <Link href="/dashboard/users" className="underline">ย้อนกลับ</Link>
      </div>
    );
  }
  if (!data) return null;

  // Backend still returns `topups` + `walletTxs` until the cash-only
  // cleanup ships; the UI ignores them now that wallet is gone.
  const { user, metrics, customerOrders, ownedRestaurants } = data as any;
  const role = user.role ?? "user";
  const RoleIcon = ROLE_ICONS[role] ?? User;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/users" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{user.name ?? "—"}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <span className="font-mono text-xs">#{user.id}</span>
            <span>•</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[role] ?? ""}`}>
              <RoleIcon className="w-3 h-3" />
              {ROLE_LABELS[role] ?? role}
            </span>
            {user.loginMethod && (
              <>
                <span>•</span>
                <span className="text-xs text-gray-400">login: {user.loginMethod}</span>
              </>
            )}
          </div>
        </div>
        {role === "rider" && (
          <Link
            href={`/dashboard/riders/${user.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 transition-colors"
          >
            <Bike className="w-3.5 h-3.5" />
            ดูหน้าไรเดอร์
          </Link>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<ShoppingBag className="w-5 h-5" />}
          color="purple"
          label="ออเดอร์ที่สั่ง"
          value={`${metrics.totalOrders}`}
          sub={`ส่งแล้ว ${metrics.deliveredCount} • ยกเลิก ${metrics.cancelledCount}`}
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5" />}
          color="orange"
          label="ใช้จ่ายรวม"
          value={`฿${metrics.totalSpent.toLocaleString()}`}
          sub="ออเดอร์ที่ส่งสำเร็จ"
        />
        <KpiCard
          icon={<Gift className="w-5 h-5" />}
          color="green"
          label="Referral code"
          value={user.referralCode ?? "—"}
          sub={user.referredBy ? `ถูกแนะนำโดย #${user.referredBy}` : "ไม่ถูกแนะนำมา"}
        />
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">ข้อมูลผู้ใช้</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <InfoRow icon={<Mail className="w-4 h-4 text-gray-400" />} label="อีเมล" value={user.email ?? "—"} />
          <InfoRow icon={<Phone className="w-4 h-4 text-gray-400" />} label="เบอร์โทร" value={user.phone ?? "—"} />
          <InfoRow icon={<MapPin className="w-4 h-4 text-gray-400" />} label="ที่อยู่" value={user.address ?? "—"} />
          {role === "rider" && (
            <InfoRow
              icon={<Bike className="w-4 h-4 text-gray-400" />}
              label="ยานพาหนะ"
              value={[user.vehicleType, user.vehiclePlate].filter(Boolean).join(" • ") || "—"}
            />
          )}
          <InfoRow icon={<Calendar className="w-4 h-4 text-gray-400" />} label="สมัครเมื่อ" value={fmt(user.createdAt)} />
          <InfoRow icon={<Clock className="w-4 h-4 text-gray-400" />} label="เข้าสู่ระบบล่าสุด" value={fmt(user.lastSignedIn)} />
          <ApprovalRow label="สถานะอนุมัติทั่วไป" status={user.approvalStatus} />
          {/* Multi-role: show both regardless of primary role so a merchant
              who is also a rider (or vice-versa) sees both statuses. */}
          {(role === "merchant" || role === "admin" || user.merchantApprovalStatus === "approved") && (
            <ApprovalRow label="อนุมัติร้านค้า" status={user.merchantApprovalStatus} />
          )}
          {(role === "rider" || role === "admin" || user.riderApprovalStatus === "approved") && (
            <ApprovalRow label="อนุมัติไรเดอร์" status={user.riderApprovalStatus} />
          )}
        </div>
      </div>

      {/* Owned restaurants */}
      {ownedRestaurants.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">ร้านอาหารที่เป็นเจ้าของ</h2>
            <span className="text-xs text-gray-400">{ownedRestaurants.length} ร้าน</span>
          </div>
          <div className="divide-y divide-gray-50">
            {ownedRestaurants.map((r: any) => (
              <Link
                key={r.id}
                href={`/dashboard/restaurants/${r.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Store className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-400">{r.category ?? "—"} • ⭐ {Number(r.rating ?? 0).toFixed(1)}</div>
                  </div>
                </div>
                {r.isOpen ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">เปิด</span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">ปิด</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Customer order history */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">ออเดอร์ที่ผู้ใช้สั่ง (ในฐานะ customer)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-xs text-gray-500">
                <th className="text-left px-5 py-2.5 font-medium">Order ID</th>
                <th className="text-left px-4 py-2.5 font-medium">ร้าน</th>
                <th className="text-left px-4 py-2.5 font-medium">ยอด</th>
                <th className="text-left px-4 py-2.5 font-medium">วิธีจ่าย</th>
                <th className="text-left px-4 py-2.5 font-medium">สถานะ</th>
                <th className="text-left px-4 py-2.5 font-medium">เวลา</th>
              </tr>
            </thead>
            <tbody>
              {customerOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">ยังไม่มีออเดอร์</td>
                </tr>
              ) : customerOrders.map((o: any) => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs">{String(o.id).slice(-10)}</td>
                  <td className="px-4 py-3 text-gray-900">{o.restaurantName ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">฿{Number(o.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{o.paymentMethod ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmt(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function KpiCard({ icon, color, label, value, sub }: { icon: React.ReactNode; color: string; label: string; value: string; sub?: string }) {
  const colorMap: Record<string, string> = {
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    yellow: "bg-yellow-50 text-yellow-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colorMap[color] ?? "bg-gray-50 text-gray-600"}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 break-all">{value}</p>
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

function ApprovalRow({ label, status }: { label: string; status: string | null }) {
  const cls =
    status === "approved" ? "bg-green-100 text-green-700"
      : status === "pending" ? "bg-yellow-100 text-yellow-700"
      : status === "rejected" ? "bg-red-100 text-red-600"
      : "bg-gray-100 text-gray-500";
  const icon =
    status === "approved" ? <CheckCircle2 className="w-3 h-3" />
      : status === "rejected" ? <XCircle className="w-3 h-3" />
      : null;
  const text = status === "approved" ? "อนุมัติแล้ว"
    : status === "pending" ? "รอยืนยัน"
    : status === "rejected" ? "ไม่อนุมัติ"
    : (status ?? "—");
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5"><ShieldCheck className="w-4 h-4 text-gray-400" /></span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-400">{label}</div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
          {icon}{text}
        </span>
      </div>
    </div>
  );
}
