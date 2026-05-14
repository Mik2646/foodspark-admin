"use client";
import { trpc } from "@/lib/trpc";
import {
  ShoppingBag,
  Store,
  ClipboardList,
  DollarSign,
  Bike,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
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

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <div className={`inline-flex p-2 rounded-xl mb-3 ${bg} ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">
        {value}
      </p>
      <p className="text-xs sm:text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// Compact Thai date label "13 พ.ค." for the chart's x-axis.
function formatShortDate(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export default function DashboardPage() {
  const { data, isLoading, error } = trpc.admin.overview.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: recentOrders = [] } = trpc.admin.listOrders.useQuery(
    { limit: 10 },
    { refetchInterval: 15000 },
  );

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

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          ภาพรวมระบบ
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          สถิติแอปทั้งหมด อัปเดตทุก 30 วินาที
        </p>
      </div>

      {/* Stat cards — 2 cols on mobile, 5 cols on lg */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          icon={ShoppingBag}
          label="ผู้ใช้ทั้งหมด"
          value={data?.totalUsers ?? 0}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          icon={Store}
          label="ร้านอาหาร"
          value={data?.totalRestaurants ?? 0}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <StatCard
          icon={ClipboardList}
          label="ออเดอร์ทั้งหมด"
          value={data?.totalOrders ?? 0}
          color="text-purple-600"
          bg="bg-purple-50"
        />
        <StatCard
          icon={Bike}
          label="ไรเดอร์"
          value={data?.riderCount ?? 0}
          color="text-cyan-600"
          bg="bg-cyan-50"
        />
        <StatCard
          icon={DollarSign}
          label="รายได้รวม"
          value={`฿${(data?.totalRevenue ?? 0).toLocaleString()}`}
          color="text-green-600"
          bg="bg-green-50"
        />
      </div>

      {/* Charts row — trend (lg:span-2) + status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-day trend area chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                ออเดอร์ 7 วันล่าสุด
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                เส้น = ออเดอร์ · แท่ง = รายได้
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

        {/* Status donut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-purple-500" />
            สถานะออเดอร์
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">
            แยกตามสถานะปัจจุบัน
          </p>
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
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bar chart row — revenue per day */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-green-500" />
          รายได้ต่อวัน (7 วัน)
        </h2>
        <p className="text-xs text-gray-400 mt-0.5 mb-3">
          รวมเฉพาะออเดอร์ที่ส่งสำเร็จแล้ว
        </p>
        <div className="h-44 sm:h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={trend}
              margin={{ top: 6, right: 6, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.55} />
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
                formatter={(value) => [
                  `฿${Number(value).toLocaleString()}`,
                  "รายได้",
                ]}
              />
              <Bar dataKey="revenue" fill="url(#revBar)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "ผู้ใช้ทั่วไป",
            value: data?.regularCount ?? 0,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "ร้านค้า (Merchant)",
            value: data?.merchantCount ?? 0,
            color: "bg-orange-50 text-orange-600",
          },
          {
            label: "ไรเดอร์",
            value: data?.riderCount ?? 0,
            color: "bg-cyan-50 text-cyan-600",
          },
          {
            label: "แอดมิน",
            value: data?.adminCount ?? 0,
            color: "bg-purple-50 text-purple-600",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between"
          >
            <span className="text-xs sm:text-sm text-gray-500">{label}</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-sm font-bold tabular-nums ${color}`}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <h2 className="text-base font-bold text-gray-900 mb-3">
          ออเดอร์ล่าสุด
        </h2>
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
                <tr
                  key={o.id}
                  className="border-b border-gray-50 last:border-0"
                >
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

        {/* Mobile card list — tables don't fit on small screens */}
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
