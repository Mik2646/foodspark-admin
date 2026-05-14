"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { trpc, getToken } from "@/lib/trpc";
import { ArrowLeft, Store, Star, Clock, Truck, ChevronRight, Package, Pencil, Plus, Trash2, Check, X, ImageIcon, Zap, ShoppingBasket, CalendarClock, Footprints } from "lucide-react";
import ShareRestaurantButton from "@/components/ShareRestaurantButton";
import OpeningHoursEditor from "@/components/OpeningHoursEditor";
import MenuItemForm, {
  EMPTY_MENU_ITEM_FORM,
  cleanOptionsForSubmit,
  type MenuItemFormData,
} from "@/components/MenuItemForm";
import { cloneOptions, type OptionGroup } from "@/components/OptionBuilder";
import {
  buildMenuDescription,
  parseMenuMeta,
} from "@/lib/menuMeta";
import { uploadToR2 } from "@/lib/upload";

// Old plain-shape kept here only because typecheck on `handleItemUpload`
// uses the shape — internally the form state is now MenuItemFormData
// (full feature parity with the merchant app: menu meta + options).
const EMPTY_ITEM: MenuItemFormData = EMPTY_MENU_ITEM_FORM;

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
  // Phase 2 — market assignment. List of markets is admin-only, but it's
  // cheap (one row per market). The assignment mutation is separate from
  // updateRestaurant so we don't risk regressing the merchant edit flow.
  const { data: marketsList = [] } = trpc.admin.listMarkets.useQuery();
  const setRestaurantMarket = trpc.admin.setRestaurantMarket.useMutation({
    onSuccess: () => utils.admin.getRestaurantDetail.invalidate({ id }),
    onError: (e) => alert("อัปเดตตลาดไม่สำเร็จ: " + e.message),
  });
  // Phase 3 — preorder lane configuration. Separate mutation from
  // updateRestaurant so the toggle / time fields don't risk pulling
  // unrelated fields along for the ride.
  const setRestaurantPreorder = trpc.admin.setRestaurantPreorder.useMutation({
    onSuccess: () => utils.admin.getRestaurantDetail.invalidate({ id }),
    onError: (e) => alert("ตั้งค่าพรีออเดอร์ไม่สำเร็จ: " + e.message),
  });
  // Phase 4 — pickup ("รับที่ร้าน") configuration. Separate mutation
  // so the toggle / ready-minutes don't touch unrelated fields.
  const setRestaurantPickup = trpc.admin.setRestaurantPickup.useMutation({
    onSuccess: () => utils.admin.getRestaurantDetail.invalidate({ id }),
    onError: (e) => alert("ตั้งค่ารับที่ร้านไม่สำเร็จ: " + e.message),
  });

  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState<Record<string, string | boolean>>({});
  // Weekly schedule is structured data (array of 7 entries) that doesn't
  // fit cleanly into the infoForm string/boolean record, so it lives in
  // its own state. Synced with `r.openingHours` whenever the edit form
  // opens via startEditInfo.
  const [openingHours, setOpeningHours] = useState<Array<{
    day: number; open: string; close: string; enabled: boolean;
  }>>([]);
  const [uploading, setUploading] = useState(false);

  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState<MenuItemFormData>({ ...EMPTY_ITEM });
  const [itemUploading, setItemUploading] = useState(false);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemForm, setEditItemForm] = useState<MenuItemFormData>({ ...EMPTY_ITEM });
  const [editItemUploading, setEditItemUploading] = useState(false);

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;
  if (!data) return <div className="text-red-500 text-sm">ไม่พบร้านอาหาร</div>;

  const { restaurant: r, menu, owner } = data;
  const menuCategories = [...new Set<string>(menu.map((m) => String(m.category ?? "")))];

  const startEditInfo = () => {
    setInfoForm({
      name: r.name, category: r.category, deliveryTime: r.deliveryTime,
      deliveryFee: String(r.deliveryFee), minOrder: String(r.minOrder),
      imageUrl: r.imageUrl, coverUrl: r.coverUrl,
      isPromo: r.isPromo, promoText: r.promoText ?? "",
      address: r.address ?? "",
      // Self-delivery controls — read from row, fall back to safe defaults.
      hasOwnDelivery: Boolean((r as { hasOwnDelivery?: boolean | null }).hasOwnDelivery),
      selfDeliveryMinOrder: String((r as { selfDeliveryMinOrder?: number | null }).selfDeliveryMinOrder ?? 0),
      ownDeliveryRadiusKm: String((r as { ownDeliveryRadiusKm?: number | null }).ownDeliveryRadiusKm ?? 5),
      acceptsPlatformRider: (r as { acceptsPlatformRider?: boolean | null }).acceptsPlatformRider !== false,
    });
    // Hydrate the weekly schedule from the row. Defensive cast — the
    // jsonb column can hold garbage from older rows; the editor's
    // normalizeSchedule() will sanitise.
    const restHours = (r as { openingHours?: unknown }).openingHours;
    setOpeningHours(Array.isArray(restHours)
      ? (restHours as Array<{ day: number; open: string; close: string; enabled: boolean }>)
      : []);
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
      // Self-delivery
      hasOwnDelivery: Boolean(infoForm.hasOwnDelivery),
      selfDeliveryMinOrder: Number(infoForm.selfDeliveryMinOrder) || 0,
      ownDeliveryRadiusKm: Math.min(15, Math.max(0.5, Number(infoForm.ownDeliveryRadiusKm) || 5)),
      acceptsPlatformRider: Boolean(infoForm.acceptsPlatformRider),
      // Weekly schedule — admin override of the merchant's setting.
      openingHours: openingHours.length > 0 ? openingHours : undefined,
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
    // Pack the menu-meta marker (sold-out / stock / schedule / prep time)
    // into the description string so the LIFF can parse it back out on
    // render — same protocol the merchant app uses.
    const packedDescription = buildMenuDescription(itemForm.description.trim(), itemForm.meta);
    const cleanedOptions = cleanOptionsForSubmit(itemForm.options);
    createItem.mutate({
      restaurantId: id,
      name: itemForm.name.trim(),
      description: packedDescription,
      price: Number(itemForm.price),
      imageUrl: itemForm.imageUrl.trim(),
      category: itemForm.category.trim(),
      isPopular: itemForm.isPopular,
      options: cleanedOptions.length > 0 ? cleanedOptions : undefined,
    });
  };

  const startEditItem = (item: typeof menu[0]) => {
    setEditingItemId(item.id);
    // Unpack the menu-meta marker out of the stored description so the
    // form populates with the live meta state (toggles + schedule
    // window + stock count) — without this the meta would only round-
    // trip if the admin re-typed every field.
    const { plainDescription, meta } = parseMenuMeta(item.description ?? "");
    const opts = (item as unknown as { options?: OptionGroup[] | null }).options;
    setEditItemForm({
      name: item.name,
      description: plainDescription,
      price: String(item.price),
      imageUrl: item.imageUrl,
      category: item.category,
      isPopular: item.isPopular,
      meta,
      options: cloneOptions(opts ?? null),
    });
  };

  const handleSaveItem = () => {
    if (!editingItemId) return;
    const packedDescription = buildMenuDescription(editItemForm.description.trim(), editItemForm.meta);
    const cleanedOptions = cleanOptionsForSubmit(editItemForm.options);
    updateItem.mutate({
      id: editingItemId,
      name: editItemForm.name.trim(),
      description: packedDescription,
      price: Number(editItemForm.price),
      imageUrl: editItemForm.imageUrl.trim(),
      category: editItemForm.category.trim(),
      isPopular: editItemForm.isPopular,
      options: cleanedOptions,
    });
  };

  const handleItemUpload = async (
    field: "imageUrl",
    file: File,
    setForm: React.Dispatch<React.SetStateAction<MenuItemFormData>>,
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
                {(() => {
                  // ค่าส่ง (deliveryFee) only applies when the merchant runs
                  // their OWN delivery (hasOwnDelivery=true). Otherwise the
                  // platform calculates the fee from distance using the system
                  // policy (admin → ค่าจัดส่ง) and this field becomes confusing
                  // — admins were setting it to 0 and seeing "฿0" on the LIFF.
                  const fields: Array<{ label: string; key: string; type?: string }> = [
                    { label: "ชื่อร้าน", key: "name" },
                    { label: "หมวดหมู่", key: "category" },
                    { label: "เวลาส่ง (เช่น 30-45)", key: "deliveryTime" },
                  ];
                  if (r.hasOwnDelivery) {
                    fields.push({ label: "ค่าส่ง (฿)", key: "deliveryFee", type: "number" });
                  }
                  fields.push(
                    { label: "สั่งขั้นต่ำ (฿)", key: "minOrder", type: "number" },
                    { label: "ที่อยู่", key: "address" },
                    { label: "ข้อความโปรโมชัน", key: "promoText" },
                  );
                  return fields.map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                      <input
                        type={type ?? "text"}
                        value={String(infoForm[key] ?? "")}
                        onChange={(e) => setInfoForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                  ));
                })()}
                {!Boolean(infoForm.hasOwnDelivery) && (
                  <div className="md:col-span-2 -mt-1 text-[11px] text-gray-500 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                    💡 ค่าส่งของร้านนี้คำนวณจากระยะทางตามนโยบายระบบโดยอัตโนมัติ (ตั้งค่าได้ที่ <span className="font-semibold">ตั้งค่าระบบ → ค่าจัดส่ง</span>) เปิด <span className="font-semibold">"ร้านส่งเอง"</span> ด้านล่างถ้าต้องการให้ร้านส่งเอง
                  </div>
                )}
                <div className="flex items-center gap-2 pt-4">
                  <input type="checkbox" id="isPromo" checked={Boolean(infoForm.isPromo)}
                    onChange={(e) => setInfoForm((f) => ({ ...f, isPromo: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500" />
                  <label htmlFor="isPromo" className="text-sm text-gray-700">แสดง badge โปรโมชัน</label>
                </div>
              </div>

              {/* Weekly schedule — admin can override merchant's hours. */}
              <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />

              {/* Self-delivery section — controls who delivers each order. */}
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-orange-700">🏍 ร้านส่งเอง</p>
                    <p className="text-[11px] text-gray-600">
                      สั่งครบขั้นต่ำในรัศมี → ร้านส่งฟรี (ไม่มีค่าส่งให้ลูกค้า)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="hasOwnDelivery"
                    checked={Boolean(infoForm.hasOwnDelivery)}
                    onChange={(e) => setInfoForm((f) => ({ ...f, hasOwnDelivery: e.target.checked }))}
                    className="w-5 h-5 accent-orange-500"
                  />
                </div>
                {Boolean(infoForm.hasOwnDelivery) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-orange-200">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">🛒 ยอดขั้นต่ำเพื่อส่งฟรี (฿)</label>
                      <input
                        type="number"
                        value={String(infoForm.selfDeliveryMinOrder ?? "0")}
                        onChange={(e) => setInfoForm((f) => ({ ...f, selfDeliveryMinOrder: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">📍 รัศมีจัดส่ง (กม., 0.5-15)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={String(infoForm.ownDeliveryRadiusKm ?? "5")}
                        onChange={(e) => setInfoForm((f) => ({ ...f, ownDeliveryRadiusKm: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        placeholder="5"
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-orange-200">
                  <div>
                    <p className="text-sm font-semibold text-orange-700 flex items-center gap-1.5">
                      <Zap size={14} />รับไรเดอร์ระบบด้วย
                    </p>
                    <p className="text-[11px] text-gray-600">ปิดถ้าจะส่งเองเท่านั้น</p>
                  </div>
                  <input
                    type="checkbox"
                    id="acceptsPlatformRider"
                    checked={Boolean(infoForm.acceptsPlatformRider)}
                    onChange={(e) => setInfoForm((f) => ({ ...f, acceptsPlatformRider: e.target.checked }))}
                    className="w-5 h-5 accent-orange-500"
                  />
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ShareRestaurantButton
                      restaurantId={r.id}
                      restaurantName={r.name}
                      category={r.category}
                    />
                    <button onClick={startEditInfo} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 flex-shrink-0 transition-colors">
                      <Pencil className="w-3.5 h-3.5" /> แก้ไข
                    </button>
                  </div>
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
              {
                icon: Truck,
                label: "ค่าส่ง",
                // Show actual fee for own-delivery shops; otherwise label as
                // "ตามระยะทาง" so the admin understands the platform calculates
                // it per-order, not a fixed ฿0.
                value: r.hasOwnDelivery ? `฿${r.deliveryFee}` : "ตามระยะทาง",
                color: "text-orange-500",
              },
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

      {/* Market assignment — Phase 2 */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBasket className="w-5 h-5 text-emerald-500" />
          <h2 className="text-base font-bold text-gray-900">ตลาดนัด</h2>
          {(r as { isMarketVendor?: boolean | null }).isMarketVendor ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
              พ่อค้าตลาดนัด
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">
              ร้านประจำ
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-3">
          กำหนดให้ร้านนี้ขายในตลาดนัด — เมื่อเลือกตลาด ร้านจะปรากฏใน /liff/market ตามวันที่ตลาดเปิด
        </p>
        <div className="flex items-center gap-2">
          <select
            value={(r as { marketId?: string | null }).marketId ?? ""}
            onChange={(e) => {
              const next = e.target.value || null;
              setRestaurantMarket.mutate({
                restaurantId: id,
                marketId: next,
                isMarketVendor: next != null,
              });
            }}
            disabled={setRestaurantMarket.isPending}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
          >
            <option value="">— ไม่อยู่ในตลาดนัด —</option>
            {marketsList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.village ? ` · ${m.village}` : ""}
              </option>
            ))}
          </select>
          {marketsList.length === 0 && (
            <Link
              href="/dashboard/markets"
              className="text-xs text-emerald-600 hover:underline whitespace-nowrap"
            >
              สร้างตลาดก่อน →
            </Link>
          )}
        </div>
        {setRestaurantMarket.isPending && (
          <p className="text-xs text-emerald-500 mt-2">⏳ กำลังบันทึก...</p>
        )}
      </div>

      {/* Preorder lane — Phase 3 */}
      <PreorderPanel
        restaurant={r}
        onSave={(payload) =>
          setRestaurantPreorder.mutate({ restaurantId: id, ...payload })
        }
        saving={setRestaurantPreorder.isPending}
      />

      {/* Pickup — Phase 4 */}
      <PickupPanel
        restaurant={r}
        onSave={(payload) =>
          setRestaurantPickup.mutate({ restaurantId: id, ...payload })
        }
        saving={setRestaurantPickup.isPending}
      />

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

        {/* Add Item Form — full feature parity with merchant menu manager:
            name/category/price/image + sold-out/stock/schedule/prep meta +
            customisation groups (OptionBuilder). */}
        {showItemForm && (
          <div className="px-6 py-4 bg-orange-50 border-b border-orange-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">เพิ่มเมนูใหม่</p>
            <MenuItemForm
              form={itemForm}
              setForm={setItemForm}
              uploading={itemUploading}
              onUpload={(file) => handleItemUpload("imageUrl", file, setItemForm, setItemUploading)}
            />
            <div className="flex gap-2 mt-4">
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
                        <MenuItemForm
                          form={editItemForm}
                          setForm={setEditItemForm}
                          uploading={editItemUploading}
                          onUpload={(file) => handleItemUpload("imageUrl", file, setEditItemForm, setEditItemUploading)}
                        />
                        <div className="flex gap-2 mt-4">
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
                          {item.description && (() => {
                            // Hide the embedded menu-meta marker so the
                            // raw "<!-- foodspark-menu-meta:{...} -->"
                            // doesn't bleed into the admin's item list.
                            const { plainDescription } = parseMenuMeta(item.description);
                            return plainDescription ? (
                              <p className="text-xs text-gray-400 truncate mt-0.5">{plainDescription}</p>
                            ) : null;
                          })()}
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

/**
 * PreorderPanel — Phase 3 admin UI for the per-restaurant preorder
 * lane. Toggle flips `acceptsPreorder`; when on, the time fields
 * become editable. Saved via admin.setRestaurantPreorder so the
 * regular updateRestaurant path stays simple.
 */
function PreorderPanel({
  restaurant,
  onSave,
  saving,
}: {
  restaurant: Record<string, unknown>;
  onSave: (payload: {
    acceptsPreorder: boolean;
    preorderCutoffTime?: string | null;
    preorderDeliveryStart?: string | null;
    preorderDeliveryEnd?: string | null;
    preorderLeadDays?: number;
  }) => void;
  saving: boolean;
}) {
  const r = restaurant as {
    acceptsPreorder?: boolean | null;
    preorderCutoffTime?: string | null;
    preorderDeliveryStart?: string | null;
    preorderDeliveryEnd?: string | null;
    preorderLeadDays?: number | null;
  };
  const [enabled, setEnabled] = useState<boolean>(Boolean(r.acceptsPreorder));
  const [cutoff, setCutoff] = useState<string>(r.preorderCutoffTime ?? "20:00");
  const [start, setStart] = useState<string>(r.preorderDeliveryStart ?? "16:00");
  const [end, setEnd] = useState<string>(r.preorderDeliveryEnd ?? "19:00");
  const [leadDays, setLeadDays] = useState<number>(r.preorderLeadDays ?? 1);

  // Sync state when the server pushes new data (e.g. after save).
  useEffect(() => {
    setEnabled(Boolean(r.acceptsPreorder));
    if (r.preorderCutoffTime) setCutoff(r.preorderCutoffTime);
    if (r.preorderDeliveryStart) setStart(r.preorderDeliveryStart);
    if (r.preorderDeliveryEnd) setEnd(r.preorderDeliveryEnd);
    if (r.preorderLeadDays) setLeadDays(r.preorderLeadDays);
  }, [
    r.acceptsPreorder,
    r.preorderCutoffTime,
    r.preorderDeliveryStart,
    r.preorderDeliveryEnd,
    r.preorderLeadDays,
  ]);

  const handleSave = () => {
    onSave({
      acceptsPreorder: enabled,
      preorderCutoffTime: enabled ? cutoff : null,
      preorderDeliveryStart: enabled ? start : null,
      preorderDeliveryEnd: enabled ? end : null,
      preorderLeadDays: enabled ? leadDays : 1,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-bold text-gray-900">พรีออเดอร์</h2>
          {enabled ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
              เปิดรับ
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">
              ปิด
            </span>
          )}
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:bg-amber-500 transition-colors relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
        </label>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        เปิดให้ลูกค้าสั่งล่วงหน้า — ร้านนอกรัศมีปกติจะปรากฏในหน้า "พรีออเดอร์"
        ของลูกค้า ออเดอร์รวมเป็นรอบส่งวันละครั้งตามเวลาที่กำหนด
      </p>
      {enabled && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              ตัดออเดอร์
            </label>
            <input
              type="time"
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              สั่งหลังเวลานี้ → คิวรอบถัดไป
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              ส่งตั้งแต่
            </label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              ส่งถึง
            </label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              ส่งล่วงหน้า (วัน)
            </label>
            <input
              type="number"
              min={1}
              max={7}
              value={leadDays}
              onChange={(e) => setLeadDays(Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <p className="text-[10px] text-gray-400 mt-1">1 = พรุ่งนี้</p>
          </div>
        </div>
      )}
      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </div>
  );
}

/**
 * PickupPanel — Phase 4 admin UI for the "รับที่ร้าน" mode. Toggle
 * flips acceptsPickup; when on, an ETA minutes field becomes editable.
 */
function PickupPanel({
  restaurant,
  onSave,
  saving,
}: {
  restaurant: Record<string, unknown>;
  onSave: (payload: {
    acceptsPickup: boolean;
    pickupReadyMinutes?: number | null;
  }) => void;
  saving: boolean;
}) {
  const r = restaurant as {
    acceptsPickup?: boolean | null;
    pickupReadyMinutes?: number | null;
  };
  const [enabled, setEnabled] = useState<boolean>(Boolean(r.acceptsPickup));
  const [readyMin, setReadyMin] = useState<number>(r.pickupReadyMinutes ?? 20);

  useEffect(() => {
    setEnabled(Boolean(r.acceptsPickup));
    if (r.pickupReadyMinutes) setReadyMin(r.pickupReadyMinutes);
  }, [r.acceptsPickup, r.pickupReadyMinutes]);

  const handleSave = () => {
    onSave({
      acceptsPickup: enabled,
      pickupReadyMinutes: enabled ? readyMin : null,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Footprints className="w-5 h-5 text-emerald-500" />
          <h2 className="text-base font-bold text-gray-900">รับที่ร้าน</h2>
          {enabled ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
              เปิดรับ
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">
              ปิด
            </span>
          )}
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:bg-emerald-500 transition-colors relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
        </label>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        เปิดให้ลูกค้ามารับที่ร้านเอง — ฟรีค่าส่ง ลูกค้าได้โค้ด 6 หลัก
        แสดงให้แม่ค้าตรวจตอนรับของ
      </p>
      {enabled && (
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              เวลาทำเฉลี่ย (นาที)
            </label>
            <input
              type="number"
              min={5}
              max={120}
              value={readyMin}
              onChange={(e) => setReadyMin(Math.max(5, Math.min(120, Number(e.target.value) || 20)))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              ลูกค้าเห็น "พร้อมรับใน ~{readyMin} นาที"
            </p>
          </div>
        </div>
      )}
      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </div>
  );
}
