"use client";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Flame, Search, Store } from "lucide-react";

export default function FlashDealsPage() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.admin.listAllFoodItems.useQuery();
  const setFlashDeal = trpc.admin.setFlashDeal.useMutation({
    onSuccess: () => utils.admin.listAllFoodItems.invalidate(),
    onError: (e) => alert("เกิดข้อผิดพลาด: " + e.message),
  });

  const [search, setSearch] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all");
  const [filterFlash, setFilterFlash] = useState<"all" | "flash" | "normal">("all");

  const restaurants = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((i) => map.set(i.restaurantId, i.restaurantName));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (selectedRestaurant !== "all" && item.restaurantId !== selectedRestaurant) return false;
      if (filterFlash === "flash" && !item.isPopular) return false;
      if (filterFlash === "normal" && item.isPopular) return false;
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.restaurantName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, selectedRestaurant, filterFlash, search]);

  const flashCount = items.filter((i) => i.isPopular).length;

  const toggle = (itemId: string, current: boolean) => {
    setFlashDeal.mutate({ itemId, isFlash: !current });
  };

  if (isLoading) return <div className="flex items-center justify-center h-48"><p className="text-gray-400 text-sm">กำลังโหลด...</p></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการดีลแฟลช</h1>
        <p className="text-sm text-gray-400 mt-1">เลือกเมนูที่ต้องการแสดงในส่วน "ดีลแฟลช" บนหน้าแรกของแอป</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{flashCount}</p>
            <p className="text-xs text-gray-400">ดีลแฟลชทั้งหมด</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
            <Store className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{restaurants.length}</p>
            <p className="text-xs text-gray-400">ร้านอาหารทั้งหมด</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
            <p className="text-xs text-gray-400">เมนูทั้งหมด</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาเมนูหรือร้าน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <select
          value={selectedRestaurant}
          onChange={(e) => setSelectedRestaurant(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        >
          <option value="all">ทุกร้าน</option>
          {restaurants.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {(["all", "flash", "normal"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterFlash(f)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                filterFlash === f ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "ทั้งหมด" : f === "flash" ? "ดีลแฟลช" : "ปกติ"}
            </button>
          ))}
        </div>
      </div>

      {/* Item List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Flame className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">ไม่พบเมนู</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">เมนู</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ร้านอาหาร</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">หมวดหมู่</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">ราคา</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">ดีลแฟลช</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.restaurantName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.category}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">฿{item.price}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggle(item.id, item.isPopular)}
                      disabled={setFlashDeal.isPending}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                        item.isPopular
                          ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      <Flame className={`w-3.5 h-3.5 ${item.isPopular ? "fill-orange-500" : ""}`} />
                      {item.isPopular ? "แฟลชอยู่" : "เพิ่มดีล"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
