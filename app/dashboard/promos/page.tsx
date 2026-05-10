"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TicketPercent, Plus, Power, PowerOff } from "lucide-react";

/**
 * Admin promo code management.
 *
 * Backend already had createPromoCode + listPromoCodes + togglePromoCode
 * mutations / queries; this is just the UI on top. Lets ops create three
 * shapes of promo:
 *   - fixed_amount: discount X baht off
 *   - percent: discount X percent off
 *   - free_delivery: rider fee waived (still pays merchant + items)
 *
 * The `firstOrderOnly` toggle pairs with the customer-side home banner —
 * when enabled, the promo only applies to a customer's very first order
 * AND surfaces as a "ใช้โค้ด FOODSPARK20 ที่หน้าตะกร้า" CTA on home for
 * users who haven't ordered yet.
 */
type PromoType = "fixed_amount" | "percent" | "free_delivery";

export default function PromosPage() {
  const utils = trpc.useUtils();
  const { data: promos = [], isLoading } = trpc.admin.listPromoCodes.useQuery();
  const create = trpc.admin.createPromoCode.useMutation({
    onSuccess: () => { utils.admin.listPromoCodes.invalidate(); resetForm(); },
    onError: (e) => alert("สร้างโค้ดไม่สำเร็จ: " + e.message),
  });
  const toggle = trpc.admin.togglePromoCode.useMutation({
    onSuccess: () => utils.admin.listPromoCodes.invalidate(),
    onError: (e) => alert("เปลี่ยนสถานะไม่สำเร็จ: " + e.message),
  });

  const [code, setCode] = useState("");
  const [type, setType] = useState<PromoType>("fixed_amount");
  const [value, setValue] = useState("20");
  const [minOrderAmount, setMinOrderAmount] = useState("0");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);

  function resetForm() {
    setCode("");
    setType("fixed_amount");
    setValue("20");
    setMinOrderAmount("0");
    setMaxUses("");
    setExpiresAt("");
    setDescription("");
    setFirstOrderOnly(false);
  }

  const handleSubmit = () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) return alert("กรุณากรอกโค้ด");
    const numValue = Number(value) || 0;
    if (type === "percent" && (numValue < 1 || numValue > 100)) {
      return alert("เปอร์เซ็นต์ต้องอยู่ระหว่าง 1-100");
    }
    create.mutate({
      code: trimmedCode,
      type,
      value: numValue,
      minOrderAmount: Number(minOrderAmount) || 0,
      maxUses: maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt || null,
      description: description.trim() || undefined,
      firstOrderOnly,
    });
  };

  const typeLabel: Record<PromoType, string> = {
    fixed_amount: "ลดบาท",
    percent: "ลดเปอร์เซ็นต์",
    free_delivery: "ส่งฟรี",
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-4">
        <TicketPercent className="w-5 h-5 text-orange-500" />
        <h1 className="text-xl font-bold text-gray-900">โปรโมโค้ด</h1>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-orange-500" /> สร้างโค้ดใหม่
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">โค้ด *</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="WELCOME20"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 uppercase"
            />
            <p className="text-[10px] text-gray-400 mt-1">เก็บเป็นตัวพิมพ์ใหญ่อัตโนมัติ</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ประเภท *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PromoType)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            >
              <option value="fixed_amount">ลดเป็นจำนวน (บาท)</option>
              <option value="percent">ลดเป็นเปอร์เซ็นต์ (%)</option>
              <option value="free_delivery">ส่งฟรี</option>
            </select>
          </div>
          {type !== "free_delivery" && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {type === "percent" ? "เปอร์เซ็นต์ *" : "จำนวนเงินลด (บาท) *"}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "percent" ? "10" : "20"}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">สั่งขั้นต่ำ (บาท)</label>
            <input
              type="number"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">จำนวนใช้สูงสุด (เว้นว่าง = ไม่จำกัด)</label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="ไม่จำกัด"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">วันหมดอายุ (เว้นว่าง = ไม่หมด)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">คำอธิบาย (จะแสดงบนแบนเนอร์ลูกค้า)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ส่วนลดสำหรับลูกค้าใหม่ ใช้ครั้งแรกเท่านั้น"
              maxLength={128}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="firstOrderOnly"
              checked={firstOrderOnly}
              onChange={(e) => setFirstOrderOnly(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <label htmlFor="firstOrderOnly" className="text-sm text-gray-700">
              เฉพาะลูกค้าใหม่ (จะแสดง banner บน home ของลูกค้าใหม่อัตโนมัติ)
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            ล้าง
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={create.isPending}
            className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-60"
          >
            {create.isPending ? "กำลังสร้าง..." : "สร้างโค้ด"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">โค้ดทั้งหมด ({promos.length})</h2>
        </div>
        {isLoading ? (
          <div className="p-5 text-sm text-gray-400">กำลังโหลด...</div>
        ) : promos.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">ยังไม่มีโค้ด — สร้างใหม่ด้านบน</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {promos.map((p) => {
              const expired = p.expiresAt && new Date(p.expiresAt as unknown as string) < new Date();
              const exhausted = p.maxUses != null && p.usedCount >= p.maxUses;
              const inactive = !p.isActive || expired || exhausted;
              return (
                <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-gray-900">{p.code}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                        {typeLabel[p.type as PromoType] ?? p.type}
                        {p.type !== "free_delivery" && ` ${p.value}${p.type === "percent" ? "%" : "฿"}`}
                      </span>
                      {p.firstOrderOnly && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          ลูกค้าใหม่
                        </span>
                      )}
                      {inactive && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {expired ? "หมดอายุ" : exhausted ? "ใช้ครบแล้ว" : "ปิด"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {p.description ?? "—"}
                      {p.minOrderAmount > 0 && ` · ขั้นต่ำ ฿${p.minOrderAmount}`}
                      {p.maxUses != null && ` · ใช้ ${p.usedCount}/${p.maxUses}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle.mutate({ id: p.id, isActive: !p.isActive })}
                    disabled={toggle.isPending}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      p.isActive
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    {p.isActive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                    {p.isActive ? "เปิด" : "ปิด"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
