"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { trpc, getToken } from "@/lib/trpc";
import { ArrowLeft, Store, Star, Clock, Truck, ChevronRight, Package, Pencil, Plus, Trash2, Check, X, ImageIcon, Zap, ShoppingBasket, CalendarClock, Footprints, Pause, Play, Loader2, Save } from "lucide-react";
import ShareRestaurantButton from "@/components/ShareRestaurantButton";
import OpeningHoursEditor from "@/components/OpeningHoursEditor";
import RestaurantLocationCard from "@/components/RestaurantLocationCard";
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
  // Phase 5 — unified restaurant type. Replaces the previous 3
  // independent panels (market / preorder / pickup) with a single
  // atomic mutation. Type is mutually exclusive: regular / market /
  // preorder. Pickup is independent (any type can also accept walk-in).
  const { data: marketsList = [] } = trpc.admin.listMarkets.useQuery();
  const setRestaurantType = trpc.admin.setRestaurantType.useMutation({
    onSuccess: () => utils.admin.getRestaurantDetail.invalidate({ id }),
    onError: (e) => alert("ตั้งค่าประเภทร้านไม่สำเร็จ: " + e.message),
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

      {/* Map pin — admin can drag/click to fix wrong pins set during
          merchant setup. Bypasses merchant-side "shop already open"
          guard so ops can correct location post-go-live. */}
      <RestaurantLocationCard
        lat={(r as { lat?: number | null }).lat ?? null}
        lng={(r as { lng?: number | null }).lng ?? null}
        address={r.address}
        saving={updateRestaurant.isPending}
        onSave={(coords) =>
          updateRestaurant.mutate({ id, lat: coords.lat, lng: coords.lng })
        }
      />

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

      {/* Phase 5 — Unified restaurant type picker.
          Replaces the previous 3 separate panels (market / preorder /
          pickup) with a single radio group + pickup checkbox so an
          admin can't accidentally put a shop in two buckets at once. */}
      <RestaurantTypePanel
        restaurant={r}
        markets={marketsList}
        onSave={(payload) =>
          setRestaurantType.mutate({ restaurantId: id, ...payload })
        }
        saving={setRestaurantType.isPending}
      />

      {/* Phase 5.5/5.6 — Admin-side pause controls. Same effect as the
          merchant-side controls under /merchant/restaurant: manual
          one-shot pause + recurring scheduled-pause windows. */}
      <RestaurantPausePanel
        restaurantId={id}
        pausedUntil={
          r.pausedUntil
            ? typeof r.pausedUntil === "string"
              ? r.pausedUntil
              : new Date(r.pausedUntil as unknown as string).toISOString()
            : null
        }
        pauseReason={(r as { pauseReason?: string | null }).pauseReason ?? null}
        scheduledPauses={
          ((r as { scheduledPauses?: ScheduledPauseRow[] | null }).scheduledPauses) ?? []
        }
        onChanged={() => utils.admin.getRestaurantDetail.invalidate({ id })}
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
 * RestaurantTypePanel — Phase 5 unified picker.
 *
 * Replaces the prior 3 separate panels (market / preorder / pickup)
 * with one radio group + pickup checkbox. Type is mutually exclusive
 * so a shop can't accidentally appear in both "ตลาดนัด" and
 * "พรีออเดอร์" lists at the same time. Pickup is independent because
 * walking to the shop works regardless of the primary mode.
 *
 * Submits to admin.setRestaurantType which atomically reconciles
 * marketId / isMarketVendor / acceptsPreorder / preorder* fields so
 * stale data from a previous bucket gets cleared on switch.
 */
function RestaurantTypePanel({
  restaurant,
  markets,
  onSave,
  saving,
}: {
  restaurant: Record<string, unknown>;
  markets: Array<{ id: string; name: string; village?: string | null }>;
  onSave: (payload: {
    type: "regular" | "market" | "preorder" | "concierge";
    marketId?: string | null;
    preorderCutoffTime?: string | null;
    preorderDeliveryStart?: string | null;
    preorderDeliveryEnd?: string | null;
    preorderLeadDays?: number;
    pickupEnabled: boolean;
    pickupReadyMinutes?: number | null;
  }) => void;
  saving: boolean;
}) {
  const r = restaurant as {
    marketId?: string | null;
    isMarketVendor?: boolean | null;
    acceptsPreorder?: boolean | null;
    preorderCutoffTime?: string | null;
    preorderDeliveryStart?: string | null;
    preorderDeliveryEnd?: string | null;
    preorderLeadDays?: number | null;
    acceptsPickup?: boolean | null;
    pickupReadyMinutes?: number | null;
    isConcierge?: boolean | null;
  };

  // Derive the current type from the row's flags. Concierge wins — it's
  // mutually exclusive and clears the others server-side.
  const initialType: "regular" | "market" | "preorder" | "concierge" = r.isConcierge
    ? "concierge"
    : r.acceptsPreorder
      ? "preorder"
      : r.marketId
        ? "market"
        : "regular";

  const [type, setType] = useState<"regular" | "market" | "preorder" | "concierge">(initialType);
  const [marketId, setMarketId] = useState<string>(r.marketId ?? "");
  const [cutoff, setCutoff] = useState<string>(r.preorderCutoffTime ?? "20:00");
  const [delStart, setDelStart] = useState<string>(r.preorderDeliveryStart ?? "16:00");
  const [delEnd, setDelEnd] = useState<string>(r.preorderDeliveryEnd ?? "19:00");
  const [leadDays, setLeadDays] = useState<number>(r.preorderLeadDays ?? 1);
  const [pickupEnabled, setPickupEnabled] = useState<boolean>(Boolean(r.acceptsPickup));
  const [pickupMin, setPickupMin] = useState<number>(r.pickupReadyMinutes ?? 20);

  // Re-sync when the server pushes new data (after save).
  useEffect(() => {
    setType(
      r.isConcierge
        ? "concierge"
        : r.acceptsPreorder ? "preorder" : r.marketId ? "market" : "regular",
    );
    setMarketId(r.marketId ?? "");
    if (r.preorderCutoffTime) setCutoff(r.preorderCutoffTime);
    if (r.preorderDeliveryStart) setDelStart(r.preorderDeliveryStart);
    if (r.preorderDeliveryEnd) setDelEnd(r.preorderDeliveryEnd);
    if (r.preorderLeadDays) setLeadDays(r.preorderLeadDays);
    setPickupEnabled(Boolean(r.acceptsPickup));
    if (r.pickupReadyMinutes) setPickupMin(r.pickupReadyMinutes);
  }, [
    r.isConcierge,
    r.acceptsPreorder,
    r.marketId,
    r.preorderCutoffTime,
    r.preorderDeliveryStart,
    r.preorderDeliveryEnd,
    r.preorderLeadDays,
    r.acceptsPickup,
    r.pickupReadyMinutes,
  ]);

  const canSave = type !== "market" || Boolean(marketId);

  const handleSave = () => {
    onSave({
      type,
      marketId: type === "market" ? marketId : null,
      preorderCutoffTime: type === "preorder" ? cutoff : null,
      preorderDeliveryStart: type === "preorder" ? delStart : null,
      preorderDeliveryEnd: type === "preorder" ? delEnd : null,
      preorderLeadDays: type === "preorder" ? leadDays : 1,
      pickupEnabled,
      pickupReadyMinutes: pickupEnabled ? pickupMin : null,
    });
  };

  const TYPES = [
    {
      key: "regular" as const,
      label: "ร้านปกติ",
      sub: "เดลิเวอรีในรัศมีตามปกติ",
      icon: <Store className="w-5 h-5 text-orange-500" />,
      accent: "orange",
    },
    {
      key: "market" as const,
      label: "ร้านตลาดนัด",
      sub: "ขายในตลาดนัดประจำสัปดาห์",
      icon: <ShoppingBasket className="w-5 h-5 text-emerald-500" />,
      accent: "emerald",
    },
    {
      key: "preorder" as const,
      label: "ร้านพรีออเดอร์",
      sub: "สั่งวันนี้ส่งพรุ่งนี้ — รวมรอบส่งวันละครั้ง",
      icon: <CalendarClock className="w-5 h-5 text-amber-500" />,
      accent: "amber",
    },
    {
      key: "concierge" as const,
      label: "ร้านดัง (รับหิ้ว)",
      sub: "ร้านนอกพื้นที่ ไม่มีเมนู — ลูกค้าพิมพ์สั่ง ไรเดอร์ไปซื้อให้",
      icon: <Star className="w-5 h-5 text-violet-500" />,
      accent: "violet",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-bold text-gray-900">ประเภทร้าน</h2>
        <span className="text-xs text-gray-400">เลือก 1 ประเภท</span>
      </div>

      {/* Radio cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {TYPES.map((opt) => {
          const selected = type === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setType(opt.key)}
              className={`text-left rounded-xl border-2 px-3 py-3 transition ${
                selected
                  ? opt.accent === "orange"
                    ? "border-orange-400 bg-orange-50"
                    : opt.accent === "emerald"
                      ? "border-emerald-400 bg-emerald-50"
                      : opt.accent === "violet"
                        ? "border-violet-400 bg-violet-50"
                        : "border-amber-400 bg-amber-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{opt.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{opt.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                    {opt.sub}
                  </p>
                </div>
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selected
                      ? opt.accent === "orange"
                        ? "border-orange-500"
                        : opt.accent === "emerald"
                          ? "border-emerald-500"
                          : opt.accent === "violet"
                            ? "border-violet-500"
                            : "border-amber-500"
                      : "border-gray-300"
                  }`}
                >
                  {selected && (
                    <div
                      className={`w-2 h-2 rounded-full ${
                        opt.accent === "orange"
                          ? "bg-orange-500"
                          : opt.accent === "emerald"
                            ? "bg-emerald-500"
                            : opt.accent === "violet"
                              ? "bg-violet-500"
                              : "bg-amber-500"
                      }`}
                    />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Conditional fields per type */}
      {type === "market" && (
        <div className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3 mb-4">
          <label className="block text-xs font-semibold text-emerald-800 mb-1">
            เลือกตลาดที่ร้านอยู่ *
          </label>
          <div className="flex items-center gap-2">
            <select
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              className="flex-1 border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
            >
              <option value="">— เลือกตลาด —</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.village ? ` · ${m.village}` : ""}
                </option>
              ))}
            </select>
            {markets.length === 0 && (
              <Link
                href="/dashboard/markets"
                className="text-xs text-emerald-700 hover:underline whitespace-nowrap"
              >
                สร้างตลาดก่อน →
              </Link>
            )}
          </div>
        </div>
      )}

      {type === "preorder" && (
        <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-3 mb-4 space-y-3">
          <p className="text-xs text-amber-800 leading-relaxed">
            ลูกค้าสั่งวันนี้ ระบบรวมรอบส่งวันละครั้งตามเวลาที่กำหนด
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-amber-800 mb-1">
                ตัดออเดอร์
              </label>
              <input
                type="time"
                value={cutoff}
                onChange={(e) => setCutoff(e.target.value)}
                className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-amber-800 mb-1">
                ส่งตั้งแต่
              </label>
              <input
                type="time"
                value={delStart}
                onChange={(e) => setDelStart(e.target.value)}
                className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-amber-800 mb-1">
                ส่งถึง
              </label>
              <input
                type="time"
                value={delEnd}
                onChange={(e) => setDelEnd(e.target.value)}
                className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-amber-800 mb-1">
                ล่วงหน้า (วัน)
              </label>
              <input
                type="number"
                min={1}
                max={7}
                value={leadDays}
                onChange={(e) =>
                  setLeadDays(Math.max(1, Math.min(7, Number(e.target.value) || 1)))
                }
                className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
          </div>
        </div>
      )}

      {type === "concierge" && (
        <div className="rounded-xl bg-violet-50/60 border border-violet-100 p-3 mb-4 space-y-1.5">
          <p className="text-xs font-semibold text-violet-800">ร้านดัง / รับหิ้ว</p>
          <p className="text-[11px] text-violet-700 leading-relaxed">
            ร้านนี้ไม่มีเมนูในระบบ — ลูกค้าพิมพ์รายการที่อยากสั่งเอง ไรเดอร์ขับไปซื้อในเมืองแล้วนำมาส่ง
            ค่าบริการคิดตามระยะทาง (ตั้งเรตที่หน้า ตั้งค่า → ค่าบริการรับหิ้ว) ส่วนค่าอาหารลูกค้าจ่ายสดตามบิลตอนรับของ
          </p>
          <p className="text-[11px] text-violet-600">
            อย่าลืมตั้งพิกัด (lat/lng) ของร้านในเมืองให้ถูก เพื่อคำนวณระยะ
          </p>
        </div>
      )}

      {/* Pickup — independent of type. Stacks on top so any shop can
          accept walk-in pickups regardless of its primary mode.
          (Hidden for concierge — a far-away city shop has no walk-in.) */}
      {type !== "concierge" && (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-3">
        <label className="inline-flex items-center cursor-pointer mt-0.5">
          <input
            type="checkbox"
            checked={pickupEnabled}
            onChange={(e) => setPickupEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:bg-emerald-500 transition-colors relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
        </label>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">รับที่ร้านด้วย</p>
          <p className="text-[11px] text-gray-500 leading-tight">
            ลูกค้ามารับเองที่ร้าน — ฟรีค่าส่ง ได้โค้ด 6 หลักให้โชว์ตอนรับ
          </p>
          {pickupEnabled && (
            <div className="mt-2 flex items-center gap-2">
              <label className="text-[11px] text-gray-600">เวลาทำเฉลี่ย:</label>
              <input
                type="number"
                min={5}
                max={120}
                value={pickupMin}
                onChange={(e) =>
                  setPickupMin(
                    Math.max(5, Math.min(120, Number(e.target.value) || 20)),
                  )
                }
                className="w-20 border border-gray-200 rounded-md px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <span className="text-[11px] text-gray-500">นาที</span>
            </div>
          )}
        </div>
      </div>
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกประเภทร้าน"}
        </button>
      </div>
    </div>
  );
}

/**
 * Phase 5.5/5.6 — admin-side pause controls. Mirrors the merchant
 * panel under /merchant/restaurant but keyed by restaurantId so an
 * admin can operate for any shop.
 */
type ScheduledPauseRow = {
  start: string;
  end: string;
  days: number[];
  note?: string | null;
  enabled: boolean;
};

function RestaurantPausePanel({
  restaurantId,
  pausedUntil,
  pauseReason,
  scheduledPauses,
  onChanged,
}: {
  restaurantId: string;
  pausedUntil: string | null;
  pauseReason: string | null;
  scheduledPauses: ScheduledPauseRow[];
  onChanged: () => void | Promise<void>;
}) {
  const [, setTick] = useState(0);
  const [duration, setDuration] = useState<15 | 30 | 60 | 120>(30);
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState<ScheduledPauseRow[]>(scheduledPauses);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);

  useEffect(() => {
    setRows(Array.isArray(scheduledPauses) ? scheduledPauses : []);
  }, [scheduledPauses]);

  // Local 15s ticker so the displayed countdown stays fresh.
  useEffect(() => {
    if (!pausedUntil) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 15 * 1000);
    return () => window.clearInterval(t);
  }, [pausedUntil]);

  const pauseMut = trpc.admin.pauseRestaurantOrders.useMutation({
    onSuccess: () => onChanged(),
    onError: (e) => alert("หยุดรับไม่สำเร็จ: " + e.message),
  });
  const resumeMut = trpc.admin.resumeRestaurantOrders.useMutation({
    onSuccess: () => onChanged(),
    onError: (e) => alert("เปิดร้านไม่สำเร็จ: " + e.message),
  });
  const scheduleMut = trpc.admin.setRestaurantScheduledPauses.useMutation({
    onSuccess: async () => {
      await onChanged();
      setScheduleNotice("บันทึกแล้ว");
      setTimeout(() => setScheduleNotice(null), 2400);
    },
    onError: (e) => setScheduleNotice(e.message),
  });

  const isPaused = pausedUntil != null && new Date(pausedUntil).getTime() > Date.now();
  const minutesLeft = pausedUntil
    ? Math.max(0, Math.round((new Date(pausedUntil).getTime() - Date.now()) / 60000))
    : 0;
  const pauseLabel = (() => {
    if (!pausedUntil) return "";
    const d = new Date(pausedUntil);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  })();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900 inline-flex items-center gap-1.5">
          <Pause className="w-4 h-4 text-amber-600" /> หยุดรับออเดอร์
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          จัดการแทนร้าน — ทั้งหยุดด่วน (one-shot) และตั้งช่วงเวลาประจำ
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Manual pause */}
        {isPaused ? (
          <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <Pause className="w-5 h-5 text-amber-700 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-amber-900">
                  หยุดรับออเดอร์อยู่
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  เปิดอีกครั้ง {pauseLabel} น. (อีก {minutesLeft} นาที)
                </p>
                {pauseReason && (
                  <p className="text-[11px] text-amber-700 mt-1">เหตุผล: {pauseReason}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => resumeMut.mutate({ restaurantId })}
              disabled={resumeMut.isPending}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white py-2 text-sm font-bold disabled:opacity-60"
            >
              <Play size={14} />
              {resumeMut.isPending ? "กำลังเปิดร้าน..." : "เปิดรับออเดอร์ทันที"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-800 mb-1">หยุดรับด่วน (one-shot)</p>
            <p className="text-[11px] text-gray-500 leading-snug mb-3">
              ใช้ตอนร้านลูกค้าหน้าร้านเยอะ ระบบจะกลับมารับออเดอร์อัตโนมัติเมื่อครบเวลา
            </p>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {([15, 30, 60, 120] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  className={`py-2 rounded-lg text-sm font-bold border ${
                    duration === m
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-gray-700 border-gray-200"
                  }`}
                >
                  {m < 60 ? `${m} นาที` : `${m / 60} ชม.`}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={120}
              placeholder="เหตุผล (ไม่บังคับ)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button
              type="button"
              onClick={() =>
                pauseMut.mutate({
                  restaurantId,
                  durationMinutes: duration,
                  reason: reason.trim() || undefined,
                })
              }
              disabled={pauseMut.isPending}
              className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white py-2 text-sm font-bold disabled:opacity-60"
            >
              <Pause size={14} />
              {pauseMut.isPending
                ? "กำลังหยุดรับ..."
                : `หยุดรับ ${duration < 60 ? `${duration} นาที` : `${duration / 60} ชม.`}`}
            </button>
          </div>
        )}

        {/* Scheduled recurring pauses */}
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-800 inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-600" /> งดรับออเดอร์ตามเวลา (ประจำ)
          </p>
          <p className="text-[11px] text-gray-500 leading-snug mb-3">
            ตั้งช่วงเวลาประจำ เช่น 11:00-13:00 จันทร์-ศุกร์ ระบบจะปิดรับออเดอร์ในแอปอัตโนมัติ
          </p>

          {scheduleNotice && (
            <div className="mb-2 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs text-green-700">
              {scheduleNotice}
            </div>
          )}

          <div className="space-y-2">
            {rows.length === 0 && (
              <p className="text-[12px] text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                ยังไม่มีช่วงเวลาที่ตั้งไว้
              </p>
            )}
            {rows.map((r, idx) => (
              <AdminScheduledPauseRow
                key={idx}
                row={r}
                onChange={(patch) =>
                  setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)))
                }
                onRemove={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                onToggleDay={(day) =>
                  setRows((prev) =>
                    prev.map((x, i) => {
                      if (i !== idx) return x;
                      const set = new Set(x.days);
                      if (set.has(day)) set.delete(day);
                      else set.add(day);
                      return { ...x, days: Array.from(set).sort((a, b) => a - b) };
                    }),
                  )
                }
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                { start: "11:00", end: "13:00", days: [1, 2, 3, 4, 5], note: "", enabled: true },
              ])
            }
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-orange-300 bg-orange-50 text-orange-700 py-2 text-sm font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่มช่วงงดรับออเดอร์
          </button>

          <button
            type="button"
            onClick={() => {
              setSavingSchedule(true);
              scheduleMut
                .mutateAsync({
                  restaurantId,
                  windows: rows.map((r) => ({
                    start: r.start,
                    end: r.end,
                    days: r.days,
                    note: r.note?.trim() || null,
                    enabled: r.enabled,
                  })),
                })
                .finally(() => setSavingSchedule(false));
            }}
            disabled={savingSchedule || scheduleMut.isPending}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white py-2 text-sm font-bold disabled:opacity-60"
          >
            {scheduleMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            บันทึกตารางเวลา
          </button>
        </div>
      </div>
    </div>
  );
}

const ADMIN_DAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function AdminScheduledPauseRow({
  row,
  onChange,
  onRemove,
  onToggleDay,
}: {
  row: ScheduledPauseRow;
  onChange: (patch: Partial<ScheduledPauseRow>) => void;
  onRemove: () => void;
  onToggleDay: (day: number) => void;
}) {
  return (
    <div className={`rounded-lg border ${row.enabled ? "border-amber-200 bg-amber-50/40" : "border-gray-200 bg-gray-50 opacity-70"} p-3`}>
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={row.start}
          onChange={(e) => onChange({ start: e.target.value })}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <span className="text-gray-400 text-sm">ถึง</span>
        <input
          type="time"
          value={row.end}
          onChange={(e) => onChange({ end: e.target.value })}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <button
          type="button"
          onClick={() => onChange({ enabled: !row.enabled })}
          className={`ml-auto px-2 py-1 rounded text-[11px] font-bold ${row.enabled ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"}`}
        >
          {row.enabled ? "เปิดใช้" : "ปิดไว้"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="w-7 h-7 rounded bg-rose-50 text-rose-500 flex items-center justify-center"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {ADMIN_DAY_LABELS.map((lbl, day) => {
          const active = row.days.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onToggleDay(day)}
              className={`w-8 h-8 rounded-full text-xs font-bold ${
                active ? "bg-amber-500 text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {lbl}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        value={row.note ?? ""}
        onChange={(e) => onChange({ note: e.target.value })}
        maxLength={120}
        placeholder="เหตุผล (ไม่บังคับ) เช่น พักช่วงเที่ยง"
        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
    </div>
  );
}
