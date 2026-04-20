"use client";

import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Copy,
  Flame,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Tag,
  Trash2,
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  fixed_amount: "ลดคงที่ (฿)",
  percent: "ลดเปอร์เซ็นต์ (%)",
  free_delivery: "จัดส่งฟรี",
};

const DELIVERY_KEYS = {
  baseFee: "delivery_base_fee",
  perKmRate: "delivery_per_km_rate",
  minFee: "delivery_min_fee",
  maxFee: "delivery_max_fee",
} as const;

const DELIVERY_DEFAULTS = {
  baseFee: 15,
  perKmRate: 8,
  minFee: 20,
  maxFee: 80,
};

const DELIVERY_PRESETS = [
  { label: "มาตรฐาน", values: { baseFee: 15, perKmRate: 8, minFee: 20, maxFee: 80 } },
  { label: "ประหยัด", values: { baseFee: 10, perKmRate: 6, minFee: 15, maxFee: 60 } },
  { label: "เร่งด่วน", values: { baseFee: 20, perKmRate: 10, minFee: 25, maxFee: 120 } },
];

type PromoCode = {
  id: number;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | Date | null;
  isActive: boolean;
  description?: string | null;
  createdAt?: string | Date | null;
};

type PromoFilter = "all" | "active" | "inactive" | "expired" | "used_out";

