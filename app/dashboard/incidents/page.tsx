"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Plus } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  open: "เปิดเคส",
  in_progress: "กำลังจัดการ",
  resolved: "ปิดเคสแล้ว",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

function formatThaiDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function IncidentsPage() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [orderId, setOrderId] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [notice, setNotice] = useState<string | null>(null);

  const { data = [], isLoading, error } = trpc.admin.listIncidents.useQuery(
    { status: statusFilter },
    { refetchInterval: 15000 },
  );

  const createIncident = trpc.admin.createIncident.useMutation({
    onSuccess: async () => {
      await utils.admin.listIncidents.invalidate();
      setTitle("");
      setDescription("");
      setOrderId("");
      setSeverity("medium");
      setNotice("สร้าง incident แล้ว");
      setTimeout(() => setNotice(null), 1800);
    },
  });

  const updateIncident = trpc.admin.updateIncident.useMutation({
    onSuccess: async () => {
      await utils.admin.listIncidents.invalidate();
    },
  });

  const summary = useMemo(() => {
    return {
      all: data.length,
      open: data.filter((i) => i.status === "open").length,
      inProgress: data.filter((i) => i.status === "in_progress").length,
      resolved: data.filter((i) => i.status === "resolved").length,
    };
  }, [data]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-500" /> Incident Center
        </h1>
        <p className="text-sm text-gray-500 mt-1">ศูนย์จัดการออเดอร์ค้าง SLA และเหตุขัดข้องระบบแบบรวมศูนย์</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl border border-gray-100 bg-white p-3"><div className="text-xs text-gray-500">ทั้งหมด</div><div className="text-xl font-bold">{summary.all}</div></div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3"><div className="text-xs text-amber-600">เปิดเคส</div><div className="text-xl font-bold text-amber-700">{summary.open}</div></div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><div className="text-xs text-blue-600">กำลังจัดการ</div><div className="text-xl font-bold text-blue-700">{summary.inProgress}</div></div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-3"><div className="text-xs text-green-600">ปิดแล้ว</div><div className="text-xl font-bold text-green-700">{summary.resolved}</div></div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">สร้าง incident แบบ manual</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="หัวข้อ incident"
            className="md:col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Order ID (ถ้ามี)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as "low" | "medium" | "high" | "critical")}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button
            onClick={() =>
              createIncident.mutate({
                title: title.trim(),
                description: description.trim() || undefined,
                orderId: orderId.trim() || undefined,
                severity,
                type: "manual",
              })
            }
            disabled={createIncident.isPending || !title.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 text-white text-sm font-semibold px-3 py-2 hover:bg-orange-600 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" /> เพิ่มเคส
          </button>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="รายละเอียด"
          className="mt-3 w-full min-h-[70px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      {notice && <div className="mb-4 rounded-lg bg-green-50 border border-green-100 text-green-700 text-sm px-3 py-2">{notice}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2">{error.message}</div>}

      <div className="flex gap-2 flex-wrap mb-3">
        {[
          { key: "all", label: "ทั้งหมด" },
          { key: "open", label: "เปิดเคส" },
          { key: "in_progress", label: "กำลังจัดการ" },
          { key: "resolved", label: "ปิดแล้ว" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setStatusFilter(item.key as "all" | "open" | "in_progress" | "resolved")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              statusFilter === item.key ? "bg-orange-500 text-white border-orange-500" : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">กำลังโหลด incident...</div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">ไม่มี incident</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_COLORS[item.severity] ?? SEVERITY_COLORS.medium}`}>
                        {item.severity}
                      </span>
                      <span className="text-xs text-gray-400">#{item.id}</span>
                      <span className="text-xs text-gray-500">{STATUS_LABELS[item.status] ?? item.status}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{item.description || "-"}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      order: {item.orderId || "-"} · ร้าน: {item.restaurantName || "-"} · สร้างเมื่อ {formatThaiDateTime(item.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        updateIncident.mutate({
                          incidentId: item.id,
                          status: e.target.value as "open" | "in_progress" | "resolved",
                        })
                      }
                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
                    >
                      <option value="open">เปิดเคส</option>
                      <option value="in_progress">กำลังจัดการ</option>
                      <option value="resolved">ปิดแล้ว</option>
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
