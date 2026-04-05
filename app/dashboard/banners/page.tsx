"use client";
import { trpc, getToken } from "@/lib/trpc";
import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
import { Image, Plus, Trash2, Save, ImageIcon } from "lucide-react";

type PromoBanner = { imageUrl: string; title?: string; subtitle?: string };

export default function BannersPage() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.admin.getSettings.useQuery();
  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: () => {
      utils.admin.getSettings.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [saved, setSaved] = useState(false);

  // New banner form
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const raw = (settings as Record<string, string>)["promo_banners"];
    if (raw) {
      try {
        setBanners(JSON.parse(raw));
      } catch {
        setBanners([]);
      }
    }
  }, [settings]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip "data:image/...;base64,"
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ base64, mimeType: file.type }),
      });
      const data = await res.json();
      if (data.url) {
        setNewImageUrl(data.url);
      } else {
        alert("อัปโหลดรูปไม่สำเร็จ: " + (data.error ?? "unknown"));
      }
    } catch (e: any) {
      alert("เกิดข้อผิดพลาดในการอัปโหลด: " + e?.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddBanner = () => {
    if (!newImageUrl.trim()) return;
    const newBanner: PromoBanner = {
      imageUrl: newImageUrl.trim(),
      ...(newTitle.trim() ? { title: newTitle.trim() } : {}),
      ...(newSubtitle.trim() ? { subtitle: newSubtitle.trim() } : {}),
    };
    setBanners((prev) => [...prev, newBanner]);
    setNewImageUrl("");
    setNewTitle("");
    setNewSubtitle("");
    setShowForm(false);
  };

  const handleDelete = (index: number) => {
    if (!confirm("ลบ banner นี้?")) return;
    setBanners((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    updateSettings.mutate({ promo_banners: JSON.stringify(banners) });
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการ Banner โปรโมชัน</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            เพิ่ม Banner
          </button>
          <button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saved ? "บันทึกแล้ว!" : updateSettings.isPending ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>

      {/* Add Banner Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-orange-500" />
            Banner ใหม่
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">อัปโหลดรูปภาพ</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-orange-50 file:text-orange-600 file:font-medium hover:file:bg-orange-100"
              />
              {uploading && <p className="text-xs text-orange-500 mt-1">กำลังอัปโหลด...</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">หรือใส่ URL รูปภาพ</label>
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">หัวข้อ (ไม่บังคับ)</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="เช่น ส่งฟรีทุกออเดอร์"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">คำอธิบาย (ไม่บังคับ)</label>
              <input
                type="text"
                value={newSubtitle}
                onChange={(e) => setNewSubtitle(e.target.value)}
                placeholder="เช่น วันนี้เท่านั้น!"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
          {newImageUrl && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-1">ตัวอย่าง</p>
              <img
                src={newImageUrl}
                alt="preview"
                className="h-40 w-auto rounded-lg object-cover border border-gray-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAddBanner}
              disabled={!newImageUrl.trim()}
              className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Image className="w-4 h-4 text-orange-500" />
          รายการ Banner ({banners.length})
        </h2>
        {banners.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">ยังไม่มี Banner กดปุ่ม "เพิ่ม Banner" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((banner, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 bg-gray-50"
              >
                <div className="flex-shrink-0">
                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title ?? `Banner ${index + 1}`}
                      className="w-24 h-16 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='64' viewBox='0 0 96 64'%3E%3Crect width='96' height='64' fill='%23f3f4f6'/%3E%3Ctext x='48' y='36' text-anchor='middle' fill='%239ca3af' font-size='12'%3ENo image%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  ) : (
                    <div className="w-24 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {banner.title ?? `Banner ${index + 1}`}
                  </p>
                  {banner.subtitle && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{banner.subtitle}</p>
                  )}
                  <p className="text-xs text-gray-400 truncate mt-1">{banner.imageUrl}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                  <span className="text-xs text-gray-400 font-mono">#{index + 1}</span>
                  <button
                    onClick={() => handleDelete(index)}
                    className="ml-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="ลบ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {banners.length > 0 && (
          <p className="text-xs text-gray-400 mt-4">
            * อย่าลืมกด "บันทึก" เพื่อบันทึกการเปลี่ยนแปลง
          </p>
        )}
      </div>
    </div>
  );
}