function parseSettingNumber(raw: unknown, fallback: number) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function formatThaiDate(value: string | Date | null | undefined) {
  if (!value) return "ไม่มีวันหมด";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ไม่มีวันหมด";
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function calcDeliveryFee(distanceKm: number, baseFee: number, perKmRate: number, minFee: number, maxFee: number) {
  const raw = baseFee + distanceKm * perKmRate;
  return Math.max(minFee, Math.min(maxFee, Math.round(raw)));
}

function getPromoState(promo: PromoCode, now = new Date()) {
  const expired = Boolean(promo.expiresAt && new Date(promo.expiresAt) < now);
  const usedOut = promo.maxUses !== null && promo.usedCount >= promo.maxUses;
  const active = promo.isActive && !expired && !usedOut;

  if (active) {
    return { key: "active", label: "เปิดใช้งาน", className: "bg-green-100 text-green-700" };
  }
  if (!promo.isActive) {
    return { key: "inactive", label: "ปิดใช้งาน", className: "bg-gray-100 text-gray-600" };
  }
  if (expired) {
    return { key: "expired", label: "หมดอายุ", className: "bg-amber-100 text-amber-700" };
  }
  if (usedOut) {
    return { key: "used_out", label: "ใช้ครบสิทธิ์", className: "bg-blue-100 text-blue-700" };
  }
  return { key: "all", label: "ไม่ทราบสถานะ", className: "bg-gray-100 text-gray-600" };
}

function DeliverySettings() {
  const utils = trpc.useUtils();
  const { data: settingsRaw, isLoading } = trpc.admin.getSettings.useQuery();
  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: async () => {
      await utils.admin.getSettings.invalidate();
      setNotice({ type: "success", message: "บันทึกค่าส่งสำเร็จแล้ว" });
      setTimeout(() => setNotice(null), 2600);
    },
    onError: (e) => {
      setNotice({ type: "error", message: e.message || "บันทึกไม่สำเร็จ" });
    },
  });

  const settings = useMemo(() => (settingsRaw || {}) as Record<string, string>, [settingsRaw]);

  const [draft, setDraft] = useState<{
    baseFee: string;
    perKmRate: string;
    minFee: string;
    maxFee: string;
  } | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const initialParsed = useMemo(
    () => ({
      baseFee: parseSettingNumber(settings[DELIVERY_KEYS.baseFee], DELIVERY_DEFAULTS.baseFee),
      perKmRate: parseSettingNumber(settings[DELIVERY_KEYS.perKmRate], DELIVERY_DEFAULTS.perKmRate),
      minFee: parseSettingNumber(settings[DELIVERY_KEYS.minFee], DELIVERY_DEFAULTS.minFee),
      maxFee: parseSettingNumber(settings[DELIVERY_KEYS.maxFee], DELIVERY_DEFAULTS.maxFee),
    }),
    [settings],
  );

  const effectiveDraft = draft || {
    baseFee: String(initialParsed.baseFee),
    perKmRate: String(initialParsed.perKmRate),
    minFee: String(initialParsed.minFee),
    maxFee: String(initialParsed.maxFee),
  };

  const parsed = useMemo(
    () => ({
      baseFee: parseSettingNumber(effectiveDraft.baseFee, DELIVERY_DEFAULTS.baseFee),
      perKmRate: parseSettingNumber(effectiveDraft.perKmRate, DELIVERY_DEFAULTS.perKmRate),
      minFee: parseSettingNumber(effectiveDraft.minFee, DELIVERY_DEFAULTS.minFee),
      maxFee: parseSettingNumber(effectiveDraft.maxFee, DELIVERY_DEFAULTS.maxFee),
    }),
    [effectiveDraft.baseFee, effectiveDraft.maxFee, effectiveDraft.minFee, effectiveDraft.perKmRate],
  );

  const validationMessage = useMemo(() => {
    if (parsed.maxFee < parsed.minFee) return "ค่าส่งสูงสุดต้องมากกว่าหรือเท่ากับค่าส่งขั้นต่ำ";
    if (parsed.perKmRate === 0 && parsed.baseFee === 0) return "ควรกำหนดค่าส่งพื้นฐานอย่างน้อย 1 ค่า";
    return "";
  }, [parsed.baseFee, parsed.maxFee, parsed.minFee, parsed.perKmRate]);

  const dirty = useMemo(
    () =>
      parsed.baseFee !== initialParsed.baseFee ||
      parsed.perKmRate !== initialParsed.perKmRate ||
      parsed.minFee !== initialParsed.minFee ||
      parsed.maxFee !== initialParsed.maxFee,
    [initialParsed.baseFee, initialParsed.maxFee, initialParsed.minFee, initialParsed.perKmRate, parsed.baseFee, parsed.maxFee, parsed.minFee, parsed.perKmRate],
  );

  const previewRows = useMemo(() => {
    return [1, 3, 5, 8, 10, 15].map((distance) => ({
      distance,
      fee: calcDeliveryFee(distance, parsed.baseFee, parsed.perKmRate, parsed.minFee, parsed.maxFee),
    }));
  }, [parsed.baseFee, parsed.maxFee, parsed.minFee, parsed.perKmRate]);

  const applyPreset = (values: typeof DELIVERY_DEFAULTS) => {
    setDraft({
      baseFee: String(values.baseFee),
      perKmRate: String(values.perKmRate),
      minFee: String(values.minFee),
      maxFee: String(values.maxFee),
    });
    setNotice(null);
  };

  const resetDefault = () => applyPreset(DELIVERY_DEFAULTS);

  const handleSave = async () => {
    if (validationMessage) {
      setNotice({ type: "error", message: validationMessage });
      return;
    }

    await updateSettings.mutateAsync({
      [DELIVERY_KEYS.baseFee]: String(parsed.baseFee),
      [DELIVERY_KEYS.perKmRate]: String(parsed.perKmRate),
      [DELIVERY_KEYS.minFee]: String(parsed.minFee),
      [DELIVERY_KEYS.maxFee]: String(parsed.maxFee),
    });
    setDraft(null);
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-orange-500" />
            นโยบายค่าส่งมาตรฐานระบบ
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            สูตรค่าส่ง = ค่าพื้นฐาน + (ระยะทาง × บาท/กม.) และจะถูกบังคับให้อยู่ระหว่างขั้นต่ำ-สูงสุด
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {DELIVERY_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.values)}
              className="px-3 py-1.5 rounded-lg border border-orange-200 text-orange-600 text-xs font-semibold hover:bg-orange-50 transition-colors"
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={resetDefault}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            ค่าแนะนำ
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`mb-4 rounded-xl px-3 py-2 text-sm ${
            notice.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {[
          { key: "baseFee", label: "ค่าส่งพื้นฐาน (฿)" },
          { key: "perKmRate", label: "อัตราต่อ กม. (฿)" },
          { key: "minFee", label: "ขั้นต่ำ (฿)" },
          { key: "maxFee", label: "สูงสุด (฿)" },
        ].map(({ key, label }) => (
          <label key={label} className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={effectiveDraft[key as keyof typeof effectiveDraft]}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...(prev || effectiveDraft),
                  [key]: e.target.value,
                }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </label>
        ))}
      </div>

      {validationMessage && (
        <div className="mb-4 rounded-xl px-3 py-2 text-sm bg-amber-50 text-amber-700 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {validationMessage}
        </div>
      )}

      <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div className="text-xs font-semibold text-gray-600 mb-2">ตัวอย่างค่าส่งตามระยะทาง</div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {previewRows.map((row) => (
            <div key={row.distance} className="rounded-lg bg-white border border-gray-200 px-2.5 py-2 text-center">
              <div className="text-[11px] text-gray-500">{row.distance} กม.</div>
              <div className="text-sm font-semibold text-gray-900">฿{row.fee}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={isLoading || updateSettings.isPending || !dirty || Boolean(validationMessage)}
          className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 inline-flex items-center gap-2 transition-colors"
        >
          {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {updateSettings.isPending ? "กำลังบันทึก..." : "บันทึกนโยบายค่าส่ง"}
        </button>
        {!dirty && !updateSettings.isPending && (
          <span className="text-xs text-gray-400">ข้อมูลล่าสุดตรงกับที่บันทึกแล้ว</span>
        )}
      </div>
    </section>
  );
}

function PromoSection() {
  const utils = trpc.useUtils();
  const { data: promosRaw = [], isLoading } = trpc.admin.listPromoCodes.useQuery();
  const createPromo = trpc.admin.createPromoCode.useMutation({
    onSuccess: async () => {
      await utils.admin.listPromoCodes.invalidate();
      setShowForm(false);
      resetForm();
      setNotice({ type: "success", message: "สร้างโค้ดส่วนลดเรียบร้อยแล้ว" });
      setTimeout(() => setNotice(null), 2500);
    },
    onError: (e) => {
      setNotice({ type: "error", message: e.message || "สร้างโค้ดไม่สำเร็จ" });
    },
  });
  const togglePromo = trpc.admin.togglePromoCode.useMutation({
    onSuccess: () => utils.admin.listPromoCodes.invalidate(),
    onError: (e) => setNotice({ type: "error", message: e.message || "เปลี่ยนสถานะไม่สำเร็จ" }),
  });
  const deletePromo = trpc.admin.deletePromoCode.useMutation({
    onSuccess: async () => {
      await utils.admin.listPromoCodes.invalidate();
      setDeleteTarget(null);
      setNotice({ type: "success", message: "ลบโค้ดส่วนลดสำเร็จ" });
      setTimeout(() => setNotice(null), 2500);
    },
    onError: (e) => setNotice({ type: "error", message: e.message || "ลบโค้ดไม่สำเร็จ" }),
  });

  const promos = promosRaw as PromoCode[];

  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"fixed_amount" | "percent" | "free_delivery">("fixed_amount");
  const [value, setValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PromoFilter>("all");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const resetForm = () => {
    setCode("");
    setType("fixed_amount");
    setValue("");
    setMinOrder("");
    setMaxUses("");
    setExpiresAt("");
    setDescription("");
  };

  const stats = useMemo(() => {
    const now = new Date();
    const active = promos.filter((p) => getPromoState(p, now).key === "active").length;
    const expired = promos.filter((p) => getPromoState(p, now).key === "expired").length;
    const usedOut = promos.filter((p) => getPromoState(p, now).key === "used_out").length;
    return { total: promos.length, active, expired, usedOut };
  }, [promos]);

  const filteredPromos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return promos.filter((promo) => {
      const state = getPromoState(promo);
      const matchedFilter = filter === "all" || state.key === filter;
      const matchedSearch =
        !q ||
        promo.code.toLowerCase().includes(q) ||
        (promo.description || "").toLowerCase().includes(q);
      return matchedFilter && matchedSearch;
    });
  }, [filter, promos, search]);

  const createValidation = useMemo(() => {
    if (!code.trim()) return "กรุณากรอกโค้ด";
    if (!/^[A-Z0-9_-]{2,32}$/.test(code.trim().toUpperCase())) return "โค้ดใช้ได้เฉพาะ A-Z, 0-9, _ และ -";
    const nValue = Number(value || 0);
    if (type !== "free_delivery") {
      if (!Number.isFinite(nValue) || nValue <= 0) return "มูลค่าต้องมากกว่า 0";
      if (type === "percent" && nValue > 100) return "ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100";
    }
    const nMinOrder = Number(minOrder || 0);
    if (!Number.isFinite(nMinOrder) || nMinOrder < 0) return "ยอดขั้นต่ำต้องเป็น 0 หรือมากกว่า";
    if (maxUses && (!Number.isFinite(Number(maxUses)) || Number(maxUses) < 1)) return "จำนวนสิทธิ์ต้องมากกว่า 0";
    if (expiresAt) {
      const dt = new Date(expiresAt);
      if (Number.isNaN(dt.getTime())) return "รูปแบบวันหมดอายุไม่ถูกต้อง";
    }
    return "";
  }, [code, expiresAt, maxUses, minOrder, type, value]);

  const handleCreate = () => {
    if (createValidation) {
      setNotice({ type: "error", message: createValidation });
      return;
    }

    createPromo.mutate({
      code: code.trim().toUpperCase(),
      type,
      value: type === "free_delivery" ? 0 : Number(value),
      minOrderAmount: Number(minOrder || 0),
      maxUses: maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      description: description.trim() || undefined,
    });
  };

  const copyCode = async (promoCode: string) => {
    try {
      await navigator.clipboard.writeText(promoCode);
      setNotice({ type: "success", message: `คัดลอกโค้ด ${promoCode} แล้ว` });
      setTimeout(() => setNotice(null), 1800);
    } catch {
      setNotice({ type: "error", message: "คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง" });
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-orange-500" />
            โปรโมชัน / โค้ดส่วนลด
          </h2>
          <p className="text-xs text-gray-500 mt-1">สร้างและควบคุมโค้ดส่วนลดที่ใช้งานในแอปลูกค้าแบบเรียลไทม์</p>
        </div>
        <button
          onClick={() => {
            setShowForm((prev) => !prev);
            setNotice(null);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "ปิดฟอร์มสร้างโค้ด" : "สร้างโค้ดใหม่"}
        </button>
      </div>

      {notice && (
        <div
          className={`mb-4 rounded-xl px-3 py-2 text-sm ${
            notice.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
          <div className="text-xs text-gray-500">โค้ดทั้งหมด</div>
          <div className="text-lg font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-2.5">
          <div className="text-xs text-green-600">เปิดใช้งาน</div>
          <div className="text-lg font-bold text-green-700">{stats.active}</div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
          <div className="text-xs text-amber-600">หมดอายุ</div>
          <div className="text-lg font-bold text-amber-700">{stats.expired}</div>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
          <div className="text-xs text-blue-600">ใช้ครบสิทธิ์</div>
          <div className="text-lg font-bold text-blue-700">{stats.usedOut}</div>
        </div>
      </div>

      {showForm && (
        <div className="border border-orange-100 bg-orange-50 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">เพิ่มโค้ดส่วนลดใหม่</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <label>
              <span className="block text-xs font-medium text-gray-500 mb-1">โค้ด *</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SPARK50"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
            </label>
            <label>
              <span className="block text-xs font-medium text-gray-500 mb-1">ประเภท *</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "fixed_amount" | "percent" | "free_delivery")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="block text-xs font-medium text-gray-500 mb-1">
                มูลค่า {type === "percent" ? "(%)" : "(฿)"}
              </span>
              <input
                type="number"
                min="0"
                value={type === "free_delivery" ? "0" : value}
                disabled={type === "free_delivery"}
                onChange={(e) => setValue(e.target.value)}
                placeholder="50"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white disabled:bg-gray-100"
              />
            </label>
            <label>
              <span className="block text-xs font-medium text-gray-500 mb-1">ยอดขั้นต่ำ (฿)</span>
              <input
                type="number"
                min="0"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
            </label>
            <label>
              <span className="block text-xs font-medium text-gray-500 mb-1">จำนวนสิทธิ์</span>
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="ไม่จำกัด"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
            </label>
            <label>
              <span className="block text-xs font-medium text-gray-500 mb-1">วันหมดอายุ</span>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
            </label>
          </div>

          <label className="block mb-3">
            <span className="block text-xs font-medium text-gray-500 mb-1">คำอธิบาย (ไม่บังคับ)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น ส่วนลดสำหรับผู้ใช้ใหม่"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            />
          </label>

          {createValidation && (
            <div className="mb-3 rounded-lg bg-red-50 text-red-700 text-xs px-3 py-2 inline-flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {createValidation}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createPromo.isPending}
              className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {createPromo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {createPromo.isPending ? "กำลังสร้าง..." : "สร้างโค้ด"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 mb-4">
        <div className="flex flex-col md:flex-row gap-2">
          <label className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาโค้ดหรือคำอธิบาย..."
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: "all", label: "ทั้งหมด" },
              { key: "active", label: "เปิดใช้" },
              { key: "inactive", label: "ปิด" },
              { key: "expired", label: "หมดอายุ" },
              { key: "used_out", label: "ใช้ครบสิทธิ์" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as PromoFilter)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  filter === item.key
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 text-sm text-gray-400 text-center">กำลังโหลดโค้ดส่วนลด...</div>
      ) : filteredPromos.length === 0 ? (
        <div className="py-10 text-sm text-gray-400 text-center">ไม่พบโค้ดส่วนลดตามเงื่อนไขที่เลือก</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">โค้ด</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">ประเภท</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">มูลค่า</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">ยอดขั้นต่ำ</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">การใช้งาน</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">หมดอายุ</th>
                <th className="text-left pb-3 font-medium text-gray-500 text-xs">สถานะ</th>
                <th className="text-right pb-3 font-medium text-gray-500 text-xs">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredPromos.map((promo) => {
                const state = getPromoState(promo);
                const usagePercent =
                  promo.maxUses && promo.maxUses > 0
                    ? Math.min(100, Math.round((promo.usedCount / promo.maxUses) * 100))
                    : null;

                return (
                  <tr key={promo.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-gray-900 text-xs">{promo.code}</span>
                        <button
                          onClick={() => copyCode(promo.code)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                          title="คัดลอกโค้ด"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {promo.description && (
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{promo.description}</div>
                      )}
                    </td>
                    <td className="py-3 text-gray-600 text-xs">{TYPE_LABELS[promo.type] ?? promo.type}</td>
                    <td className="py-3 text-gray-800 text-xs">
                      {promo.type === "free_delivery"
                        ? "ส่งฟรี"
                        : promo.type === "percent"
                          ? `${promo.value}%`
                          : `฿${promo.value}`}
                    </td>
                    <td className="py-3 text-gray-500 text-xs">฿{promo.minOrderAmount}</td>
                    <td className="py-3 text-gray-500 text-xs min-w-[130px]">
                      <div>
                        {promo.usedCount}
                        {promo.maxUses ? ` / ${promo.maxUses}` : " / ไม่จำกัด"}
                      </div>
                      {usagePercent !== null && (
                        <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400" style={{ width: `${usagePercent}%` }} />
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-gray-400 text-xs">{formatThaiDate(promo.expiresAt)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${state.className}`}>
                        {state.label}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => togglePromo.mutate({ id: promo.id, isActive: !promo.isActive })}
                          disabled={togglePromo.isPending}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                            promo.isActive
                              ? "border-green-200 text-green-700 hover:bg-green-50"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                          title={promo.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                        >
                          {promo.isActive ? "ปิดใช้" : "เปิดใช้"}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(promo)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบโค้ด"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-1">ยืนยันการลบโค้ด</h3>
            <p className="text-sm text-gray-500 mb-4">
              ต้องการลบโค้ด <span className="font-mono font-semibold text-gray-800">{deleteTarget.code}</span> ใช่หรือไม่
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => deletePromo.mutate({ id: deleteTarget.id })}
                disabled={deletePromo.isPending}
                className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {deletePromo.isPending ? "กำลังลบ..." : "ยืนยันลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SystemOperationsCard() {
  const approvalQuery = trpc.admin.listPendingApprovals.useQuery(undefined, { refetchInterval: 15000 });
  const ordersQuery = trpc.admin.listOrders.useQuery({ limit: 200 }, { refetchInterval: 15000 });

  const pendingApprovals = approvalQuery.data?.length || 0;
  const allOrders = (ordersQuery.data || []) as Array<{ status?: string }>;
  const pendingOrders = allOrders.filter((order) => order.status === "pending").length;
  const preparingOrders = allOrders.filter((order) => order.status === "preparing" || order.status === "confirmed").length;

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <ShieldCheck className="w-4 h-4 text-orange-500" />
        ภาพรวมงานที่ต้องจัดการ
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-red-100 bg-red-50 p-3">
          <div className="text-xs text-red-600">คำขอรออนุมัติ</div>
          <div className="text-xl font-bold text-red-700">{pendingApprovals}</div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
          <div className="text-xs text-amber-600">ออเดอร์รอยืนยัน</div>
          <div className="text-xl font-bold text-amber-700">{pendingOrders}</div>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
          <div className="text-xs text-blue-600">ออเดอร์กำลังทำ</div>
          <div className="text-xl font-bold text-blue-700">{preparingOrders}</div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3 inline-flex items-center gap-1.5">
        <Flame className="w-3.5 h-3.5" />
        ข้อมูลรีเฟรชอัตโนมัติทุก 15 วินาที
      </p>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าระบบ</h1>
        <p className="text-sm text-gray-400 mt-1">
          ศูนย์กลางจัดการนโยบายค่าส่ง โค้ดส่วนลด และงานควบคุมรายวันของแอดมิน
        </p>
      </div>

      <SystemOperationsCard />
      <DeliverySettings />
      <PromoSection />
    </div>
  );
}
