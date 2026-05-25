"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Bike,
  CheckCircle2,
  Loader2,
  Package,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";

type ApprovalFilter = "all" | "pending" | "approved" | "rejected";

export default function RidersPage() {
  const utils = trpc.useUtils();
  const { data: ridersAll = [], isLoading, refetch } = trpc.admin.listRiders.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const [filter, setFilter] = useState<ApprovalFilter>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const deleteRiders = trpc.admin.deleteRiders.useMutation({
    onSuccess: (res: any) => {
      setBulkConfirm(false);
      setSelected(new Set());
      refetch();
      const deleted = res?.deleted ?? 0;
      const blocked = res?.blocked ?? [];
      if (blocked.length > 0) {
        const names = blocked.map((b: any) => `• ${b.name}`).join("\n");
        alert(`ลบสำเร็จ ${deleted} คน\n\nข้ามไป ${blocked.length} คน เพราะกำลังส่งของอยู่:\n${names}`);
      }
    },
    onError: (err: any) => alert(err?.message ?? "ลบหลายรายการไม่สำเร็จ"),
  });

  const [busyRiderId, setBusyRiderId] = useState<number | null>(null);
  const reviewDocs = trpc.admin.reviewRiderDocs.useMutation({
    onSuccess: () => {
      utils.admin.listRiders.invalidate();
      setBusyRiderId(null);
    },
    onError: (err: any) => {
      alert(err?.message ?? "ไม่สำเร็จ");
      setBusyRiderId(null);
    },
  });

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of ridersAll as any[]) {
      if (r.riderApprovalStatus === "pending") pending += 1;
      else if (r.riderApprovalStatus === "approved") approved += 1;
      else if (r.riderApprovalStatus === "rejected") rejected += 1;
    }
    return { all: ridersAll.length, pending, approved, rejected };
  }, [ridersAll]);

  const riders = useMemo(() => {
    if (filter === "all") return ridersAll;
    return (ridersAll as any[]).filter((r) => r.riderApprovalStatus === filter);
  }, [ridersAll, filter]);

  // Drop selections that left the visible list
  useEffect(() => {
    if (selected.size === 0) return;
    const visible = new Set(riders.map((r: any) => r.id));
    const next = new Set<number>();
    let changed = false;
    selected.forEach((id) => {
      if (visible.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelected(next);
  }, [riders, selected]);

  const allVisibleSelected = riders.length > 0 && riders.every((r: any) => selected.has(r.id));
  const someSelected = selected.size > 0 && !allVisibleSelected;
  const headerCbRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    if (allVisibleSelected) setSelected(new Set());
    else setSelected(new Set(riders.map((r: any) => r.id)));
  };
  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onlineCount = riders.filter((r: any) => r.riderOnline).length;
  const totalDelivered = riders.reduce((s: number, r: any) => s + r.totalDelivered, 0);
  const totalEarnings = riders.reduce((s: number, r: any) => s + r.totalEarnings, 0);

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ไรเดอร์</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="inline-flex p-2 rounded-lg bg-blue-50 text-blue-600 mb-3">
            <Bike className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{riders.length}</p>
          <p className="text-sm text-gray-500 mt-1">ไรเดอร์ทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="inline-flex p-2 rounded-lg bg-green-50 text-green-600 mb-3">
            <Wifi className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{onlineCount}</p>
          <p className="text-sm text-gray-500 mt-1">ออนไลน์ตอนนี้</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="inline-flex p-2 rounded-lg bg-purple-50 text-purple-600 mb-3">
            <Package className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalDelivered}</p>
          <p className="text-sm text-gray-500 mt-1">ส่งสำเร็จรวม</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="inline-flex p-2 rounded-lg bg-orange-50 text-orange-600 mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">฿{totalEarnings.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">รายได้รวมทั้งหมด</p>
        </div>
      </div>

      {/* Verification filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          icon={<Bike className="w-3.5 h-3.5" />}
          label="ทั้งหมด"
          count={counts.all}
        />
        <FilterChip
          active={filter === "pending"}
          onClick={() => setFilter("pending")}
          icon={<ShieldCheck className="w-3.5 h-3.5" />}
          label="รอตรวจสอบ"
          count={counts.pending}
          tone="amber"
        />
        <FilterChip
          active={filter === "approved"}
          onClick={() => setFilter("approved")}
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          label="อนุมัติแล้ว"
          count={counts.approved}
          tone="emerald"
        />
        <FilterChip
          active={filter === "rejected"}
          onClick={() => setFilter("rejected")}
          icon={<XCircle className="w-3.5 h-3.5" />}
          label="ถูกปฏิเสธ"
          count={counts.rejected}
          tone="red"
        />
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between mb-3 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl">
          <span className="text-sm text-gray-700">
            เลือกแล้ว <b className="text-orange-600">{selected.size}</b> คน
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-xs rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ยกเลิกการเลือก
            </button>
            <button
              onClick={() => setBulkConfirm(true)}
              className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ลบ {selected.size} คน
            </button>
          </div>
        </div>
      )}

      {/* Riders table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 w-10">
                <input
                  ref={headerCbRef}
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                  aria-label="เลือกทั้งหมด"
                />
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ไรเดอร์</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ยืนยันตัวตน</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">วันนี้</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">รายได้วันนี้</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ทั้งหมด</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">รายได้รวม</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">งานปัจจุบัน</th>
            </tr>
          </thead>
          <tbody>
            {riders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">ยังไม่มีไรเดอร์</td>
              </tr>
            ) : riders.map((r: any) => {
              const isSelected = selected.has(r.id);
              return (
              <tr
                key={r.id}
                className={`border-b border-gray-50 transition-colors ${
                  isSelected ? "bg-orange-50/50" : "hover:bg-gray-50/50"
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(r.id)}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                    aria-label={`เลือก ${r.name ?? r.email ?? r.id}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/riders/${r.id}`}
                    className="group inline-block"
                  >
                    <div className="font-medium text-gray-900 group-hover:text-orange-500 group-hover:underline transition-colors">
                      {r.name ?? "—"}
                    </div>
                    <div className="text-xs text-gray-400">{r.email ?? r.phone ?? "—"}</div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {r.riderOnline ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      ออนไลน์
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      <WifiOff className="w-3 h-3" />
                      ออฟไลน์
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <VerificationCell
                    riderId={r.id}
                    status={r.riderApprovalStatus}
                    busy={busyRiderId === r.id && reviewDocs.isPending}
                    onApprove={() => {
                      setBusyRiderId(r.id);
                      reviewDocs.mutate({ riderId: r.id, decision: "approved" });
                    }}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.todayDelivered} งาน</td>
                <td className="px-4 py-3 font-medium text-green-600">฿{r.todayEarnings.toLocaleString()}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.totalDelivered} งาน</td>
                <td className="px-4 py-3 font-medium text-green-600">฿{r.totalEarnings.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {r.activeOrder ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      กำลังส่ง
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">ว่าง</span>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* helpers below */}
      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              ลบไรเดอร์ {selected.size} คน?
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              ลบถาวร — ออเดอร์เดิมที่ไรเดอร์เคยส่งจะยังอยู่ แต่ช่อง "ไรเดอร์" ในออเดอร์เก่าจะกลายเป็น "—"
            </p>
            <p className="text-xs text-gray-400 mb-5">
              ไรเดอร์ที่กำลังส่งของอยู่ในออเดอร์ active จะถูกข้ามไป
              และแจ้งให้ทราบหลังลบ
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBulkConfirm(false)}
                disabled={deleteRiders.isPending}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => deleteRiders.mutate({ userIds: Array.from(selected) })}
                disabled={deleteRiders.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleteRiders.isPending ? "กำลังลบ..." : "ลบทั้งหมด"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  label,
  count,
  tone = "slate",
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  tone?: "slate" | "amber" | "emerald" | "red";
}) {
  const palette =
    tone === "amber"
      ? { activeBg: "bg-amber-500", activeText: "text-white", chip: "bg-amber-100 text-amber-700" }
      : tone === "emerald"
        ? { activeBg: "bg-emerald-600", activeText: "text-white", chip: "bg-emerald-100 text-emerald-700" }
        : tone === "red"
          ? { activeBg: "bg-red-500", activeText: "text-white", chip: "bg-red-100 text-red-700" }
          : { activeBg: "bg-gray-900", activeText: "text-white", chip: "bg-gray-200 text-gray-700" };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? `${palette.activeBg} ${palette.activeText}`
          : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {icon}
      {label}
      <span
        className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
          active ? "bg-white/25 text-white" : palette.chip
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function VerificationCell({
  riderId,
  status,
  busy,
  onApprove,
}: {
  riderId: number;
  status: "none" | "pending" | "approved" | "rejected" | string;
  busy: boolean;
  onApprove: () => void;
}) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="w-3 h-3" />
        อนุมัติแล้ว
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <Link
        href={`/dashboard/riders/${riderId}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
      >
        <XCircle className="w-3 h-3" />
        ดูเหตุผล
      </Link>
    );
  }
  if (status === "pending") {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          href={`/dashboard/riders/${riderId}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
        >
          ดูเอกสาร
        </Link>
        <button
          onClick={onApprove}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          อนุมัติ
        </button>
      </div>
    );
  }
  return <span className="text-xs text-gray-400">ยังไม่ส่ง</span>;
}
