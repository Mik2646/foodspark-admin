"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { BookText, Search } from "lucide-react";

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

export default function AuditPage() {
  const [q, setQ] = useState("");
  const [targetType, setTargetType] = useState("");
  const [action, setAction] = useState("");

  const { data = [], isLoading, error } = trpc.admin.listAuditLogs.useQuery({
    limit: 300,
    q: q.trim() || undefined,
    targetType: targetType || undefined,
    action: action || undefined,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
          <BookText className="w-6 h-6 text-orange-500" /> Audit Log
        </h1>
        <p className="text-sm text-gray-500 mt-1">ประวัติการเปลี่ยนแปลงทั้งหมดของแอดมินเพื่อการตรวจสอบย้อนหลัง</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="relative block">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหา action/target/admin"
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm"
            />
          </label>
          <input
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            placeholder="targetType เช่น promo"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="action เช่น promo.create"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2">{error.message}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">กำลังโหลด audit logs...</div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">ยังไม่มี audit log</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs text-gray-500">เวลา</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500">Admin</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500">Action</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500">Target</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500">ก่อน</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500">หลัง</th>
                </tr>
              </thead>
              <tbody>
                {data.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 align-top">
                    <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">{formatThaiDateTime(log.createdAt)}</td>
                    <td className="py-2 px-3 text-xs text-gray-700">{log.adminName || `#${log.adminUserId}`}</td>
                    <td className="py-2 px-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-700 border border-orange-100">{log.action}</span>
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-600">{log.targetType}{log.targetId ? `:${log.targetId}` : ""}</td>
                    <td className="py-2 px-3 text-xs text-gray-500 max-w-[260px]">
                      <pre className="whitespace-pre-wrap break-words">{log.beforeData ? JSON.stringify(log.beforeData, null, 2) : "-"}</pre>
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-500 max-w-[260px]">
                      <pre className="whitespace-pre-wrap break-words">{log.afterData ? JSON.stringify(log.afterData, null, 2) : "-"}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
