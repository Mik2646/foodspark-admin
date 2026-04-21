"use client";
import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { trpc, getToken } from "@/lib/trpc";
import { ArrowLeft, Store, Star, Clock, Truck, ChevronRight, Package, Pencil, Plus, Trash2, Check, X, ImageIcon } from "lucide-react";

async function uploadToR2(file: File, token: string | null): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error("ไฟล์ใหญ่เกินไป (สูงสุด 10MB)");
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ base64, mimeType: file.type }),
  });
  const data = await res.json();
  if (!data.url) throw new Error(data.error ?? "อัปโหลดไม่สำเร็จ");
  return data.url;
}

const EMPTY_ITEM = { name: "", description: "", price: "", imageUrl: "", category: "", isPopular: false };

export default function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.getRestaurantDetail.useQuery({ id });
  const updateRestaurant = trpc.admin.updateRestaurant.useMutation({
    onSuccess: () => { utils.admin.getRestaurantDetail.invalidate({ id }); setEditingInfo(false); },
    onError: (e) => alert("แก้ไขไม่สำเร็จ: " + e.message),
  });
  const createItem = trpc.admin.createMenuItem.useMutation({
    onSuccess: () => { utils.admin.getRestaurantDetail.invalidate({ id }); setShowItemForm(false); setItemForm(EMPTY_ITEM); },
    onError: (e) => alert("เพิ่มเมนูไม่สำเร็จ: " + e.message),
  });
  const updateItem = trpc.admin.updateMenuItem.useMutation({
    onSuccess: () => { utils.admin.getRestaurantDetail.invalidate({ id }); setEditingItemId(null); },
    onError: (e) => alert("แก้ไขเมนูไม่สำเร็จ: " + e.message),
  });
  const deleteItem = trpc.admin.deleteMenuItem.useMutation({
    onSuccess: () => utils.admin.getRestaurantDetail.invalidate({ id }),
    onError: (e) => alert("ลบไม่สำเร็จ: " + e.message),
  });

  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState<Record<string, string | boolean>>({});
  const [uploading, setUploading] = useState(false);

  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ ...EMPTY_ITEM });
  const [itemUploading, setItemUploading] = useState(false);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemForm, setEditItemForm] = useState({ ...EMPTY_ITEM });
  const [editItemUploading, setEditItemUploading] = useState(false);

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;
  if (!data) return <div className="text-red-500 text-sm">ไม่พบร้านอาหาร</div>;

  const { restaurant: r, menu, owner } = data;
  const menuCategories = [...new Set(menu.map((m) => m.category))];

  const startEditInfo = () => {
    setInfoForm({
      name: r.name, category: r.category, deliveryTime: r.deliveryTime,
      deliveryFee: String(r.deliveryFee), minOrder: String(r.minOrder),
      imageUrl: r.imageUrl, coverUrl: r.coverUrl,
      isPromo: r.isPromo, promoText: r.promoText ?? "",
      address: r.address ?? "",
    });
    setEditingInfo(true);
  };

  const handleSaveInfo = () => {
    updateRestaurant.mutate({
      id,
      name: String(infoForm.name || ""),
      category: String(infoForm.category || ""),
      deliveryTime: String(infoForm.deliveryTime || ""),
      deliveryFee: Number(infoForm.deliveryFee) || 0,
      minOrder: Number(infoForm.minOrder) || 0,
      imageUrl: String(infoForm.imageUrl || ""),
      coverUrl: String(infoForm.coverUrl || ""),
      isPromo: Boolean(infoForm.isPromo),
      promoText: String(infoForm.promoText || ""),
      address: String(infoForm.address || ""),
    });
  };

  const handleUploadInfo = async (field: "imageUrl" | "coverUrl", file: File) => {
    setUploading(true);
    try {
      const url = await uploadToR2(file, getToken());
      setInfoForm((f) => ({ ...f, [field]: url }));
    } catch (e: any) { alert("อัปโหลดไม่สำเร็จ: " + e?.message); }
    finally { setUploading(false); }
  };

  const handleAddItem = () => {
    if (!itemForm.name.trim() || !itemForm.category.trim() || !itemForm.price) return;
    createItem.mutate({
      restaurantId: id,
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || undefined,
      price: Number(itemForm.price),
      imageUrl: itemForm.imageUrl.trim(),
      category: itemForm.category.trim(),
      isPopular: itemForm.isPopular,
    });
  };

  const startEditItem = (item: typeof menu[0]) => {
    setEditingItemId(item.id);
    setEditItemForm({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      imageUrl: item.imageUrl,
      category: item.category,
      isPopular: item.isPopular,
    });
  };

  const handleSaveItem = () => {
    if (!editingItemId) return;
    updateItem.mutate({
      id: editingItemId,
      name: editItemForm.name.trim(),
      description: editItemForm.description.trim() || undefined,
      price: Number(editItemForm.price),
      imageUrl: editItemForm.imageUrl.trim(),
      category: editItemForm.category.trim(),
      isPopular: editItemForm.isPopular,
    });
  };

  const handleItemUpload = async (
    field: "imageUrl", file: File,
    setForm: (fn: (f: typeof EMPTY_ITEM) => typeof EMPTY_ITEM) => void,
    setLoading: (v: boolean) => void,
  ) => {
    setLoading(true);
    try {
      const url = await uploadToR2(file, getToken());
      setForm((f) => ({ ...f, [field]: url }));
    } catch (e: any) { alert("อัปโหลดไม่สำเร็จ: " + e?.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl">
      {/* Back */}
      <Link href="/dashboard/restaurants" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        กลับหน้าร้านอาหาร
      </Link>

      {/* Restaurant Info Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        {/* Cover */}
        {!editingInfo && r.coverUrl && (
          <div className="w-full h-40 overflow-hidden bg-gray-100">
            <Image
              src={r.coverUrl}
              alt={r.name}
              width={1280}
              height={320}
              unoptimized
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          {editingInfo ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">แก้ไขข้อมูลร้าน</p>
                <div className="flex gap-2">
                  <button onClick={handleSaveInfo} disabled={updateRestaurant.isPending || uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50">
                    <Check className="w-3.5 h-3.5" />{updateRestaurant.isPending ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                  <button onClick={() => setEditingInfo(false)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                    <X className="w-3.5 h-3.5" />ยกเลิก
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: "ชื่อร้าน", key: "name" },
                  { label: "หมวดหมู่", key: "category" },
                  { label: "เวลาส่ง (เช่น 30-45)", key: "deliveryTime" },
                  { label: "ค่าส่ง (฿)", key: "deliveryFee", type: "number" },
                  { label: "สั่งขั้นต่ำ (฿)", key: "minOrder", type: "number" },
                  { label: "ที่อยู่", key: "address" },
                  { label: "ข้อความโปรโมชัน", key: "promoText" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                    <input
                      type={type ?? "text"}
                      value={String(infoForm[key] ?? "")}
                      onChange={(e) => setInfoForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-4">
                  <input type="checkbox" id="isPromo" checked={Boolean(infoForm.isPromo)}
                    onChange={(e) => setInfoForm((f) => ({ ...f, isPromo: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500" />
                  <label htmlFor="isPromo" className="text-sm text-gray-700">แสดง badge โปรโมชัน</label>
                </div>
              </div>

              {/* Image uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(["imageUrl", "coverUrl"] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {field === "imageUrl" ? "รูปโลโก้ร้าน" : "รูป Cover"} — อัปโหลด
                    </label>
                    <input type="file" accept="image/*"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadInfo(field, f); }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-orange-50 file:text-orange-600 file:font-medium" />
                    {infoForm[field] && (
                      <Image
                        src={String(infoForm[field])}
                        alt={field === "imageUrl" ? "โลโก้ร้าน" : "รูปปกร้าน"}
                        width={96}
                        height={64}
                        unoptimized
                        className="h-16 mt-2 rounded-lg object-cover border border-gray-100"
                      />
                    )}
                  </div>
                ))}
              </div>
              {uploading && <p className="text-xs text-orange-500">⏳ กำลังอัปโหลด...</p>}
            </div>
          ) : (
              <div className="flex items-start gap-4">
                {r.imageUrl && (
                  <Image
                    src={r.imageUrl}
                    alt={r.name}
                    width={64}
                    height={64}
                    unoptimized
                    className="w-16 h-16 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold text-gray-900">{r.name}</h1>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${r.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {r.isOpen ? "เปิดอยู่" : "ปิดอยู่"}
                      </span>
                      {r.isPromo && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">{r.promoText || "โปร"}</span>}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{r.category}</p>
                    {r.address && <p className="text-sm text-gray-400 mt-0.5">{r.address}</p>}
                  </div>
                  <button onClick={startEditInfo} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 flex-shrink-0 transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> แก้ไข
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        {!editingInfo && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t border-gray-100 divide-x divide-gray-100">
            {[
              { icon: Star, label: "คะแนน", value: `${r.rating ?? 0} (${r.reviewCount ?? 0})`, color: "text-yellow-500" },
              { icon: Clock, label: "เวลาส่ง", value: `${r.deliveryTime} นาที`, color: "text-blue-500" },
              { icon: Truck, label: "ค่าส่ง", value: `฿${r.deliveryFee}`, color: "text-orange-500" },
              { icon: Package, label: "สั่งขั้นต่ำ", value: `฿${r.minOrder}`, color: "text-purple-500" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="p-4 text-center">
                <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Owner */}
      {owner && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{owner.name ?? "—"} <span className="text-gray-400 font-normal">(#{owner.id})</span></p>
                <p className="text-xs text-gray-400">{owner.email} {owner.phone ? `· ${owner.phone}` : ""}</p>
              </div>
            </div>
            <Link href="/dashboard/users" className="text-xs text-orange-500 hover:underline flex items-center gap-1">
              ดูผู้ใช้ <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Menu Management */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">เมนูอาหาร <span className="text-gray-400 text-sm font-normal">({menu.length} รายการ)</span></h2>
          <button
            onClick={() => setShowItemForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่มเมนู
          </button>
        </div>

        {/* Add Item Form */}
        {showItemForm && (
          <div className="px-6 py-4 bg-orange-50 border-b border-orange-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">เพิ่มเมนูใหม่</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {[
                { label: "ชื่อเมนู *", key: "name" },
                { label: "หมวดหมู่เมนู *", key: "category" },
                { label: "ราคา (฿) *", key: "price", type: "number" },
                { label: "คำอธิบาย", key: "description" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input
                    type={type ?? "text"}
                    value={String((itemForm as any)[key] ?? "")}
                    onChange={(e) => setItemForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">อัปโหลดรูป</label>
                <input type="file" accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItemUpload("imageUrl", f, setItemForm as any, setItemUploading); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-orange-50 file:text-orange-600 file:font-medium" />
                {itemUploading && <p className="text-xs text-orange-500 mt-1">⏳ กำลังอัปโหลด...</p>}
                {itemForm.imageUrl && (
                  <Image
                    src={itemForm.imageUrl}
                    alt="ตัวอย่างรูปเมนูใหม่"
                    width={112}
                    height={56}
                    unoptimized
                    className="h-14 mt-2 rounded-lg object-cover border border-gray-100"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input type="checkbox" id="newIsPopular" checked={itemForm.isPopular}
                  onChange={(e) => setItemForm((f) => ({ ...f, isPopular: e.target.checked }))}
                  className="w-4 h-4 accent-orange-500" />
                <label htmlFor="newIsPopular" className="text-sm text-gray-700">ดีลแฟลช (ยอดนิยม)</label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddItem} disabled={createItem.isPending || itemUploading || !itemForm.name.trim() || !itemForm.category.trim() || !itemForm.price}
                className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-orange-600 transition-colors">
                {createItem.isPending ? "กำลังเพิ่ม..." : "เพิ่มเมนู"}
              </button>
              <button onClick={() => { setShowItemForm(false); setItemForm(EMPTY_ITEM); }} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* Menu List */}
        {menu.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">ยังไม่มีเมนู</div>
        ) : (
          <div>
            {menuCategories.map((cat) => (
              <div key={cat}>
                <div className="px-6 py-2 bg-gray-50 border-b border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat}</span>
                </div>
                {menu.filter((m) => m.category === cat).map((item) => (
                  <div key={item.id} className="border-b border-gray-50 last:border-0">
                    {editingItemId === item.id ? (
                      <div className="px-6 py-4 bg-blue-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          {[
                            { label: "ชื่อเมนู", key: "name" },
                            { label: "หมวดหมู่", key: "category" },
                            { label: "ราคา (฿)", key: "price", type: "number" },
                            { label: "คำอธิบาย", key: "description" },
                          ].map(({ label, key, type }) => (
                            <div key={key}>
                              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                              <input
                                type={type ?? "text"}
                                value={String((editItemForm as any)[key] ?? "")}
                                onChange={(e) => setEditItemForm((f) => ({ ...f, [key]: e.target.value }))}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                              />
                            </div>
                          ))}
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">อัปโหลดรูป</label>
                            <input type="file" accept="image/*"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleItemUpload("imageUrl", f, setEditItemForm as any, setEditItemUploading); }}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-600 file:font-medium" />
                            {editItemUploading && <p className="text-xs text-blue-500 mt-1">⏳ กำลังอัปโหลด...</p>}
                            {editItemForm.imageUrl && (
                              <Image
                                src={editItemForm.imageUrl}
                                alt="ตัวอย่างรูปเมนูที่แก้ไข"
                                width={112}
                                height={56}
                                unoptimized
                                className="h-14 mt-2 rounded-lg object-cover border border-gray-100"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 pt-4">
                            <input type="checkbox" checked={editItemForm.isPopular}
                              onChange={(e) => setEditItemForm((f) => ({ ...f, isPopular: e.target.checked }))}
                              className="w-4 h-4 accent-orange-500" />
                            <span className="text-sm text-gray-700">ดีลแฟลช (ยอดนิยม)</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveItem} disabled={updateItem.isPending || editItemUploading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50">
                            <Check className="w-3.5 h-3.5" />บันทึก
                          </button>
                          <button onClick={() => setEditingItemId(null)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg">
                            <X className="w-3.5 h-3.5" />ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            width={48}
                            height={48}
                            unoptimized
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          {item.description && <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-bold text-orange-500">฿{item.price}</p>
                            {item.isPopular && <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">แฟลช</span>}
                          </div>
                          <button onClick={() => startEditItem(item)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => { if (confirm(`ลบเมนู "${item.name}"?`)) deleteItem.mutate({ id: item.id }); }}
                            disabled={deleteItem.isPending}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
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
