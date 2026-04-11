"use client";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, User, Store, Bike, Phone, Car, Navigation } from "lucide-react";

const ROLE_LABELS: Record<string, string> = { merchant: "ร้านค้า", rider: "ไรเดอร์" };
const ROLE_ICONS: Record<string, React.ElementType> = { merchant: Store, rider: Bike };
const ROLE_COLORS: Record<string, string> = {
  merchant: "bg-orange-50 text-orange-600",
  rider: "bg-cyan-50 text-cyan-600",
};

const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: "มอเตอร์ไซค์",
  bicycle: "จักรยาน",
  car: "รถยนต์",
};
const VEHICLE_ICONS: Record<string, React.ElementType> = {
  motorcycle: Bike,
  bicycle: Navigation,
  car: Car,
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">อนุมัติคำขอ</h1>
        {pending.length > 0 && (
          <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">{pending.length}</span>
        )}
      </div>

      {isLoading && <p className="text-gray-400 text-sm">กำลังโหลด...</p>}

      {!isLoading && pending.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">ไม่มีคำขออนุมัติที่รอดำเนินการ</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-4">
          {pending.map((u) => {
            const RoleIcon = ROLE_ICONS[u.role] ?? User;
            const ua = u as any;
            return (
              <div key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: user info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{u.name ?? "—"}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                          <RoleIcon className="w-3 h-3" />
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </div>

                      {/* Contact */}
                      {u.phone && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                          <Phone className="w-3.5 h-3.5" />
                          {u.phone}
                        </div>
                      )}

                      {/* Merchant info */}
                      {u.role === "merchant" && (
                        <div className="mt-2 p-3 bg-orange-50 rounded-xl space-y-1">
                          <p className="text-sm font-semibold text-orange-800">
                            <Store className="w-3.5 h-3.5 inline mr-1" />
                            {ua.restaurantNameApply ?? ua.restaurantName ?? "ไม่ระบุชื่อร้าน"}
                          </p>
                          {ua.restaurantTypeApply && (
                            <p className="text-xs text-orange-600">{ua.restaurantTypeApply}</p>
                          )}
                        </div>
                      )}

                      {/* Rider info */}
                      {u.role === "rider" && (ua.vehicleType || ua.vehiclePlate) && (
                        <div className="mt-2 p-3 bg-cyan-50 rounded-xl space-y-1">
                          {ua.vehicleType && (() => { const VIcon = VEHICLE_ICONS[ua.vehicleType] ?? Bike; return (
                            <p className="text-sm font-semibold text-cyan-800 flex items-center gap-1.5">
                              <VIcon size={14} /> {VEHICLE_LABELS[ua.vehicleType] ?? ua.vehicleType}
                            </p>
                          ); })()}
                          {ua.vehiclePlate && (
                            <p className="text-xs text-cyan-600">ทะเบียน: {ua.vehiclePlate}</p>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-2">
                        สมัคร {new Date(u.createdAt).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handle(u.id, "approved")}
                      disabled={setStatus.isPending}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      อนุมัติ
                    </button>
                    <button
                      onClick={() => handle(u.id, "rejected")}
                      disabled={setStatus.isPending}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 border border-red-200"
                    >
                      <XCircle className="w-4 h-4" />
                      ปฏิเสธ
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
