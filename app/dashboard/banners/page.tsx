"use client";
import { trpc, getToken } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Plus, Trash2, Save, ImageIcon, Layers, Megaphone, Pencil, X, Clock, CheckCircle } from "lucide-react";

type Banner = {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  startDate?: string; // ISO datetime-local string
  endDate?: string;
};

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

const EMPTY_FORM: Omit<Banner, "imageUrl"> & { imageUrl: string } = {
  imageUrl: "", title: "", subtitle: "", startDate: "", endDate: "",
};

function BannerSection({
  title, description, icon, settingKey, accentColor,
}: {
  title: string; description: string; icon: React.ReactNode;
  settingKey: string; accentColor: string;
}) {
  const utils = trpc.useUtils();
  const { data: settings } = trpc.admin.getSettings.useQuery();
  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: () => { utils.admin.getSettings.invalidate(); setSaved(true); setTimeout(() => setSaved(false), 2500); },
    onError: (e) => alert("บันทึกไม่สำเร็จ: " + e.message),
  });

  const [banners, setBanners] = useState<Banner[]>([]);
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const raw = (settings as Record<string, string>)[settingKey];
    try { setBanners(raw ? JSON.parse(raw) : []); } catch { setBanners([]); }
  }, [settings, settingKey]);

  const saveBanners = (next: Banner[]) => {
    updateSettings.mutate({ [settingKey]: JSON.stringify(next) });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToR2(file, getToken());
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (e: any) {
      alert("เกิดข้อผิดพลาด: " + (e?.message ?? "อัปโหลดไม่สำเร็จ"));
    } finally { setUploading(false); }
  };

  const openAdd = () => { setEditIndex(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (i: number) => { setEditIndex(i); setForm({ ...EMPTY_FORM, ...banners[i] }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditIndex(null); setForm(EMPTY_FORM); };

  const handleSubmit = () => {
    if (!form.imageUrl.trim()) return;
    const banner: Banner = {
      imageUrl: form.imageUrl.trim(),
      ...(form.title?.trim() ? { title: form.title.trim() } : {}),
      ...(form.subtitle?.trim() ? { subtitle: form.subtitle.trim() } : {}),
      ...(form.startDate ? { startDate: form.startDate } : {}),
      ...(form.endDate ? { endDate: form.endDate } : {}),
    };
    const next = editIndex !== null
      ? banners.map((b, i) => (i === editIndex ? banner : b))
      : [...banners, banner];
    setBanners(next);
    saveBanners(next);
    closeForm();
  };

  const handleDelete = (index: number) => {
    if (!confirm("ลบ banner นี้?")) return;
    const next = banners.filter((_, i) => i !== index);
    setBanners(next);
    saveBanners(next);
  };

  const formatDate = (d?: string) => {
    if (!d) return null;
    return new Date(d).toLocaleString("th-TH", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: accentColor + "18" }}>{icon}</div>
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg" style={{ backgroundColor: accentColor }}>
            <Plus className="w-3.5 h-3.5" /> เพิ่ม
          </button>
          {saved && <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 text-xs font-semibold rounded-lg"><CheckCircle className="w-3.5 h-3.5" />บันทึกแล้ว</span>}
          {updateSettings.isPending && <span className="inline-flex items-center px-3 py-1.5 bg-gray-50 text-gray-500 text-xs rounded-lg">กำลังบันทึก...</span>}
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">{editIndex !== null ? "แก้ไข Banner" : "เพิ่ม Banner ใหม่"}</p>
            <button onClick={closeForm}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">อัปโหลดรูปภาพ</label>
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-orange-50 file:text-orange-600 file:font-medium bg-white" />
              {uploading && <p className="text-xs text-orange-500 mt-1">⏳ กำลังอัปโหลดไป R2...</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">หรือวาง URL รูปภาพ</label>
              <input type="url" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">หัวข้อ (ไม่บังคับ)</label>
              <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="เช่น ส่งฟรีทุกออเดอร์"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">คำอธิบาย (ไม่บังคับ)</label>
              <input type="text" value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="เช่น วันนี้เท่านั้น!"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> เริ่มแสดง (ไม่บังคับ)</label>
              <input type="datetime-local" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> หยุดแสดง (ไม่บังคับ)</label>
              <input type="datetime-local" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />
            </div>
          </div>

          {form.imageUrl && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 mb-1">ตัวอย่าง</p>
              <img src={form.imageUrl} alt="preview" className="h-28 w-auto rounded-xl object-cover border border-gray-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!form.imageUrl.trim() || uploading}
              className="px-4 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              style={{ backgroundColor: accentColor }}>
              {editIndex !== null ? "บันทึกการแก้ไข" : "เพิ่ม Banner"}
            </button>
            <button onClick={closeForm} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Banner List */}
      <div className="px-6 py-4">
        {banners.length === 0 ? (
          <div className="text-center py-10">
            <ImageIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">ยังไม่มี Banner กดปุ่ม "เพิ่ม" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="space-y-3">
            {banners.map((banner, index) => {
              const now = new Date();
              const started = !banner.startDate || new Date(banner.startDate) <= now;
              const notEnded = !banner.endDate || new Date(banner.endDate) >= now;
              const isActive = started && notEnded;
              return (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex-shrink-0 relative">
                    {banner.imageUrl ? (
                      <img src={banner.imageUrl} alt={banner.title ?? `Banner ${index + 1}`}
                        className="w-24 h-14 object-cover rounded-lg border border-gray-200"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-24 h-14 rounded-lg bg-gray-200 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <span className={`absolute -top-1.5 -right-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {isActive ? "เผยแพร่" : "ซ่อน"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{banner.title ?? `Banner ${index + 1}`}</p>
                    {banner.subtitle && <p className="text-xs text-gray-500 truncate mt-0.5">{banner.subtitle}</p>}
                    {(banner.startDate || banner.endDate) && (
                      <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {banner.startDate ? formatDate(banner.startDate) : "ทันที"} → {banner.endDate ? formatDate(banner.endDate) : "ไม่มีกำหนด"}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(index)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BannersPage() {
  const { isLoading } = trpc.admin.getSettings.useQuery();
  if (isLoading) return <div className="flex items-center justify-center h-48"><p className="text-gray-400 text-sm">กำลังโหลด...</p></div>;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการ Banner</h1>
        <p className="text-sm text-gray-400 mt-1">แยกการจัดการ Banner เลื่อนหน้าแรก และ Banner Popup ตอนเปิดแอป</p>
      </div>
      <BannerSection title="Banner เลื่อน (Carousel)" description="แสดงเลื่อนซ้าย-ขวาบนหน้าแรกของแอป — เพิ่มได้หลายใบ"
        icon={<Layers className="w-5 h-5" style={{ color: "#FF6B00" }} />} settingKey="slide_banners" accentColor="#FF6B00" />
      <BannerSection title="Banner Popup (โฆษณาตอนเปิดแอป)" description="โชว์เป็น Dialog เมื่อผู้ใช้เปิดแอป — เลื่อนดูได้หลายใบ"
        icon={<Megaphone className="w-5 h-5" style={{ color: "#8B5CF6" }} />} settingKey="popup_banners" accentColor="#8B5CF6" />
    </div>
  );
}
