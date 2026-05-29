"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { trpc, getToken } from "@/lib/trpc";
import { uploadToR2 } from "@/lib/upload";
import { CheckCircle, XCircle, ToggleLeft, ToggleRight, Pencil, Trash2, Loader2, X, Star, MapPin, Plus } from "lucide-react";

const ConciergeLocationPicker = dynamic(() => import("@/components/LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] w-full rounded-[14px] bg-gray-50 flex items-center justify-center text-sm text-gray-400">
      กำลังโหลดแผนที่…
    </div>
  ),
});

export default function ConciergePage() {
  const { data: restaurants = [], isLoading, refetch } = trpc.admin.listRestaurants.useQuery();
  const toggle = trpc.admin.toggleRestaurant.useMutation({ onSuccess: () => refetch() });
  const deleteRestaurant = trpc.admin.deleteRestaurant.useMutation({ onSuccess: () => refetch() });
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const shops = useMemo(
    () => (restaurants as any[]).filter((r) => Boolean(r.isConcierge)),
    [restaurants],
  );

  async function handleToggle(restaurantId: string, isOpen: boolean) {
    try {
      setTogglingId(restaurantId);
      await toggle.mutateAsync({ restaurantId, isOpen });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(restaurantId: string, name: string) {
    if (!confirm(`ต้องการลบร้านดัง "${name}" ใช่หรือไม่?`)) return;
    try {
      setDeletingId(restaurantId);
      await deleteRestaurant.mutateAsync({ restaurantId });
      alert("ลบร้านดังสำเร็จ");
    } catch (error: any) {
      alert(error?.message ?? "ลบร้านดังไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) return <div className="text-gray-400 text-sm">กำลังโหลด...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการร้านดัง (รับหิ้ว)</h1>
          <p className="text-xs text-gray-400 mt-1">{shops.length} ร้านในระบบ</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 text-sm font-semibold"
        >
          <Star className="w-4 h-4" /> เพิ่มร้านดัง
        </button>
      </div>

      {showCreate && (
        <CreateConciergeShopModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refetch();
          }}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">โลโก้</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อร้าน</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">หมวดหมู่</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ที่อยู่ / พิกัด</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">เปิด/ปิด</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center">
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                      ) : (
                        <Star className="w-4 h-4 text-violet-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/dashboard/restaurants/${r.id}`} className="hover:text-violet-600 hover:underline transition-colors">
                      {r.name}
                    </Link>
                    <div className="mt-1">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border bg-violet-50 text-violet-700 border-violet-200">
                        ร้านดัง
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.category ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.address ? (
                      <span className="line-clamp-1">{r.address}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                    {r.lat != null && r.lng != null && (
                      <span className="block text-[11px] text-gray-400 font-mono mt-0.5">
                        {Number(r.lat).toFixed(5)}, {Number(r.lng).toFixed(5)}
                      </span>
                    )}
                  </td>
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
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                        title="แก้ไขร้านดัง"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(r.id, r.name)}
                        disabled={deletingId === r.id}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="ลบร้านดัง"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shops.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">ยังไม่มีร้านดัง — กด “เพิ่มร้านดัง” เพื่อสร้าง</div>
        )}
      </div>
    </div>
  );
}

// Default map center: เมืองอุดรธานี — where most concierge brand shops
// (KFC, พิซซ่า, อเมซอน) actually sit. Saves the admin a long pan from
// the บ้านผือ default.
const CONCIERGE_DEFAULT_LAT = 17.4138;
const CONCIERGE_DEFAULT_LNG = 102.787;

/**
 * CreateConciergeShopModal — spawn a ร้านดัง (รับหิ้ว) brand shop. No
 * merchant owner, no menu. lat/lng are required because the customer
 * service fee = concierge policy × OSRM distance from this pin to them.
 */
function CreateConciergeShopModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const create = trpc.admin.createConciergeShop.useMutation({
    onSuccess: () => onCreated(),
    onError: (e) => setError(e.message),
  });

  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [coords, setCoords] = useState({ lat: CONCIERGE_DEFAULT_LAT, lng: CONCIERGE_DEFAULT_LNG });
  const [pinned, setPinned] = useState(false);
  const [openOnCreate, setOpenOnCreate] = useState(true);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToR2(file, getToken());
      setImageUrl(url);
    } catch (e: any) {
      setError(e?.message ?? "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  // Let the admin copy a logo (from a website / Finder) and paste it
  // straight into the modal with Ctrl+V instead of saving a file first.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (it.type.startsWith("image/")) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            handleUpload(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const submit = () => {
    if (!name.trim()) return setError("กรอกชื่อร้านดัง");
    if (!category.trim()) return setError("กรอกหมวดหมู่");
    if (!imageUrl) return setError("อัปโหลดโลโก้ร้าน");
    if (!pinned) return setError("ปักหมุดตำแหน่งร้านบนแผนที่ก่อน (ใช้คิดค่าบริการตามระยะ)");
    setError(null);
    create.mutate({
      name: name.trim(),
      category: category.trim(),
      address: address.trim() || undefined,
      lat: coords.lat,
      lng: coords.lng,
      imageUrl,
      openOnCreate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/45 p-3" onClick={onClose}>
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-gray-900 inline-flex items-center gap-1.5">
            <Star className="w-4 h-4 text-violet-600" /> เพิ่มร้านดัง (รับหิ้ว)
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">
            ร้านแบรนด์ในเมืองที่ไม่มีเมนู — ลูกค้าพิมพ์สั่งเอง ไรเดอร์ขับไปซื้อให้
            ค่าบริการคิดตามระยะทางจากหมุดร้านนี้ถึงลูกค้า (ตั้งเรตได้ที่ ตั้งค่าระบบ → ร้านดัง)
          </p>

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">โลโก้ร้าน (จัตุรัส 1:1)</label>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="โลโก้" className="w-full h-full object-cover" />
                ) : (
                  <Star className="w-6 h-6 text-violet-300" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer w-fit">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {uploading ? "กำลังอัปโหลด…" : imageUrl ? "เปลี่ยนรูป" : "อัปโหลดโลโก้"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                  />
                </label>
                <span className="text-[11px] text-gray-400">หรือคัดลอกรูปแล้วกด Ctrl+V (⌘V) วางได้เลย</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อร้าน</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={128}
              placeholder="เช่น KFC อุดร, พิซซ่า, คาเฟ่อเมซอน"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">หมวดหมู่</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={64}
              placeholder="เช่น ไก่ทอด, พิซซ่า, กาแฟ"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">ที่อยู่ร้าน (ไม่บังคับ)</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="สาขา/ห้าง/ถนน ในเมือง"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-violet-600" /> ตำแหน่งร้านบนแผนที่
            </label>
            <ConciergeLocationPicker
              lat={coords.lat}
              lng={coords.lng}
              onChange={(next: { lat: number; lng: number }) => { setCoords(next); setPinned(true); }}
              height="260px"
            />
            <p className="text-[11px] mt-1" style={{ color: pinned ? "#7C3AED" : "#9CA3AF" }}>
              {pinned
                ? `ปักหมุดแล้ว · ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : "แตะแผนที่หรือลากหมุดเพื่อปักตำแหน่งร้าน"}
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={openOnCreate}
              onChange={(e) => setOpenOnCreate(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-400"
            />
            <span className="text-sm text-gray-700">เปิดให้ลูกค้าเห็นทันทีหลังสร้าง</span>
          </label>

          <button
            type="button"
            onClick={submit}
            disabled={create.isPending || uploading}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white py-2.5 text-sm font-bold disabled:opacity-60"
          >
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
            {create.isPending ? "กำลังสร้าง..." : "เพิ่มร้านดัง"}
          </button>
        </div>
      </div>
    </div>
  );
}
