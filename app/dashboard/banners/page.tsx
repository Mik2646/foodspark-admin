"use client";
import { trpc, getToken } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Plus, Trash2, Save, ImageIcon, Layers, Megaphone } from "lucide-react";

type Banner = { imageUrl: string; title?: string; subtitle?: string };

// ─── Upload via Next.js proxy route → Railway → R2 ───────────────────────────
async function uploadToR2(file: File, token: string | null): Promise<string> {
  // Validate file size client-side (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("ไฟล์ใหญ่เกินไป (สูงสุด 10MB) กรุณาลดขนาดรูปก่อนอัพโหลด");
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ base64, mimeType: file.type }),
  });
  const data = await res.json();
  if (!data.url) throw new Error(data.error ?? "อัปโหลดไม่สำเร็จ");
  return data.url;
}

// ─── Banner section component ────────────────────────────────────────────────
function BannerSection({
  title,
  description,
  icon,
  settingKey,
  accentColor,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  settingKey: string;
  accentColor: string;
}) {
  const utils = trpc.useUtils();
  const { data: settings } = trpc.admin.getSettings.useQuery();
  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: () => {
      utils.admin.getSettings.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => {
      alert("บันทึกไม่สำเร็จ: " + e.message);
    },
  });

  const [banners, setBanners] = useState<Banner[]>([]);
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const raw = (settings as Record<string, string>)[settingKey];
    if (raw) {
      try { setBanners(JSON.parse(raw)); } catch { setBanners([]); }
    }
  }, [settings, settingKey]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToR2(file, getToken());
      setNewImageUrl(url);
    } catch (e: any) {
      alert("เกิดข้อผิดพลาด: " + (e?.message ?? "อัปโหลดไม่สำเร็จ"));
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = () => {
    if (!newImageUrl.trim()) return;
    setBanners((prev) => [
      ...prev,
      { imageUrl: newImageUrl.trim(), ...(newTitle.trim() ? { title: newTitle.trim() } : {}), ...(newSubtitle.trim() ? { subtitle: newSubtitle.trim() } : {}) },
    ]);
    setNewImageUrl(""); setNewTitle(""); setNewSubtitle(""); setShowForm(false);
  };

  const handleDelete = (index: number) => {
    if (!confirm("ลบ banner นี้?")) return;
    setBanners((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    updateSettings.mutate({ [settingKey]: JSON.stringify(banners) });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: accentColor + "18" }}>
            {icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors"
            style={{ backgroundColor: accentColor }}
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่ม
          </button>
          <button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? "บันทึกแล้ว ✓" : updateSettings.isPending ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">อัปโหลดรูปภาพ</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-orange-50 file:text-orange-600 file:font-medium hover:file:bg-orange-100 bg-white"
              />
              {uploading && <p className="text-xs text-orange-500 mt-1">⏳ กำลังอัปโหลดไป R2...</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">หรือวาง URL รูปภาพ</label>
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">หัวข้อ (ไม่บังคับ)</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="เช่น ส่งฟรีทุกออเดอร์"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">คำอธิบาย (ไม่บังคับ)</label>
              <input
                type="text"
                value={newSubtitle}
                onChange={(e) => setNewSubtitle(e.target.value)}
                placeholder="เช่น วันนี้เท่านั้น!"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              />
            </div>
          </div>

          {newImageUrl && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 mb-1">ตัวอย่าง</p>
              <div className="relative inline-block">
                <img
                  src={newImageUrl}
                  alt="preview"
                  className="h-32 w-auto rounded-xl object-cover border border-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                {(newTitle || newSubtitle) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 rounded-b-xl px-3 py-2">
                    {newTitle && <p className="text-white text-sm font-bold">{newTitle}</p>}
                    {newSubtitle && <p className="text-white/80 text-xs">{newSubtitle}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newImageUrl.trim() || uploading}
              className="px-4 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
              style={{ backgroundColor: accentColor }}
            >
              เพิ่ม Banner
            </button>
            <button
              onClick={() => { setShowForm(false); setNewImageUrl(""); setNewTitle(""); setNewSubtitle(""); }}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
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
            {banners.map((banner, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                <div className="flex-shrink-0">
                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title ?? `Banner ${index + 1}`}
                      className="w-24 h-14 object-cover rounded-lg border border-gray-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-24 h-14 rounded-lg bg-gray-200 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{banner.title ?? `Banner ${index + 1}`}</p>
                  {banner.subtitle && <p className="text-xs text-gray-500 truncate mt-0.5">{banner.subtitle}</p>}
                  <p className="text-xs text-gray-300 truncate mt-1 font-mono">{banner.imageUrl}</p>
                </div>
                <button
                  onClick={() => handleDelete(index)}
                  className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-1">* กด "บันทึก" เพื่อบันทึกการเปลี่ยนแปลง</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BannersPage() {
  const { isLoading } = trpc.admin.getSettings.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการ Banner</h1>
        <p className="text-sm text-gray-400 mt-1">แยกการจัดการ Banner เลื่อนหน้าแรก และ Banner Popup ตอนเปิดแอป</p>
      </div>

      {/* Slide Banners */}
      <BannerSection
        title="Banner เลื่อน (Carousel)"
        description="แสดงเลื่อนซ้าย-ขวาบนหน้าแรกของแอป — เพิ่มได้หลายใบ"
        icon={<Layers className="w-5 h-5" style={{ color: "#FF6B00" }} />}
        settingKey="slide_banners"
        accentColor="#FF6B00"
      />

      {/* Popup Banners */}
      <BannerSection
        title="Banner Popup (โฆษณาตอนเปิดแอป)"
        description="โชว์เป็น Dialog วันละครั้งเมื่อผู้ใช้เปิดแอป — เลื่อนดูได้หลายใบ"
        icon={<Megaphone className="w-5 h-5" style={{ color: "#8B5CF6" }} />}
        settingKey="popup_banners"
        accentColor="#8B5CF6"
      />
    </div>
  );
}
