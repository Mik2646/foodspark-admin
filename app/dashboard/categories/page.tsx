"use client";
import { trpc, getToken } from "@/lib/trpc";
import Image from "next/image";
import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, ImagePlus } from "lucide-react";

type CategoryFormState = {
  id: string;
  label: string;
  imageUrl: string;
  sortOrder: string;
};

const EMPTY_FORM: CategoryFormState = {
  id: "",
  label: "",
  imageUrl: "",
  sortOrder: "",
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

export default function CategoriesPage() {
  const utils = trpc.useUtils();
  const { data: cats = [], isLoading } = trpc.admin.listCategories.useQuery();
  const createCat = trpc.admin.createCategory.useMutation({
    onSuccess: () => {
      utils.admin.listCategories.invalidate();
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    },
    onError: (e) => alert("ไม่สามารถสร้างได้: " + e.message),
  });
  const updateCat = trpc.admin.updateCategory.useMutation({
    onSuccess: () => {
      utils.admin.listCategories.invalidate();
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    },
    onError: (e) => alert("ไม่สามารถแก้ไขได้: " + e.message),
  });
  const deleteCat = trpc.admin.deleteCategory.useMutation({
    onSuccess: () => utils.admin.listCategories.invalidate(),
    onError: (e) => alert("ไม่สามารถลบได้: " + e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const isEditing = Boolean(editingId);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (cat: { id: string; label: string; imageUrl?: string | null; sortOrder: number }) => {
    setEditingId(cat.id);
    setForm({
      id: cat.id,
      label: cat.label,
      imageUrl: cat.imageUrl ?? "",
      sortOrder: String(cat.sortOrder),
    });
    setShowForm(true);
  };

  const handleCreate = () => {
    if (!form.id.trim() || !form.label.trim()) return;
    createCat.mutate({
      id: form.id.trim().toLowerCase().replace(/\s+/g, "-"),
      label: form.label.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
      sortOrder: Number(form.sortOrder) || 0,
    });
  };

  const handleUpdate = () => {
    if (!editingId || !form.label.trim()) return;
    updateCat.mutate({
      id: editingId,
      label: form.label.trim(),
      imageUrl: form.imageUrl.trim(),
      sortOrder: Number(form.sortOrder) || 0,
    });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToR2(file, getToken());
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (error: any) {
      alert("อัปโหลดรูปไม่สำเร็จ: " + (error?.message ?? "เกิดข้อผิดพลาด"));
    } finally {
      setUploading(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  if (isLoading) return <div className="flex items-center justify-center h-48"><p className="text-gray-400 text-sm">กำลังโหลด...</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการหมวดหมู่</h1>
          <p className="text-sm text-gray-400 mt-1">หมวดหมู่ที่แสดงในแถบกรองร้านอาหารในแอป</p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> เพิ่มหมวดหมู่
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            {isEditing ? `แก้ไขหมวดหมู่: ${editingId}` : "หมวดหมู่ใหม่"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ID (ภาษาอังกฤษ) *</label>
              <input
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                placeholder="เช่น bubble-tea, pizza"
                disabled={isEditing}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ชื่อที่แสดง *</label>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="เช่น ชานมไข่มุก, พิซซ่า"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ลำดับ</label>
              <input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">หรือวาง URL รูปหมวดหมู่</label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <ImagePlus className="w-4 h-4 text-orange-500" />
                {uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูป"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                  }}
                />
              </label>
            </div>
          </div>
          {form.imageUrl.trim() && (
            <div className="mb-3 rounded-xl border border-orange-100 bg-white p-3">
              <p className="mb-2 text-xs font-medium text-gray-500">ตัวอย่างรูปหมวดหมู่</p>
              <div className="flex items-center gap-3">
                <Image
                  src={form.imageUrl}
                  alt={form.label || "category preview"}
                  width={56}
                  height={56}
                  unoptimized
                  className="h-14 w-14 rounded-xl object-cover border border-gray-200"
                />
                <p className="text-xs text-gray-500 break-all">{form.imageUrl}</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={isEditing ? handleUpdate : handleCreate}
              disabled={createCat.isPending || updateCat.isPending || !form.id.trim() || !form.label.trim() || uploading}
              className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {isEditing
                ? (updateCat.isPending ? "กำลังบันทึก..." : "บันทึกการแก้ไข")
                : (createCat.isPending ? "กำลังสร้าง..." : "สร้างหมวดหมู่")}
            </button>
            <button onClick={closeForm} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Category List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {cats.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">ยังไม่มีหมวดหมู่</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ชื่อที่แสดง</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">รูปหมวดหมู่</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">ลำดับ</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cats.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-300">
                    <GripVertical className="w-4 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{cat.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{cat.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    {cat.imageUrl ? (
                      <div className="flex items-center gap-2">
                        <Image
                          src={cat.imageUrl}
                          alt={cat.label}
                          width={36}
                          height={36}
                          unoptimized
                          className="h-9 w-9 rounded-lg border border-gray-200 object-cover"
                        />
                        <span className="max-w-[180px] truncate text-xs text-gray-500">{cat.imageUrl}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">ยังไม่ได้ตั้งรูป</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500">{cat.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditForm(cat)}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`ลบหมวดหมู่ "${cat.label}"?`)) deleteCat.mutate({ id: cat.id }); }}
                        disabled={deleteCat.isPending}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
