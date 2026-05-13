"use client";

/**
 * Admin — ระบบตลาดนัด.
 *
 * Phase 2: CRUD for the `markets` table. A "market" is a periodic outdoor
 * gathering of vendors at a fixed location on specific days of the week.
 * Restaurants opt-in by setting their `marketId` (done from the restaurant
 * detail page).
 *
 * UX choices:
 *  - Days are encoded JS-style (Sun=0..Sat=6), shown as a Mon-Sun chip row
 *    so admins can tick the days the market actually runs.
 *  - openTime / closeTime are HH:MM strings (24h). Validated server-side.
 *  - Image upload pipes through R2 same as banners/categories.
 *  - sortOrder + isActive are the two visibility levers, mirroring how
 *    /dashboard/categories handles its own ordering.
 */
import { trpc, getToken } from "@/lib/trpc";
import { uploadToR2 } from "@/lib/upload";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  CheckCircle,
  ShoppingBasket,
  Clock,
  MapPin,
  Calendar,
  Store,
  ImageIcon,
  Loader2,
} from "lucide-react";

type DayIdx = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const DAY_LABELS: { idx: DayIdx; short: string; full: string }[] = [
  { idx: 1, short: "จ.", full: "จันทร์" },
  { idx: 2, short: "อ.", full: "อังคาร" },
  { idx: 3, short: "พ.", full: "พุธ" },
  { idx: 4, short: "พฤ.", full: "พฤหัสบดี" },
  { idx: 5, short: "ศ.", full: "ศุกร์" },
  { idx: 6, short: "ส.", full: "เสาร์" },
  { idx: 0, short: "อา.", full: "อาทิตย์" },
];

type FormState = {
  id: string | null;
  name: string;
  description: string;
  location: string;
  village: string;
  days: DayIdx[];
  openTime: string;
  closeTime: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  description: "",
  location: "",
  village: "",
  days: [],
  openTime: "06:00",
  closeTime: "18:00",
  imageUrl: "",
  sortOrder: 0,
  isActive: true,
};

