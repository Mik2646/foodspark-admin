"use client";
import { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Store, Star, Clock, Truck, ChevronRight, Package } from "lucide-react";

export default function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = trpc.admin.getRestaurantDetail.useQuery({ id });

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;
  if (!data) return <div className="text-red-500 text-sm">ไม่พบร้านอาหาร</div>;

  const { restaurant: r, menu, owner } = data;

  // Group menu by category
  const categories = [...new Set(menu.map(m => m.category))];

  return (
    <div className="max-w-4xl">
      {/* Back */}
      <Link href="/dashboard/restaurants" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        กลับหน้าร้านอาหาร
      </Link>

      {/* Cover */}
      {r.coverUrl && (
        <div className="w-full h-48 rounded-xl overflow-hidden mb-6 bg-gray-100">
          <img src={r.coverUrl} alt={r.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {r.imageUrl && (
          <img src={r.imageUrl} alt={r.name} className="w-16 h-16 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{r.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {r.isOpen ? "เปิดอยู่" : "ปิดอยู่"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{r.category}</p>
          {r.address && <p className="text-sm text-gray-400 mt-1">{r.address}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Star, label: "คะแนน", value: `${r.rating ?? 0} (${r.reviewCount ?? 0} รีวิว)`, color: "text-yellow-500" },
          { icon: Clock, label: "เวลาส่ง", value: `${r.deliveryTime} นาที`, color: "text-blue-500" },
          { icon: Truck, label: "ค่าส่ง", value: `฿${r.deliveryFee}`, color: "text-orange-500" },
          { icon: Package, label: "สั่งขั้นต่ำ", value: `฿${r.minOrder}`, color: "text-purple-500" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Owner */}
      {owner && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-gray-700">เจ้าของร้าน</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{owner.name ?? "—"} <span className="text-gray-400 font-normal">(#{owner.id})</span></p>
              <p className="text-xs text-gray-400 mt-0.5">{owner.email} {owner.phone ? `· ${owner.phone}` : ""}</p>
            </div>
            <Link href={`/dashboard/users`} className="text-xs text-orange-500 hover:underline flex items-center gap-1">
              ดูผู้ใช้ <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">เมนูอาหาร</h2>
          <span className="text-xs text-gray-400">{menu.length} รายการ</span>
        </div>

        {menu.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">ยังไม่มีเมนู</div>
        ) : (
          <div>
            {categories.map(cat => (
              <div key={cat}>
                <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat}</span>
                </div>
                {menu.filter(m => m.category === cat).map(item => (
                  <div key={item.id} className="flex items-center gap-4 px-6 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-orange-500">฿{item.price}</p>
                      {item.isPopular && <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full">ยอดนิยม</span>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
