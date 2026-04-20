"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Bell, CheckCheck, RefreshCcw, Send, TestTube2 } from "lucide-react";

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

const severityStyles: Record<string, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-100",
  warning: "bg-amber-50 text-amber-700 border-amber-100",
  critical: "bg-red-50 text-red-700 border-red-100",
};

export default function InboxPage() {
  const utils = trpc.useUtils();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [testTitle, setTestTitle] = useState("ทดสอบแจ้งเตือน");
  const [testMessage, setTestMessage] = useState("นี่คือข้อความทดสอบกล่องแจ้งเตือนแอดมิน");
  const [notice, setNotice] = useState<string | null>(null);

  const { data = [], isLoading, refetch, error } = trpc.admin.listNotifications.useQuery(
    { unreadOnly, limit: 200 },
    { refetchInterval: 15000 },
  );

  const markRead = trpc.admin.markNotificationRead.useMutation({
    onSuccess: async () => {
      await utils.admin.listNotifications.invalidate();
    },
  });

  const markAll = trpc.admin.markAllNotificationsRead.useMutation({
    onSuccess: async () => {
      await utils.admin.listNotifications.invalidate();
      setNotice("อ่านทั้งหมดแล้ว");
      setTimeout(() => setNotice(null), 1800);
    },
  });

  const createTest = trpc.admin.createTestNotification.useMutation({
    onSuccess: async () => {
      await utils.admin.listNotifications.invalidate();
      setNotice("ส่งแจ้งเตือนทดสอบแล้ว");
      setTimeout(() => setNotice(null), 1800);
    },
  });

  const unreadCount = useMemo(() => data.filter((n) => !n.isRead).length, [data]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-orange-500" />
            กล่องแจ้งเตือนแอดมิน
          </h1>
          <p className="text-sm text-gray-500 mt-1">รวมการแจ้งเตือน SLA, คำขออนุมัติ, การเงิน และเหตุผิดปกติ</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">ยังไม่อ่าน</div>
          <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">ตัวกรองและการจัดการ</h2>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> รีเฟรช
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setUnreadOnly(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                !unreadOnly ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setUnreadOnly(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                unreadOnly ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              ยังไม่อ่าน
            </button>
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending || unreadCount === 0}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 text-white hover:bg-black disabled:opacity-40"
            >
              <CheckCheck className="w-3.5 h-3.5" /> อ่านทั้งหมด
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2 inline-flex items-center gap-1.5">
            <TestTube2 className="w-4 h-4 text-orange-500" /> แจ้งเตือนทดสอบ
          </h2>
          <div className="space-y-2">
            <input
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="หัวข้อ"
            />
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[70px]"
              placeholder="ข้อความ"
            />
            <button
              onClick={() => createTest.mutate({ title: testTitle.trim(), message: testMessage.trim(), severity: "info" })}
              disabled={createTest.isPending || !testTitle.trim() || !testMessage.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-40"
            >
              <Send className="w-4 h-4" /> ส่งทดสอบ
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm px-3 py-2">{notice}</div>
      )}
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2">{error.message}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">กำลังโหลดแจ้งเตือน...</div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">ไม่มีแจ้งเตือน</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.map((item) => (
              <div key={item.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${severityStyles[item.severity] ?? severityStyles.info}`}>
                        {item.severity}
                      </span>
                      <span className="text-xs text-gray-400">#{item.id}</span>
                      {!item.isRead && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 break-words">{item.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5 break-words">{item.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatThaiDateTime(item.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => markRead.mutate({ id: item.id, isRead: !item.isRead })}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-white bg-gray-50"
                  >
                    {item.isRead ? "ทำเป็นยังไม่อ่าน" : "ทำเป็นอ่านแล้ว"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