export default function MarketsPage() {
  const utils = trpc.useUtils();
  const { data: marketList = [], isLoading } = trpc.admin.listMarkets.useQuery();

  const createMarket = trpc.admin.createMarket.useMutation({
    onSuccess: () => {
      utils.admin.listMarkets.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      closeForm();
    },
    onError: (e) => alert("สร้างตลาดไม่สำเร็จ: " + e.message),
  });
  const updateMarket = trpc.admin.updateMarket.useMutation({
    onSuccess: () => {
      utils.admin.listMarkets.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      closeForm();
    },
    onError: (e) => alert("บันทึกไม่สำเร็จ: " + e.message),
  });
  const deleteMarket = trpc.admin.deleteMarket.useMutation({
    onSuccess: () => utils.admin.listMarkets.invalidate(),
    onError: (e) => alert("ลบไม่สำเร็จ: " + e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };
  const openEdit = (m: (typeof marketList)[number]) => {
    setForm({
      id: m.id,
      name: m.name ?? "",
      description: m.description ?? "",
      location: m.location ?? "",
      village: m.village ?? "",
      days: ((m.days as number[]) ?? []).filter(
        (d): d is DayIdx => d >= 0 && d <= 6,
      ),
      openTime: m.openTime ?? "06:00",
      closeTime: m.closeTime ?? "18:00",
      imageUrl: m.imageUrl ?? "",
      sortOrder: m.sortOrder ?? 0,
      isActive: m.isActive ?? true,
    });
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const toggleDay = (idx: DayIdx) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(idx)
        ? f.days.filter((d) => d !== idx)
        : [...f.days, idx].sort(),
    }));
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToR2(file, getToken());
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (e: any) {
      alert("อัปโหลดไม่สำเร็จ: " + (e?.message ?? ""));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert("กรอกชื่อตลาดก่อน");
      return;
    }
    if (form.days.length === 0) {
      alert("เลือกอย่างน้อย 1 วัน");
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      location: form.location.trim() || undefined,
      village: form.village.trim() || undefined,
      days: form.days,
      openTime: form.openTime,
      closeTime: form.closeTime,
      imageUrl: form.imageUrl.trim() || undefined,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    if (form.id) {
      updateMarket.mutate({ id: form.id, ...payload });
    } else {
      createMarket.mutate(payload);
    }
  };

  const handleDelete = (m: (typeof marketList)[number]) => {
    if (
      !confirm(
        `ลบตลาด "${m.name}"?\nร้านที่เคยอยู่ในตลาดนี้ (${m.vendorCount} ร้าน) จะถูกถอดออกอัตโนมัติ`,
      )
    )
      return;
    deleteMarket.mutate({ id: m.id });
  };

  const formatDays = (days: number[]) => {
    if (!days || days.length === 0) return "ไม่ระบุ";
    if (days.length === 7) return "ทุกวัน";
    return DAY_LABELS.filter((d) => days.includes(d.idx))
      .map((d) => d.short)
      .join(", ");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBasket className="w-6 h-6 text-emerald-500" />
            ระบบตลาดนัด
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            จัดการตลาดนัดประจำสัปดาห์ — กำหนดวัน เวลา และมอบหมายร้านค้าให้แต่ละตลาด
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 text-xs font-semibold rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" />
              บันทึกแล้ว
            </span>
          )}
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" /> เพิ่มตลาด
          </button>
        </div>
      </div>

      {/* Form modal-ish (inline) */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-base font-bold text-gray-900">
              {form.id ? "แก้ไขตลาด" : "เพิ่มตลาดใหม่"}
            </p>
            <button onClick={closeForm}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  ชื่อตลาด *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="เช่น ตลาดนัดวันพุธ บ้านโนนสะอาด"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  หมู่บ้าน
                </label>
                <input
                  type="text"
                  value={form.village}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, village: e.target.value }))
                  }
                  placeholder="เช่น บ้านโนนสะอาด"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  ที่ตั้ง (รายละเอียด)
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder="เช่น ลานข้างวัดบ้านโนนสะอาด"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  คำอธิบาย (ไม่บังคับ)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="รายละเอียดเพิ่มเติม เช่น มีอะไรขายบ้าง"
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                <Calendar className="w-3 h-3 inline mr-1" />
                วันที่เปิดตลาด *
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((d) => {
                  const active = form.days.includes(d.idx);
                  return (
                    <button
                      key={d.idx}
                      type="button"
                      onClick={() => toggleDay(d.idx)}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        active
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                      }`}
                    >
                      {d.full}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  <Clock className="w-3 h-3 inline mr-1" /> เวลาเปิด
                </label>
                <input
                  type="time"
                  value={form.openTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, openTime: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  <Clock className="w-3 h-3 inline mr-1" /> เวลาปิด
                </label>
                <input
                  type="time"
                  value={form.closeTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, closeTime: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  ลำดับ
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  สถานะ
                </label>
                <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                    className="rounded text-emerald-500"
                  />
                  <span className="text-sm text-gray-700">เปิดใช้งาน</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  อัปโหลดรูปตลาด
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-600 file:font-medium bg-white"
                />
                {uploading && (
                  <p className="text-xs text-emerald-500 mt-1 inline-flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    กำลังอัปโหลด...
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  หรือวาง URL
                </label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, imageUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>

            {form.imageUrl && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  ตัวอย่าง
                </p>
                <Image
                  src={form.imageUrl}
                  alt="preview"
                  width={320}
                  height={180}
                  unoptimized
                  className="w-80 h-44 rounded-xl object-cover border border-gray-200"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={handleSubmit}
                disabled={
                  createMarket.isPending ||
                  updateMarket.isPending ||
                  uploading ||
                  !form.name.trim() ||
                  form.days.length === 0
                }
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {form.id ? "บันทึกการแก้ไข" : "เพิ่มตลาด"}
              </button>
              <button
                onClick={closeForm}
                className="px-5 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {marketList.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBasket className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              ยังไม่มีตลาด — กดปุ่ม "เพิ่มตลาด" เพื่อเริ่มต้น
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {marketList.map((m) => (
              <div key={m.id} className="px-6 py-4 flex items-center gap-4">
                <div className="flex-shrink-0">
                  {m.imageUrl ? (
                    <Image
                      src={m.imageUrl}
                      alt={m.name}
                      width={96}
                      height={96}
                      unoptimized
                      className="w-24 h-24 rounded-xl object-cover border border-gray-100"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-emerald-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-gray-900 truncate">
                      {m.name}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        m.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {m.isActive ? "เปิดใช้งาน" : "ปิด"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-1">
                      <Store className="w-3 h-3" />
                      {m.vendorCount} ร้าน
                    </span>
                  </div>
                  {m.location && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-0.5">
                      <MapPin className="w-3 h-3" />
                      {m.location}
                      {m.village ? ` · ${m.village}` : ""}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDays(m.days as number[])}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {m.openTime} – {m.closeTime}
                    </span>
                  </p>
                  {m.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {m.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(m)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 text-xs font-medium rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
