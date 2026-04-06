"use client";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, Check, X } from "lucide-react";

type EditState = { id: string; label: string; sortOrder: string } | null;

export default function CategoriesPage() {
  const utils = trpc.useUtils();
  const { data: cats = [], isLoading } = trpc.admin.listCategories.useQuery();
  const createCat = trpc.admin.createCategory.useMutation({
    onSuccess: () => { utils.admin.listCategories.invalidate(); setShowForm(false); setForm({ id: "", label: "", sortOrder: "" }); },
    onError: (e) => alert("ไม่สามารถสร้างได้: " + e.message),
  });
  const updateCat = trpc.admin.updateCategory.useMutation({
    onSuccess: () => { utils.admin.listCategories.invalidate(); setEditing(null); },
    onError: (e) => alert("ไม่สามารถแก้ไขได้: " + e.message),
  });
  const deleteCat = trpc.admin.deleteCategory.useMutation({
    onSuccess: () => utils.admin.listCategories.invalidate(),
    onError: (e) => alert("ไม่สามารถลบได้: " + e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: "", label: "", sortOrder: "" });
  const [editing, setEditing] = useState<EditState>(null);

  const handleCreate = () => {
    if (!form.id.trim() || !form.label.trim()) return;
    createCat.mutate({ id: form.id.trim().toLowerCase().replace(/\s+/g, "-"), label: form.label.trim(), sortOrder: Number(form.sortOrder) || 0 });
  };

  const handleUpdate = () => {
    if (!editing || !editing.label.trim()) return;
    updateCat.mutate({ id: editing.id, label: editing.label.trim(), sortOrder: Number(editing.sortOrder) || 0 });
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
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> เพิ่มหมวดหมู่
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">หมวดหมู่ใหม่</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ID (ภาษาอังกฤษ) *</label>
              <input
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                placeholder="เช่น bubble-tea, pizza"
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
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createCat.isPending || !form.id.trim() || !form.label.trim()}
              className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {createCat.isPending ? "กำลังสร้าง..." : "สร้างหมวดหมู่"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">
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
                    {editing?.id === cat.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editing.label}
                          onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                          className="border border-orange-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 w-40"
                          autoFocus
                        />
                        <input
                          type="number"
                          value={editing.sortOrder}
                          onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-16 focus:outline-none"
                          placeholder="ลำดับ"
                        />
                        <button onClick={handleUpdate} disabled={updateCat.isPending} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">{cat.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500">{cat.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {editing?.id !== cat.id && (
                        <button
                          onClick={() => setEditing({ id: cat.id, label: cat.label, sortOrder: String(cat.sortOrder) })}
                          className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
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
