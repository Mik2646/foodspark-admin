"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { loadSession, clearSession } from "@/lib/auth";
import {
  Users,
  Store,
  ClipboardList,
  DollarSign,
  Bike,
  TrendingUp,
  TrendingDown,
  Activity,
  Bell,
  ChevronDown,
  Calendar,
  Wallet,
  LogOut,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  LabelList,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const STATUS_LABELS: Record<string, string> = {
  pending: "รอยืนยัน",
  preparing: "กำลังเตรียม",
  ready: "พร้อมส่ง",
  delivering: "กำลังส่ง",
  delivered: "ส่งแล้ว",
  cancelled: "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "#FACC15",
  preparing: "#3B82F6",
  ready: "#6366F1",
  delivering: "#A855F7",
  delivered: "#22C55E",
  cancelled: "#EF4444",
};
const STATUS_PILL: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  preparing: "bg-blue-100 text-blue-700",
  ready: "bg-indigo-100 text-indigo-700",
  delivering: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

// Date-range presets. `cmp` is the comparison phrase shown next to each
// KPI's delta — it changes with the window so the WoW % reads correctly.
const PRESETS = [
  { key: "7d", label: "7 วันล่าสุด", days: 7, cmp: "จากสัปดาห์ก่อน" },
  { key: "30d", label: "30 วันล่าสุด", days: 30, cmp: "จากเดือนก่อน" },
  { key: "today", label: "วันนี้", days: 1, cmp: "จากเมื่อวาน" },
] as const;
type PresetKey = (typeof PRESETS)[number]["key"];

// Bangkok-local YYYY-MM-DD regardless of the browser's timezone.
function bkkDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
function rangeForDays(days: number): { from: string; to: string } {
  return {
    to: bkkDateStr(new Date()),
    from: bkkDateStr(new Date(Date.now() - (days - 1) * 86400000)),
  };
}
// "2026-05-28" → "28 พ.ค. 2569"
function thaiDate(yyyymmdd: string): string {
  if (!yyyymmdd) return "";
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
// "2026-05-28" → "28 พ.ค." for chart x-axis ticks.
function formatShortDate(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function KpiCard({
  icon: Icon,
  iconColor,
  iconBg,
  value,
  label,
  delta,
  cmp,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  value: string | number;
  label: string;
  delta: number;
  cmp: string;
}) {
  const up = delta >= 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900 tabular-nums leading-tight">
            {value}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{label}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs">
        {up ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
        )}
        <span
          className={`font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}
        >
          {up ? "+" : ""}
          {delta}%
        </span>
        <span className="text-gray-400 truncate">{cmp}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [presetKey, setPresetKey] = useState<PresetKey>("7d");
  const preset = PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0];
  const range = useMemo(() => rangeForDays(preset.days), [preset.days]);

  const { data, isLoading, error } = trpc.admin.overview.useQuery(range, {
    refetchInterval: 30000,
  });
  const { data: recentOrders = [] } = trpc.admin.listOrders.useQuery(
    { limit: 10 },
    { refetchInterval: 15000 },
  );
  const { data: unread = [] } = trpc.admin.listNotifications.useQuery(
    { unreadOnly: true, limit: 200 },
    { refetchInterval: 15000 },
  );

  const [adminName, setAdminName] = useState("Admin");
  useEffect(() => {
    setAdminName(loadSession()?.user.name || "Admin");
  }, []);

  // Header dropdowns (date range + avatar). Close on outside click.
  const [rangeOpen, setRangeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setRangeOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (isLoading)
    return (
      <div className="text-gray-400 text-sm py-12 text-center">กำลังโหลด...</div>
    );
  if (error)
    return (
      <div className="text-red-500 text-sm">
        เกิดข้อผิดพลาด: {error.message}
      </div>
    );

  const trend = (data?.trend ?? []).map((t) => ({
    ...t,
    label: formatShortDate(t.date),
  }));
  const statusPieData = Object.entries(data?.ordersByStatus ?? {}).map(
    ([k, v]) => ({
      name: STATUS_LABELS[k] ?? k,
      value: Number(v),
      color: STATUS_COLORS[k] ?? "#9CA3AF",
    }),
  );
  const totalOrders = statusPieData.reduce((s, p) => s + p.value, 0);
  const deltas = data?.deltas ?? {
    users: 0,
    restaurants: 0,
    orders: 0,
    riders: 0,
    revenue: 0,
  };
  const rangeLabel =
    data?.range?.from && data.range.to
      ? preset.days === 1
        ? thaiDate(data.range.from)
        : `${thaiDate(data.range.from)} – ${thaiDate(data.range.to)}`
      : preset.label;

  const kpis = [
    {
      icon: Users,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      value: data?.totalUsers ?? 0,
      label: "ผู้ใช้ทั้งหมด",
      delta: deltas.users,
    },
    {
      icon: Store,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-50",
      value: data?.totalRestaurants ?? 0,
      label: "ร้านอาหาร",
      delta: deltas.restaurants,
    },
    {
      icon: ClipboardList,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      value: data?.totalOrders ?? 0,
      label: "ออเดอร์ทั้งหมด",
      delta: deltas.orders,
    },
    {
      icon: Bike,
      iconColor: "text-cyan-600",
      iconBg: "bg-cyan-50",
      value: data?.riderCount ?? 0,
      label: "ไรเดอร์",
      delta: deltas.riders,
    },
    {
      icon: DollarSign,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      value: `฿${(data?.totalRevenue ?? 0).toLocaleString()}`,
      label: "รายได้รวม",
      delta: deltas.revenue,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header — welcome + date range + bell + avatar */}
      <div
        ref={headerRef}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-500">
            ยินดีต้อนรับกลับ, {adminName} 👋
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setRangeOpen((o) => !o);
                setMenuOpen(false);
              }}
              className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{rangeLabel}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {rangeOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-30">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setPresetKey(p.key);
                      setRangeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      p.key === presetKey
                        ? "text-orange-600 font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification bell */}
          <Link
            href="/dashboard/inbox"
            className="relative w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
            aria-label="กล่องแจ้งเตือน"
          >
            <Bell className="w-4.5 h-4.5" />
            {unread.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread.length > 99 ? "99+" : unread.length}
              </span>
            )}
          </Link>

          {/* Avatar + menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMenuOpen((o) => !o);
                setRangeOpen(false);
              }}
              className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl pl-1.5 pr-2.5 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <span className="w-7 h-7 rounded-lg bg-orange-500 text-white text-sm font-bold flex items-center justify-center">
                {adminName.charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {adminName}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-30">
                <button
                  onClick={() => clearSession("manual")}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI cards — 2 cols on mobile, 5 on lg */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} cmp={preset.cmp} />
        ))}
      </div>

      {/* Charts row — order trend (2/3) + status donut (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                ออเดอร์ {preset.label}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                เส้น = ออเดอร์ · พื้นที่ = รายได้
              </p>
            </div>
          </div>
          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ top: 6, right: 6, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => {
                    const num = Number(value);
                    if (name === "revenue")
                      return [`฿${num.toLocaleString()}`, "รายได้"];
                    return [num, "ออเดอร์"];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#F97316"
                  fill="url(#ordersGradient)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status donut + legend with count + % */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-purple-500" />
            สถานะออเดอร์
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">แยกตามสถานะปัจจุบัน</p>
          {statusPieData.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">
              ยังไม่มีออเดอร์
            </p>
          ) : (
            <>
              <div className="h-44 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {statusPieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xl font-bold text-gray-900 tabular-nums">
                    {totalOrders}
                  </p>
                  <p className="text-[10px] text-gray-500">ทั้งหมด</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {statusPieData.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ background: p.color }}
                      />
                      <span className="text-gray-600 truncate">{p.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {p.value}
                      <span className="text-gray-400 font-normal ml-1">
                        (
                        {totalOrders > 0
                          ? ((p.value / totalOrders) * 100).toFixed(1)
                          : "0.0"}
                        %)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Revenue row — daily revenue line (2/3) + period summary (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 lg:col-span-2">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            รายได้ต่อวัน
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">
            รวมเฉพาะออเดอร์ที่ส่งสำเร็จแล้ว
          </p>
          <div className="h-44 sm:h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend}
                margin={{ top: 20, right: 12, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value) => [
                    `฿${Number(value).toLocaleString()}`,
                    "รายได้",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#10B981", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                >
                  <LabelList
                    dataKey="revenue"
                    position="top"
                    formatter={(v: React.ReactNode) =>
                      `฿${Number(v ?? 0).toLocaleString()}`
                    }
                    style={{ fontSize: 10, fill: "#6B7280" }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Period revenue summary */}
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">
                สรุปรายได้รวม
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{rangeLabel}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-6">
            <p className="text-3xl font-extrabold text-gray-900 tabular-nums">
              ฿{(data?.periodRevenue ?? 0).toLocaleString()}
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs">
              {deltas.revenue >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span
                className={`font-semibold ${
                  deltas.revenue >= 0 ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {deltas.revenue >= 0 ? "+" : ""}
                {deltas.revenue}%
              </span>
              <span className="text-gray-400">{preset.cmp}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <h2 className="text-base font-bold text-gray-900 mb-3">ออเดอร์ล่าสุด</h2>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">
                  Order ID
                </th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">
                  ร้าน
                </th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">
                  ยอด
                </th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">
                  สถานะ
                </th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">
                  เวลา
                </th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 text-gray-400 font-mono text-xs">
                    {o.id.slice(-10)}
                  </td>
                  <td className="py-2.5 text-gray-900 font-medium">
                    {o.restaurantName}
                  </td>
                  <td className="py-2.5 text-gray-900 tabular-nums">
                    ฿{o.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_PILL[o.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-400 text-xs">
                    {new Date(o.createdAt).toLocaleString("th-TH", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentOrders.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              ยังไม่มีออเดอร์
            </p>
          )}
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {recentOrders.map((o) => (
            <div
              key={o.id}
              className="rounded-xl border border-gray-100 p-3 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900 truncate max-w-[180px]">
                    {o.restaurantName}
                  </p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_PILL[o.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  #{o.id.slice(-10)} ·{" "}
                  {new Date(o.createdAt).toLocaleString("th-TH", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <p className="text-sm font-bold text-orange-500 tabular-nums shrink-0">
                ฿{o.totalAmount.toLocaleString()}
              </p>
            </div>
          ))}
          {recentOrders.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              ยังไม่มีออเดอร์
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
