"use client";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, User, Store, Bike } from "lucide-react";

const ROLE_LABELS: Record<string, string> = { merchant: "ร้านค้า", rider: "ไรเดอร์" };
const ROLE_ICONS: Record<string, React.ElementType> = { merchant: Store, rider: Bike };
const ROLE_COLORS: Record<string, string> = {
  merchant: "bg-orange-50 text-orange-600",
  rider: "bg-cyan-50 text-cyan-600",
};

export default function ApprovalsPage() {
  const utils = trpc.useUtils();
  const { data: pending = [], isLoading } = trpc.admin.listPendingApprovals.useQuery(undefined, { refetchInterval: 15000 });
  const setStatus = trpc.admin.setApprovalStatus.useMutation({
    onSuccess: () => utils.admin.listPendingApprovals.invalidate(),
  });

  const handle = (userId: number, status: "approved" | "rejected") => {
    setStatus.mutate({ userId, status });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">อนุมัติคำขอ</h1>

      {isLoading && <p className="text-gray-400 text-sm">กำลังโหลด...</p>}

      {!isLoading && pending.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">ไม่มีคำขออนุมัติที่รอดำเนินการ</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs">ผู้ใช้</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs">บทบาท</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs">ชื่อร้าน / ข้อมูล</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs">อีเมล</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs">โทรศัพท์</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 text-xs">วันที่สมัคร</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500 text-xs">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((u) => {
                const RoleIcon = ROLE_ICONS[u.role] ?? User;
                return (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <span className="font-medium text-gray-900">{u.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                        <RoleIcon className="w-3 h-3" />
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === "merchant" ? (
                        <span className="font-medium text-gray-800">{(u as any).restaurantName ?? <span className="text-gray-400 italic">ไม่มีข้อมูลร้าน</span>}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{u.email ?? "—"}</td>
                    <td className="px-6 py-4 text-gray-500">{u.phone ?? "—"}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handle(u.id, "approved")}
                          disabled={setStatus.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          อนุมัติ
                        </button>
                        <button
                          onClick={() => handle(u.id, "rejected")}
                          disabled={setStatus.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          ปฏิเสธ
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
