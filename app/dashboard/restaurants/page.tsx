"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, ToggleLeft, ToggleRight, Pencil, Trash2 } from "lucide-react";

export default function RestaurantsPage() {
  const { data: restaurants = [], isLoading, refetch } = trpc.admin.listRestaurants.useQuery();
  const { data: users = [] } = trpc.admin.listUsers.useQuery();
  const assign = trpc.admin.assignRestaurant.useMutation({ onSuccess: () => refetch() });
  const toggle = trpc.admin.toggleRestaurant.useMutation({ onSuccess: () => refetch() });
  const deleteRestaurant = trpc.admin.deleteRestaurant.useMutation({ onSuccess: () => refetch() });
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const deleteRestaurants = trpc.admin.deleteRestaurants.useMutation({
    onSuccess: (res: any) => {
      setBulkConfirm(false);
      setSelected(new Set());
      refetch();
      const deleted = res?.deleted ?? 0;
      const blocked = res?.blocked ?? [];
      if (blocked.length > 0) {
        const names = blocked.map((b: any) => `• ${b.name}`).join("\n");
        alert(`ลบสำเร็จ ${deleted} ร้าน\n\nข้ามไป ${blocked.length} ร้าน เพราะมีออเดอร์ที่กำลังดำเนินการ:\n${names}`);
      } else if (deleted > 0) {
        // silent success — refetch removes them from view
      }
    },
    onError: (err: any) => alert(err?.message ?? "ลบหลายรายการไม่สำเร็จ"),
  });

  // Drop selections that left the visible list
  useEffect(() => {
    if (selected.size === 0) return;
    const visible = new Set(restaurants.map((r: any) => r.id));
    const next = new Set<string>();
    let changed = false;
    selected.forEach((id) => {
      if (visible.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelected(next);
  }, [restaurants, selected]);

  const allVisibleSelected = restaurants.length > 0 && restaurants.every((r: any) => selected.has(r.id));
  const someSelected = selected.size > 0 && !allVisibleSelected;
  const headerCbRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    if (allVisibleSelected) setSelected(new Set());
    else setSelected(new Set(restaurants.map((r: any) => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const merchants = users.filter(u => u.role === "merchant" || u.role === "admin");

  async function handleAssign(restaurantId: string, ownerId: number | null) {
    if (ownerId === null) return;
    try {
      setAssigningId(restaurantId);
      await assign.mutateAsync({ restaurantId, ownerId });
    } finally {
      setAssigningId(null);
    }
  }

  async function handleToggle(restaurantId: string, isOpen: boolean) {
    try {
      setTogglingId(restaurantId);
      await toggle.mutateAsync({ restaurantId, isOpen });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(restaurantId: string, name: string) {
    if (!confirm(`ต้องการลบร้าน "${name}" ใช่หรือไม่?\nเมนูและรายการโปรดของร้านนี้จะถูกลบด้วย`)) return;
    try {
      setDeletingId(restaurantId);
      await deleteRestaurant.mutateAsync({ restaurantId });
      alert("ลบร้านอาหารสำเร็จ");
    } catch (error: any) {
      alert(error?.message ?? "ลบร้านอาหารไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการร้านอาหาร</h1>
        <span className="text-sm text-gray-400">{restaurants.length} ร้าน</span>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between mb-3 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl">
          <span className="text-sm text-gray-700">
            เลือกแล้ว <b className="text-orange-600">{selected.size}</b> ร้าน
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
              ลบ {selected.size} ร้าน
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-sm">
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อร้าน</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">หมวดหมู่</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">เจ้าของ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">มอบหมายให้</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">เปิด/ปิด</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r: any) => {
              const owner = users.find((u: any) => u.id === r.ownerId);
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
                      aria-label={`เลือก ${r.name}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/dashboard/restaurants/${r.id}`} className="hover:text-orange-500 hover:underline transition-colors">
                      {r.name}
                    </Link>
                    <RestaurantTypeBadges r={r} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.isOpen ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" /> เปิด
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        <XCircle className="w-3 h-3" /> ปิด
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {owner ? `${owner.name ?? owner.email} (#${owner.id})` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.ownerId ?? ""}
                      disabled={assigningId === r.id}
                      onChange={e => handleAssign(r.id, e.target.value ? Number(e.target.value) : null)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50"
                    >
                      <option value="">— ไม่มีเจ้าของ —</option>
                      {merchants.map(m => (
                        <option key={m.id} value={m.id}>{m.name ?? m.email} (#{m.id})</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(r.id, !r.isOpen)}
                      disabled={togglingId === r.id}
                      className="flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 transition-colors"
                    >
                      {r.isOpen ? (
                        <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600">เปิดอยู่</span></>
                      ) : (
                        <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-400">ปิดอยู่</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/restaurants/${r.id}`}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="แก้ไขร้าน"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(r.id, r.name)}
                        disabled={deletingId === r.id}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="ลบร้าน"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {restaurants.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">ไม่มีร้านอาหาร</div>
        )}
      </div>

      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              ลบร้านอาหาร {selected.size} ร้าน?
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              เมนูอาหารและรายการโปรดของแต่ละร้านจะถูกลบไปด้วย — ลบถาวร ไม่สามารถย้อนกลับได้
            </p>
            <p className="text-xs text-gray-400 mb-5">
              ร้านที่มีออเดอร์ที่ยังดำเนินการอยู่ (pending / preparing / delivering) จะถูกข้ามไป
              และแจ้งให้ทราบหลังลบ
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBulkConfirm(false)}
                disabled={deleteRestaurants.isPending}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => deleteRestaurants.mutate({ restaurantIds: Array.from(selected) })}
                disabled={deleteRestaurants.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleteRestaurants.isPending ? "กำลังลบ..." : "ลบทั้งหมด"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Phase 5+ — type pills derived from the unified restaurant type
 * flags. A row can only be ONE of regular/market/preorder (the type
 * picker enforces this server-side), but pickup is orthogonal — a
 * regular shop or a preorder shop can both also accept walk-in
 * pickup.
 */
function RestaurantTypeBadges({ r }: { r: Record<string, unknown> }) {
  const isMarket = Boolean(r.isMarketVendor) || r.marketId != null;
  const isPreorder = Boolean(r.acceptsPreorder);
  const isPickup = Boolean(r.acceptsPickup);
  const type: "regular" | "market" | "preorder" = isMarket
    ? "market"
    : isPreorder
      ? "preorder"
      : "regular";

  const typeMeta: Record<typeof type, { label: string; cls: string }> = {
    regular: { label: "ปกติ", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    market: { label: "ตลาดนัด", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    preorder: { label: "พรีออเดอร์", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  };
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${typeMeta[type].cls}`}>
        {typeMeta[type].label}
      </span>
      {isPickup && (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
          + รับที่ร้าน
        </span>
      )}
    </div>
  );
}
