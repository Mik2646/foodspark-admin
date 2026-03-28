"use client";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Settings, Plus, Trash2, ToggleLeft, ToggleRight, Tag } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  fixed_amount: "ลดคงที่ (฿)",
  percent: "ลดเปอร์เซ็นต์ (%)",
  free_delivery: "จัดส่งฟรี",
};

function DeliverySettings() {
  const utils = trpc.useUtils();
  const { data: settings } = trpc.admin.getSettings.useQuery();
  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: () => utils.admin.getSettings.invalidate(),
  });

  const [baseFee, setBaseFee] = useState("");
  const [perKm, setPerKm] = useState("");
  const [minFee, setMinFee] = useState("");
  const [maxFee, setMaxFee] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setBaseFee(settings.baseFee?.toString() ?? "0");
      setPerKm(settings.perKmRate?.toString() ?? "0");
      setMinFee(settings.minFee?.toString() ?? "0");
      setMaxFee(settings.maxFee?.toString() ?? "0");
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      baseFee: Number(baseFee),
      perKmRate: Number(perKm),
      minFee: Number(minFee),
      maxFee: Number(maxFee),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
      <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Settings className="w-4 h-4 text-orange-500" />
        ตั้งค่าค่าส่ง
      </h2>
      <p className="text-xs text-gray-400 mb-4">ค่าส่ง = ค่าส่งขั้นต้น + (ระยะทาง × อัตราต่อกม.) โดยอยู่ระหว่าง min–max</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {[
          { label: "ค่าส่งขั้นต้น (฿)", value: baseFee, set: setBaseFee },
          { label: "อัตราต่อกม. (฿/km)", value: perKm, set: setPerKm },
          { label: "ขั้นต่ำ (฿)", value: minFee, set: setMinFee },
          { label: "สูงสุด (฿)", value: maxFee, set: setMaxFee },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => set(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={updateSettings.isPending}
        className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {saved ? "บันทึกแล้ว!" : updateSettings.isPending ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
      </button>
    </div>
  );
}

function PromoSection() {
  const utils = trpc.useUtils();
  const { data: promos = [], isLoading } = trpc.admin.listPromoCodes.useQuery();
  const createPromo = trpc.admin.createPromoCode.useMutation({
    onSuccess: () => { utils.admin.listPromoCodes.invalidate(); setShowForm(false); resetForm(); },
  });
  const togglePromo = trpc.admin.togglePromoCode.useMutation({
    onSuccess: () => utils.admin.listPromoCodes.invalidate(),
  });
  const deletePromo = trpc.admin.deletePromoCode.useMutation({
    onSuccess: () => utils.admin.listPromoCodes.invalidate(),
  });

  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState("fixed_amount");
  const [value, setValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");

  const resetForm = () => { setCode(""); setType("fixed_amount"); setValue(""); setMinOrder(""); setMaxUses(""); setExpiresAt(""); setDescription(""); };

  const handleCreate = () => {
    if (!code.trim()) return;
    createPromo.mutate({
      code: code.trim().toUpperCase(),
      type,
      value: Number(value) || 0,
      minOrderAmount: Number(minOrder) || 0,
      maxUses: maxUses ? Number(maxUses) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
          <Tag className="w-4 h-4 text-orange-500" />
          โปรโมชัน / โค้ดส่วนลด
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          สร้างโค้ด
        </button>
      </div>

      {showForm && (
        <div className="border border-orange-100 bg-orange-50 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">โค้ดใหม่</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">โค้ด *</label>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SPARK50" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ประเภท *</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {type !== "free_delivery" && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">มูลค่า {type === "percent" ? "(%)" : "(฿)"}</label>
                <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} placeholder="50" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">ยอดขั้นต่ำ (฿)</label>
              <input type="number" min="0" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">จำนวนสิทธิ์</label>
              <input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="ไม่จำกัด" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">วันหมดอายุ</label>
              <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">คำอธิบาย</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="เช่น ส่วนลดสำหรับผู้ใช้ใหม่" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createPromo.isPending || !code.trim()} className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors">
              {createPromo.isPending ? "กำลังสร้าง..." : "สร้างโค้ด"}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-gray-400 text-sm">กำลังโหลด...</p>}

      {!isLoading && promos.length === 0 && !showForm && (
        <p className="text-gray-400 text-sm text-center py-6">ยังไม่มีโปรโมชัน</p>
      )}

      {promos.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">โค้ด</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">ประเภท</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">มูลค่า</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">ยอดขั้นต่ำ</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">ใช้แล้ว</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">หมดอายุ</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">สถานะ</th>
                <th className="text-right pb-3 font-medium text-gray-500 text-xs">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 font-mono font-semibold text-gray-900 text-xs">{p.code}</td>
                  <td className="py-3 text-gray-500 text-xs">{TYPE_LABELS[p.type] ?? p.type}</td>
                  <td className="py-3 text-gray-700 text-xs">
                    {p.type === "free_delivery" ? "—" : p.type === "percent" ? `${p.value}%` : `฿${p.value}`}
                  </td>
                  <td className="py-3 text-gray-500 text-xs">฿{p.minOrderAmount}</td>
                  <td className="py-3 text-gray-500 text-xs">{p.usedCount}{p.maxUses ? `/${p.maxUses}` : ""}</td>
                  <td className="py-3 text-gray-400 text-xs">
                    {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString("th-TH") : "ไม่มีวันหมด"}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.isActive ? "เปิดใช้" : "ปิด"}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => togglePromo.mutate(p.id)}
                        disabled={togglePromo.isPending}
                        className="text-gray-400 hover:text-orange-500 transition-colors"
                        title={p.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      >
                        {p.isActive
                          ? <ToggleRight className="w-5 h-5 text-green-500" />
                          : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                      </button>
                      <button
                        onClick={() => { if (confirm(`ลบโค้ด ${p.code}?`)) deletePromo.mutate(p.id); }}
                        disabled={deletePromo.isPending}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ตั้งค่าระบบ</h1>
      <DeliverySettings />
      <PromoSection />
    </div>
  );
}
