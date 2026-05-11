"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import OptionBuilder, { type OptionGroup, sanitizeOptions } from "@/components/OptionBuilder";
import { defaultMenuMeta, type MenuMeta } from "@/lib/menuMeta";

export type MenuItemFormData = {
  name: string;
  description: string; // PLAIN description (without menu-meta marker)
  price: string;
  imageUrl: string;
  category: string;
  isPopular: boolean;
  meta: MenuMeta;
  options: OptionGroup[];
};

export const EMPTY_MENU_ITEM_FORM: MenuItemFormData = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  category: "",
  isPopular: false,
  meta: defaultMenuMeta(),
  options: [],
};

/**
 * Shared menu-item form used in both add-mode + edit-mode on the admin
 * restaurant detail page. Brings the admin form to feature parity with
 * what merchants see in their own menu manager (foodspark-web/app/
 * merchant/menu/page.tsx):
 *
 *   - basic fields (name, category, price, image, description, popular)
 *   - menu meta (sold-out, stock count, schedule window, prep minutes)
 *   - customisation groups (OptionBuilder)
 *
 * Pure-presentational — parent owns the form state + handles submit.
 */
export default function MenuItemForm({
  form,
  setForm,
  onUpload,
  uploading,
}: {
  form: MenuItemFormData;
  setForm: React.Dispatch<React.SetStateAction<MenuItemFormData>>;
  onUpload: (file: File) => void | Promise<void>;
  uploading: boolean;
}) {
  const [showMeta, setShowMeta] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateMeta = (patch: Partial<MenuMeta>) =>
    setForm((f) => ({ ...f, meta: { ...f.meta, ...patch } }));

  return (
    <div className="space-y-4">
      {/* Basic fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">ชื่อเมนู *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">หมวดหมู่เมนู *</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="อาหารจานหลัก / เครื่องดื่ม"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">ราคา (฿) *</label>
          <input
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">คำอธิบาย</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="คำอธิบายสั้น ๆ เกี่ยวกับเมนูนี้"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">อัปโหลดรูป</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-orange-50 file:text-orange-600 file:font-medium"
          />
          {uploading && <p className="text-xs text-orange-500 mt-1">⏳ กำลังอัปโหลด...</p>}
          {form.imageUrl && (
            <Image
              src={form.imageUrl}
              alt="ตัวอย่างรูป"
              width={112}
              height={56}
              unoptimized
              className="h-14 mt-2 rounded-lg object-cover border border-gray-100"
            />
          )}
        </div>
        <div className="md:col-span-2 flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="popular"
            checked={form.isPopular}
            onChange={(e) => setForm((f) => ({ ...f, isPopular: e.target.checked }))}
            className="w-4 h-4 accent-orange-500"
          />
          <label htmlFor="popular" className="text-sm text-gray-700">
            ⭐ เมนูแนะนำ <span className="text-gray-400 text-xs">(แสดงเด่นในหน้าร้านของลูกค้า)</span>
          </label>
        </div>
      </div>

      {/* Availability + stock meta (collapsed by default) */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setShowMeta((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
        >
          <span>
            สถานะ & เวลาขาย
            {(form.meta.soldOut ||
              form.meta.stockCount != null ||
              form.meta.scheduleEnabled ||
              form.meta.prepMinutes != null) && (
              <span className="ml-1 text-orange-500 font-semibold">(ปรับแล้ว)</span>
            )}
          </span>
          <span className="text-gray-400 text-xs">{showMeta ? "ซ่อน" : "ขยาย"}</span>
        </button>
        {showMeta && (
          <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.meta.soldOut}
                  onChange={(e) => updateMeta({ soldOut: e.target.checked })}
                  className="w-4 h-4 accent-orange-500"
                />
                หมดชั่วคราว (sold out)
              </label>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">สต็อกคงเหลือ (เว้นว่าง = ไม่จำกัด)</label>
                <input
                  type="number"
                  min={0}
                  value={form.meta.stockCount ?? ""}
                  onChange={(e) =>
                    updateMeta({ stockCount: e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">เวลาเตรียมโดยประมาณ (นาที)</label>
                <input
                  type="number"
                  min={0}
                  value={form.meta.prepMinutes ?? ""}
                  onChange={(e) =>
                    updateMeta({ prepMinutes: e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>
            <div className="border border-gray-100 rounded-md p-2.5 bg-gray-50">
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={form.meta.scheduleEnabled}
                  onChange={(e) => updateMeta({ scheduleEnabled: e.target.checked })}
                  className="w-4 h-4 accent-orange-500"
                />
                จำกัดเวลาขายเฉพาะช่วง
              </label>
              {form.meta.scheduleEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">เริ่ม (HH:MM)</label>
                    <input
                      type="time"
                      value={form.meta.availableFrom ?? "09:00"}
                      onChange={(e) => updateMeta({ availableFrom: e.target.value })}
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">สิ้นสุด (HH:MM)</label>
                    <input
                      type="time"
                      value={form.meta.availableTo ?? "21:00"}
                      onChange={(e) => updateMeta({ availableTo: e.target.value })}
                      className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Customisation groups */}
      <OptionBuilder
        options={form.options}
        onChange={(next) => setForm((f) => ({ ...f, options: next }))}
      />
    </div>
  );
}

/** Pre-submit clean of empty option groups. Wraps the OptionBuilder helper. */
export function cleanOptionsForSubmit(options: OptionGroup[]): OptionGroup[] {
  return sanitizeOptions(options);
}
