"use client";

import { trpc, getToken } from "@/lib/trpc";
import { uploadToR2 } from "@/lib/upload";
import { useEffect, useMemo, useState } from "react";
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
  Wrench,
  Clock,
  ImageIcon,
  Gift,
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

type PromoUsageRow = {
  promoId: number | null;
  code: string;
  description: string | null;
  type: string;
  value: number;
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | Date | null;
  ordersWithPromo: number;
  cancelledOrders: number;
  netOrders: number;
  discountGranted: number;
  discountReverted: number;
  netDiscount: number;
  gmvNet: number;
};

type PromoUsageReport = {
  days: number;
  since: string | Date;
  totals: {
    ordersWithPromo: number;
    cancelledOrders: number;
    netOrders: number;
    discountGranted: number;
    discountReverted: number;
    netDiscount: number;
    gmvNet: number;
  } | null;
  rows: PromoUsageRow[];
};

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
  const [usageDays, setUsageDays] = useState(30);
  const usageQuery = trpc.admin.promoUsageReport.useQuery(
    { days: usageDays },
    { refetchInterval: 30000 },
  );
  const createPromo = trpc.admin.createPromoCode.useMutation({
    onSuccess: async () => {
      await utils.admin.listPromoCodes.invalidate();
      await utils.admin.promoUsageReport.invalidate();
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
    onSuccess: async () => {
      await utils.admin.listPromoCodes.invalidate();
      await utils.admin.promoUsageReport.invalidate();
    },
    onError: (e) => setNotice({ type: "error", message: e.message || "เปลี่ยนสถานะไม่สำเร็จ" }),
  });
  const deletePromo = trpc.admin.deletePromoCode.useMutation({
    onSuccess: async () => {
      await utils.admin.listPromoCodes.invalidate();
      await utils.admin.promoUsageReport.invalidate();
      setDeleteTarget(null);
      setNotice({ type: "success", message: "ลบโค้ดส่วนลดสำเร็จ" });
      setTimeout(() => setNotice(null), 2500);
    },
    onError: (e) => setNotice({ type: "error", message: e.message || "ลบโค้ดไม่สำเร็จ" }),
  });

  const promos = promosRaw as PromoCode[];
  const promoUsage = (usageQuery.data as PromoUsageReport | undefined) ?? null;

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

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-blue-900">รายงานการใช้งานคูปองจริง</h3>
            <p className="text-xs text-blue-700 mt-0.5">
              แสดงยอดส่วนลดที่ใช้งานจริง และยอดที่ถูกคืนโควตาเมื่อออเดอร์ถูกยกเลิก
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {[7, 14, 30, 60].map((d) => (
              <button
                key={d}
                onClick={() => setUsageDays(d)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border ${
                  usageDays === d
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-blue-700 border-blue-200 hover:border-blue-400"
                }`}
              >
                {d} วัน
              </button>
            ))}
          </div>
        </div>

        {usageQuery.isLoading ? (
          <div className="text-xs text-blue-700">กำลังโหลดรายงาน...</div>
        ) : promoUsage?.totals ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <div className="rounded-lg bg-white border border-blue-100 px-3 py-2">
                <p className="text-[11px] text-gray-500">ออเดอร์ใช้คูปอง</p>
                <p className="text-sm font-bold text-gray-900">{promoUsage.totals.ordersWithPromo}</p>
              </div>
              <div className="rounded-lg bg-white border border-blue-100 px-3 py-2">
                <p className="text-[11px] text-gray-500">ออเดอร์ยกเลิก (คืนโควตา)</p>
                <p className="text-sm font-bold text-rose-600">{promoUsage.totals.cancelledOrders}</p>
              </div>
              <div className="rounded-lg bg-white border border-blue-100 px-3 py-2">
                <p className="text-[11px] text-gray-500">ส่วนลดที่ใช้จริงสุทธิ</p>
                <p className="text-sm font-bold text-orange-600">฿{promoUsage.totals.netDiscount.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-white border border-blue-100 px-3 py-2">
                <p className="text-[11px] text-gray-500">ยอดขายสุทธิที่ใช้คูปอง</p>
                <p className="text-sm font-bold text-green-700">฿{promoUsage.totals.gmvNet.toLocaleString()}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-blue-100 bg-white">
              <table className="w-full text-xs">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-blue-900">โค้ด</th>
                    <th className="text-right px-3 py-2 font-semibold text-blue-900">ใช้ทั้งหมด</th>
                    <th className="text-right px-3 py-2 font-semibold text-blue-900">ยกเลิก</th>
                    <th className="text-right px-3 py-2 font-semibold text-blue-900">ใช้จริง</th>
                    <th className="text-right px-3 py-2 font-semibold text-blue-900">ส่วนลดสุทธิ</th>
                    <th className="text-right px-3 py-2 font-semibold text-blue-900">ยอดขายสุทธิ</th>
                  </tr>
                </thead>
                <tbody>
                  {promoUsage.rows.slice(0, 12).map((row) => (
                    <tr key={`${row.promoId ?? "x"}-${row.code}`} className="border-t border-blue-50">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-gray-900">{row.code}</p>
                        {row.description && <p className="text-[11px] text-gray-400">{row.description}</p>}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">{row.ordersWithPromo}</td>
                      <td className="px-3 py-2 text-right text-rose-600">{row.cancelledOrders}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{row.netOrders}</td>
                      <td className="px-3 py-2 text-right font-semibold text-orange-600">฿{row.netDiscount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700">฿{row.gmvNet.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-xs text-blue-700">ยังไม่มีข้อมูลการใช้งานคูปองในช่วงเวลานี้</div>
        )}
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

/**
 * AppAvailability — controls when the customer-facing app accepts orders.
 *
 * Stores two keys in `system_settings`:
 *   - `app_operating_hours` JSON `{ enabled, openTime, closeTime, days }`
 *   - `maintenance_mode`    JSON `{ enabled, message }`
 *
 * Both are surfaced through `trpc.auth.getAppAvailability` which the LIFF
 * and native customer apps poll on home-screen mount. When the platform
 * is closed (outside hours or in maintenance) those apps render a full-
 * screen gate instead of the menu.
 */
function AppAvailabilityCard() {
  const utils = trpc.useUtils();
  const { data: settingsRaw } = trpc.admin.getSettings.useQuery();
  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: async () => {
      await utils.admin.getSettings.invalidate();
      setNotice({ type: "success", message: "บันทึกแล้ว" });
      setTimeout(() => setNotice(null), 2400);
    },
    onError: (e) => setNotice({ type: "error", message: e.message }),
  });
  const settings = (settingsRaw || {}) as Record<string, string>;

  // Operating hours — defaults to "always open" so a fresh install
  // doesn't accidentally gate customers out.
  const initialHours = useMemo(() => {
    try {
      if (settings.app_operating_hours) {
        const p = JSON.parse(settings.app_operating_hours);
        return {
          enabled: Boolean(p.enabled),
          openTime: typeof p.openTime === "string" ? p.openTime : "06:00",
          closeTime: typeof p.closeTime === "string" ? p.closeTime : "22:00",
          days: Array.isArray(p.days) ? p.days : [0, 1, 2, 3, 4, 5, 6],
        };
      }
    } catch { /* fall through */ }
    return { enabled: false, openTime: "06:00", closeTime: "22:00", days: [0, 1, 2, 3, 4, 5, 6] };
  }, [settings.app_operating_hours]);

  const initialMaintenance = useMemo(() => {
    try {
      if (settings.maintenance_mode) {
        const p = JSON.parse(settings.maintenance_mode);
        return {
          enabled: Boolean(p.enabled),
          message: typeof p.message === "string" ? p.message : "",
          imageUrl: typeof p.imageUrl === "string" ? p.imageUrl : "",
        };
      }
    } catch { /* fall through */ }
    return { enabled: false, message: "", imageUrl: "" };
  }, [settings.maintenance_mode]);

  const [hours, setHours] = useState(initialHours);
  const [maintenance, setMaintenance] = useState(initialMaintenance);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleMaintenanceImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const url = await uploadToR2(file, getToken());
      setMaintenance((m) => ({ ...m, imageUrl: url }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ";
      setNotice({ type: "error", message: `อัปโหลดรูป: ${msg}` });
    } finally {
      setUploadingImage(false);
    }
  };

  // Re-sync local form state when the upstream settings change.
  useEffect(() => { setHours(initialHours); }, [initialHours]);
  useEffect(() => { setMaintenance(initialMaintenance); }, [initialMaintenance]);

  const dayLabels = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  const toggleDay = (d: number) => {
    setHours((h) => ({
      ...h,
      days: h.days.includes(d) ? h.days.filter((x: number) => x !== d) : [...h.days, d].sort(),
    }));
  };

  const save = async () => {
    await updateSettings.mutateAsync({
      app_operating_hours: JSON.stringify(hours),
      maintenance_mode: JSON.stringify(maintenance),
    });
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">เวลาทำการระบบ + Maintenance Mode</h2>
        <p className="text-xs text-gray-400 mt-1">
          ควบคุมเวลาที่ลูกค้าสั่งอาหารผ่านแอปได้ และเปิดโหมดปิดปรับปรุงเมื่อจำเป็น
        </p>
      </div>

      {notice && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${notice.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {notice.message}
        </div>
      )}

      {/* Maintenance mode — highest priority, overrides hours */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-semibold text-amber-900 flex items-center gap-1.5">
              <Wrench size={16} />โหมดปิดปรับปรุง
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              เปิดเมื่อต้องการบล็อกการสั่งอาหารชั่วคราว เช่น ระบบล่ม หรือ deploy
            </p>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={maintenance.enabled}
              onChange={(e) => setMaintenance({ ...maintenance, enabled: e.target.checked })}
            />
            <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-amber-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-5 after:h-5 after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>
        <input
          type="text"
          value={maintenance.message}
          onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })}
          placeholder="ข้อความที่ลูกค้าเห็น (เช่น 'ระบบกำลังปรับปรุง จะกลับมาให้บริการ 22:00')"
          className="mt-3 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
        />

        {/* Image upload — admin can attach a poster that shows on the
            customer gate screen instead of (or alongside) the wrench
            animation. Useful for "Closed for Songkran" banners or
            partner-branded maintenance windows. */}
        <div className="mt-3">
          <p className="text-xs font-medium text-amber-900 mb-2">
            รูปประกาศ (optional) — แสดงบนหน้า maintenance ของลูกค้า
          </p>
          {maintenance.imageUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-amber-300 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={maintenance.imageUrl}
                alt="รูปประกาศ maintenance"
                className="w-full h-48 object-contain bg-amber-50"
              />
              <button
                type="button"
                onClick={() => setMaintenance({ ...maintenance, imageUrl: "" })}
                className="absolute top-2 right-2 rounded-full bg-white/95 border border-amber-200 shadow-sm w-7 h-7 flex items-center justify-center text-amber-700 hover:text-red-600"
                aria-label="ลบรูป"
              >
                ×
              </button>
            </div>
          ) : (
            <label
              className={`flex flex-col items-center justify-center gap-2 cursor-pointer rounded-lg border-2 border-dashed py-6 ${
                uploadingImage ? "border-amber-300 bg-amber-50 text-amber-400" : "border-amber-300 bg-white text-amber-700 hover:bg-amber-50"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploadingImage}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleMaintenanceImageUpload(f);
                  e.target.value = "";
                }}
              />
              <span className="text-2xl">📷</span>
              <span className="text-sm font-semibold">
                {uploadingImage ? "กำลังอัปโหลด…" : "แตะเพื่ออัปโหลดรูปประกาศ"}
              </span>
              <span className="text-xs text-amber-600">PNG / JPG · ≤ 5MB</span>
            </label>
          )}
        </div>
      </div>

      {/* Operating hours */}
      <div className="rounded-xl border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <p className="font-semibold text-gray-900 flex items-center gap-1.5">
              <Clock size={16} />เวลาเปิด-ปิดร้าน
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              นอกช่วงเวลานี้ลูกค้าจะเห็นหน้า "ระบบยังไม่เปิดบริการ" และสั่งไม่ได้
            </p>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={hours.enabled}
              onChange={(e) => setHours({ ...hours, enabled: e.target.checked })}
            />
            <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-orange-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-5 after:h-5 after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>

        <div className={hours.enabled ? "" : "opacity-50 pointer-events-none"}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-600">เปิดบริการตอน</label>
              <input
                type="time"
                value={hours.openTime}
                onChange={(e) => setHours({ ...hours, openTime: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">ปิดบริการตอน</label>
              <input
                type="time"
                value={hours.closeTime}
                onChange={(e) => setHours({ ...hours, closeTime: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">วันที่เปิดบริการ</label>
            <div className="flex gap-1.5 flex-wrap">
              {dayLabels.map((label, idx) => {
                const active = hours.days.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      active
                        ? "bg-orange-500 border-orange-500 text-white"
                        : "bg-white border-gray-200 text-gray-500"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={updateSettings.isPending}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-orange-500 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {updateSettings.isPending ? "กำลังบันทึก..." : "บันทึกค่าทั้ง 2"}
      </button>
    </section>
  );
}

/**
 * HomeCardsCard — admin uploads hero images for the two mode-selector
 * cards at the top of the customer home screen ("สั่งอาหาร" + "ช้อป
 * ตลาดนัด"). The customer apps pick the URLs up through
 * `trpc.auth.getHomeCards` and render them full-bleed.
 */
function HomeCardsCard() {
  const utils = trpc.useUtils();
  const { data: settingsRaw } = trpc.admin.getSettings.useQuery();
  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: async () => {
      await utils.admin.getSettings.invalidate();
      setNotice({ type: "success", message: "บันทึกแล้ว" });
      setTimeout(() => setNotice(null), 2400);
    },
    onError: (e) => setNotice({ type: "error", message: e.message }),
  });
  const settings = (settingsRaw || {}) as Record<string, string>;

  const [foodImage, setFoodImage] = useState<string>(settings.home_card_food_image ?? "");
  const [marketImage, setMarketImage] = useState<string>(settings.home_card_market_image ?? "");
  const [preorderImage, setPreorderImage] = useState<string>(
    settings.home_card_preorder_image ?? "",
  );
  const [transportImage, setTransportImage] = useState<string>(
    settings.home_card_transport_image ?? "",
  );
  const [inspectionImage, setInspectionImage] = useState<string>(
    settings.home_card_inspection_image ?? "",
  );
  const [uploadingFood, setUploadingFood] = useState(false);
  const [uploadingMarket, setUploadingMarket] = useState(false);
  const [uploadingPreorder, setUploadingPreorder] = useState(false);
  const [uploadingTransport, setUploadingTransport] = useState(false);
  const [uploadingInspection, setUploadingInspection] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setFoodImage(settings.home_card_food_image ?? "");
    setMarketImage(settings.home_card_market_image ?? "");
    setPreorderImage(settings.home_card_preorder_image ?? "");
    setTransportImage(settings.home_card_transport_image ?? "");
    setInspectionImage(settings.home_card_inspection_image ?? "");
  }, [
    settings.home_card_food_image,
    settings.home_card_market_image,
    settings.home_card_preorder_image,
    settings.home_card_transport_image,
    settings.home_card_inspection_image,
  ]);

  type SlotKey = "food" | "market" | "preorder" | "transport" | "inspection";

  const handleUpload = async (file: File, target: SlotKey) => {
    const setUploading = {
      food: setUploadingFood,
      market: setUploadingMarket,
      preorder: setUploadingPreorder,
      transport: setUploadingTransport,
      inspection: setUploadingInspection,
    }[target];
    const setImage = {
      food: setFoodImage,
      market: setMarketImage,
      preorder: setPreorderImage,
      transport: setTransportImage,
      inspection: setInspectionImage,
    }[target];
    setUploading(true);
    try {
      const url = await uploadToR2(file, getToken());
      setImage(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ";
      setNotice({ type: "error", message: msg });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    await updateSettings.mutateAsync({
      home_card_food_image: foodImage,
      home_card_market_image: marketImage,
      home_card_preorder_image: preorderImage,
      home_card_transport_image: transportImage,
      home_card_inspection_image: inspectionImage,
    });
  };

  const Slot = ({
    title,
    description,
    imageUrl,
    onUpload,
    onClear,
    uploading,
    aspectClass,
    aspectLabel,
  }: {
    title: string;
    description: string;
    imageUrl: string;
    onUpload: (file: File) => void;
    onClear: () => void;
    uploading: boolean;
    /** Tailwind aspect-ratio class for both the preview and the
     *  upload dropzone — matches the actual card shape on /liff/home
     *  so the admin sees what the customer will see. */
    aspectClass: string;
    /** Human-readable aspect hint, e.g. "1:1", "5:6", "5:1". */
    aspectLabel: string;
  }) => (
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5 mb-3">{description}</p>
      {imageUrl ? (
        <div className={`relative ${aspectClass} rounded-xl overflow-hidden border border-gray-200 bg-gray-50`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 rounded-full bg-white/95 border border-gray-200 shadow-sm w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-600"
            aria-label="ลบรูป"
          >
            ×
          </button>
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed ${aspectClass} ${
            uploading ? "border-orange-300 bg-orange-50 text-orange-400" : "border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
          <ImageIcon className="w-8 h-8" />
          <span className="text-sm font-semibold">
            {uploading ? "กำลังอัปโหลด…" : "อัปโหลดรูป"}
          </span>
          <span className="text-xs text-gray-400">PNG / JPG · {aspectLabel}</span>
        </label>
      )}
    </div>
  );

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">การ์ดหน้าแรกของลูกค้า</h2>
        <p className="text-xs text-gray-400 mt-1">
          อัปโหลดรูปพื้นหลังให้การ์ดแต่ละบริการบนหน้าแรก — แต่ละการ์ดมี
          อัตราส่วนต่างกัน (ดูป้ายใต้ช่องอัปโหลดของแต่ละอัน) ระบบจะวาง
          ไอคอน/ข้อความ/ปุ่มทับรูปอัตโนมัติพร้อม scrim ให้อ่านได้
          ปล่อยช่องว่างไว้ก็ได้ (ระบบจะใช้สี gradient เดิมแทน)
        </p>
      </div>

      {notice && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${notice.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {notice.message}
        </div>
      )}

      {/* Layout mirrors /liff/home: 1 hero row, 3-col medium row, 1
          wide row. Each Slot's aspect ratio matches the actual card so
          the admin sees exactly how the upload will be cropped. */}
      <div className="space-y-4">
        {/* Hero — same aspect-[1.55/1] as /liff/home HomeHeroCard. */}
        <Slot
          title="สั่งอาหาร"
          description="การ์ด hero ใหญ่สุด — เดลิเวอรีปกติ"
          imageUrl={foodImage}
          onUpload={(f) => void handleUpload(f, "food")}
          onClear={() => setFoodImage("")}
          uploading={uploadingFood}
          aspectClass="aspect-[1.55/1]"
          aspectLabel="แนวนอน 1.55 : 1 (เช่น 1550 × 1000 px)"
        />

        {/* 3-col medium row — aspect-[5/6] portrait each. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Slot
            title="พรีออเดอร์"
            description="แถวกลาง คอลัมน์ซ้าย — สั่งวันนี้ส่งพรุ่งนี้"
            imageUrl={preorderImage}
            onUpload={(f) => void handleUpload(f, "preorder")}
            onClear={() => setPreorderImage("")}
            uploading={uploadingPreorder}
            aspectClass="aspect-[5/6]"
            aspectLabel="แนวตั้ง 5 : 6 (เช่น 1000 × 1200 px)"
          />
          <Slot
            title="ช้อปตลาดนัด"
            description="แถวกลาง คอลัมน์กลาง — ร้านในตลาดนัด"
            imageUrl={marketImage}
            onUpload={(f) => void handleUpload(f, "market")}
            onClear={() => setMarketImage("")}
            uploading={uploadingMarket}
            aspectClass="aspect-[5/6]"
            aspectLabel="แนวตั้ง 5 : 6 (เช่น 1000 × 1200 px)"
          />
          <Slot
            title="บริการรับส่ง"
            description="แถวกลาง คอลัมน์ขวา — ส่งของ/เรียกรถ"
            imageUrl={transportImage}
            onUpload={(f) => void handleUpload(f, "transport")}
            onClear={() => setTransportImage("")}
            uploading={uploadingTransport}
            aspectClass="aspect-[5/6]"
            aspectLabel="แนวตั้ง 5 : 6 (เช่น 1000 × 1200 px)"
          />
        </div>

        {/* Wide pill — bottom of /liff/home, very landscape. */}
        <Slot
          title="ตรวจสภาพ-พรบ."
          description="แถบยาวสีม่วง — บริการนำรถไปตรวจสภาพ"
          imageUrl={inspectionImage}
          onUpload={(f) => void handleUpload(f, "inspection")}
          onClear={() => setInspectionImage("")}
          uploading={uploadingInspection}
          aspectClass="aspect-[4/1]"
          aspectLabel="แนวนอน 4 : 1 (เช่น 1600 × 400 px)"
        />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={updateSettings.isPending}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-orange-500 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {updateSettings.isPending ? "กำลังบันทึก..." : "บันทึกรูปการ์ด"}
      </button>
    </section>
  );
}

/**
 * HomePromoBannerCard — admin-controlled marketing strip that sits
 * below the service cards on /liff/home. Toggle on/off + fully
 * editable copy and link. Off by default; staying off hides the
 * banner from customers entirely.
 *
 * Persists 5 keys in systemSettings:
 *   home_promo_banner_enabled  ("true" | "false")
 *   home_promo_banner_title
 *   home_promo_banner_subtitle
 *   home_promo_banner_cta
 *   home_promo_banner_href
 */
function HomePromoBannerCard() {
  const utils = trpc.useUtils();
  const { data: settingsRaw } = trpc.admin.getSettings.useQuery();
  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: async () => {
      await utils.admin.getSettings.invalidate();
      setNotice({ type: "success", message: "บันทึกแล้ว" });
      setTimeout(() => setNotice(null), 2400);
    },
    onError: (e) => setNotice({ type: "error", message: e.message }),
  });
  const settings = (settingsRaw || {}) as Record<string, string>;

  const [enabled, setEnabled] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [subtitle, setSubtitle] = useState<string>("");
  const [ctaLabel, setCtaLabel] = useState<string>("");
  const [href, setHref] = useState<string>("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setEnabled(settings.home_promo_banner_enabled === "true");
    setTitle(settings.home_promo_banner_title ?? "");
    setSubtitle(settings.home_promo_banner_subtitle ?? "");
    setCtaLabel(settings.home_promo_banner_cta ?? "");
    setHref(settings.home_promo_banner_href ?? "");
  }, [
    settings.home_promo_banner_enabled,
    settings.home_promo_banner_title,
    settings.home_promo_banner_subtitle,
    settings.home_promo_banner_cta,
    settings.home_promo_banner_href,
  ]);

  const save = async () => {
    await updateSettings.mutateAsync({
      home_promo_banner_enabled: enabled ? "true" : "false",
      home_promo_banner_title: title.trim(),
      home_promo_banner_subtitle: subtitle.trim(),
      home_promo_banner_cta: ctaLabel.trim(),
      home_promo_banner_href: href.trim(),
    });
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
          <Gift className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900">ป้ายโปรโมชั่นหน้าแรก</h2>
          <p className="text-xs text-gray-400 mt-1">
            แถบโปรโมชั่นด้านล่างการ์ดบริการบนหน้าแรก — เปิด/ปิดได้ทุกเมื่อ
            ลูกค้ากดแล้วระบบจะพาไปยังลิงก์ที่ตั้งไว้
          </p>
        </div>
      </div>

      {notice && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${notice.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {notice.message}
        </div>
      )}

      <label className="flex items-center gap-3 mb-4 cursor-pointer">
        <span className="relative inline-flex items-center">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <span className="w-11 h-6 bg-gray-200 peer-checked:bg-orange-500 rounded-full transition-colors" />
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {enabled ? "เปิดแสดงบนหน้าแรก" : "ปิดอยู่ (ลูกค้าไม่เห็นแบนเนอร์)"}
          </p>
          <p className="text-xs text-gray-400">
            ถ้าปิดอยู่ ระบบจะไม่แสดงแบนเนอร์เลย แม้จะใส่ข้อความไว้แล้ว
          </p>
        </div>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">หัวข้อ</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น โปรโมชั่นสุดพิเศษ!"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">คำโปรย</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="เช่น ส่วนลดมากมาย รอคุณอยู่"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">ข้อความปุ่ม CTA</label>
          <input
            type="text"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder="เช่น ดูทั้งหมด"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">ลิงก์ปลายทาง</label>
          <input
            type="text"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="เช่น /liff/food หรือ /liff/preorder"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            ใส่ path ภายในแอป เช่น /liff/food, /liff/preorder, /liff/market
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={updateSettings.isPending}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-orange-500 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {updateSettings.isPending ? "กำลังบันทึก..." : "บันทึกแบนเนอร์"}
      </button>
    </section>
  );
}

/**
 * TransportPricingCard — formulas behind the บริการรับส่ง fare quotes.
 * The backend's transport.estimateFare + transport.create both read
 * these keys at runtime, so saving here is enough to re-price ride
 * + shopping services without a deploy.
 */
function TransportPricingCard() {
  const utils = trpc.useUtils();
  const { data: settingsRaw } = trpc.admin.getSettings.useQuery();
  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: async () => {
      await utils.admin.getSettings.invalidate();
      setNotice({ type: "success", message: "บันทึกแล้ว" });
      setTimeout(() => setNotice(null), 2400);
    },
    onError: (e) => setNotice({ type: "error", message: e.message }),
  });
  const s = (settingsRaw || {}) as Record<string, string>;

  const [enabled, setEnabled] = useState<boolean>(true);
  const [rideBase, setRideBase] = useState("30");
  const [ridePerKm, setRidePerKm] = useState("10");
  const [rideMin, setRideMin] = useState("40");
  const [rideMax, setRideMax] = useState("300");
  const [shopBase, setShopBase] = useState("30");
  const [shopPerKm, setShopPerKm] = useState("8");
  const [shopServicePct, setShopServicePct] = useState("10");
  const [shopMinService, setShopMinService] = useState("20");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setEnabled(s.transport_enabled !== "false");
    setRideBase(s.transport_ride_base_fee ?? "30");
    setRidePerKm(s.transport_ride_per_km ?? "10");
    setRideMin(s.transport_ride_min_fare ?? "40");
    setRideMax(s.transport_ride_max_fare ?? "300");
    setShopBase(s.transport_shopping_base_fee ?? "30");
    setShopPerKm(s.transport_shopping_per_km ?? "8");
    setShopServicePct(s.transport_shopping_service_pct ?? "10");
    setShopMinService(s.transport_shopping_min_service_fee ?? "20");
  }, [
    s.transport_enabled,
    s.transport_ride_base_fee, s.transport_ride_per_km,
    s.transport_ride_min_fare, s.transport_ride_max_fare,
    s.transport_shopping_base_fee, s.transport_shopping_per_km,
    s.transport_shopping_service_pct, s.transport_shopping_min_service_fee,
  ]);

  const save = async () => {
    await updateSettings.mutateAsync({
      transport_enabled: enabled ? "true" : "false",
      transport_ride_base_fee: rideBase.trim() || "0",
      transport_ride_per_km: ridePerKm.trim() || "0",
      transport_ride_min_fare: rideMin.trim() || "0",
      transport_ride_max_fare: rideMax.trim() || "0",
      transport_shopping_base_fee: shopBase.trim() || "0",
      transport_shopping_per_km: shopPerKm.trim() || "0",
      transport_shopping_service_pct: shopServicePct.trim() || "0",
      transport_shopping_min_service_fee: shopMinService.trim() || "0",
    });
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
          <Wrench className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900">ราคาบริการรับส่ง</h2>
          <p className="text-xs text-gray-400 mt-1">
            สูตรคิดราคาบริการ "ส่งคน" และ "ซื้อของแทน" — แก้แล้วบันทึก
            ระบบจะใช้สูตรใหม่ทันทีไม่ต้อง deploy
          </p>
        </div>
      </div>

      {notice && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${notice.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {notice.message}
        </div>
      )}

      <label className="flex items-center gap-3 mb-5 cursor-pointer">
        <span className="relative inline-flex items-center">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <span className="w-11 h-6 bg-gray-200 peer-checked:bg-orange-500 rounded-full transition-colors" />
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {enabled ? "เปิดให้บริการรับส่ง" : "ปิดบริการ (ลูกค้าจะกดสั่งไม่ได้)"}
          </p>
          <p className="text-xs text-gray-400">
            ปิดอยู่ — `transport.create` จะปฏิเสธคำสั่งซื้อ แต่ออเดอร์เดิมยังทำงานต่อ
          </p>
        </div>
      </label>

      {/* Ride */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 mb-3">
        <h3 className="text-sm font-bold text-blue-900 mb-3">บริการส่งคน</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumField label="ค่าเริ่มต้น (฿)" value={rideBase} onChange={setRideBase} />
          <NumField label="ค่าระยะ (฿/กม.)" value={ridePerKm} onChange={setRidePerKm} />
          <NumField label="ค่าต่ำสุด (฿)" value={rideMin} onChange={setRideMin} />
          <NumField label="ค่าสูงสุด (฿)" value={rideMax} onChange={setRideMax} />
        </div>
        <p className="mt-2 text-[11px] text-blue-700">
          สูตร: clamp[min, max] ของ (ค่าเริ่มต้น + ค่าระยะ × ระยะทาง)
        </p>
      </div>

      {/* Shopping */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
        <h3 className="text-sm font-bold text-emerald-900 mb-3">บริการซื้อของแทน</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumField label="ค่าเริ่มต้น (฿)" value={shopBase} onChange={setShopBase} />
          <NumField label="ค่าระยะ (฿/กม.)" value={shopPerKm} onChange={setShopPerKm} />
          <NumField label="ค่าบริการ (%)" value={shopServicePct} onChange={setShopServicePct} />
          <NumField label="ค่าบริการขั้นต่ำ (฿)" value={shopMinService} onChange={setShopMinService} />
        </div>
        <p className="mt-2 text-[11px] text-emerald-700">
          สูตร: ค่าเริ่มต้น + ค่าระยะ × ระยะทาง + max(ขั้นต่ำ, งบ × %)
        </p>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={updateSettings.isPending}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-orange-500 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {updateSettings.isPending ? "กำลังบันทึก..." : "บันทึกสูตรราคา"}
      </button>
    </section>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
      />
    </div>
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
      <AppAvailabilityCard />
      <HomeCardsCard />
      <HomePromoBannerCard />
      <DeliverySettings />
      <TransportPricingCard />
      <InspectionPricingCard />
      <PromoSection />
    </div>
  );
}

/**
 * InspectionPricingCard — formulas behind the ตรวจสภาพ-พรบ. service.
 * Sets FoodSpark labor (base + per-extra service) + per-service
 * government fee estimates (per vehicle type) used by the booking
 * preview. Final govt fees are entered by admin at completion time.
 */
function InspectionPricingCard() {
  const utils = trpc.useUtils();
  const { data: settingsRaw } = trpc.admin.getSettings.useQuery();
  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: async () => {
      await utils.admin.getSettings.invalidate();
      setNotice({ type: "success", message: "บันทึกแล้ว" });
      setTimeout(() => setNotice(null), 2400);
    },
    onError: (e) => setNotice({ type: "error", message: e.message }),
  });
  const s = (settingsRaw || {}) as Record<string, string>;

  const [enabled, setEnabled] = useState<boolean>(true);
  const [base, setBase] = useState("200");
  const [perExtra, setPerExtra] = useState("50");
  const [carInsp, setCarInsp] = useState("500");
  const [carCom, setCarCom] = useState("700");
  const [carTax, setCarTax] = useState("1000");
  const [mcInsp, setMcInsp] = useState("60");
  const [mcCom, setMcCom] = useState("400");
  const [mcTax, setMcTax] = useState("100");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setEnabled(s.inspection_enabled !== "false");
    setBase(s.inspection_base_service_fee ?? "200");
    setPerExtra(s.inspection_per_extra_service_fee ?? "50");
    setCarInsp(s.inspection_est_car_inspection ?? "500");
    setCarCom(s.inspection_est_car_compulsory ?? "700");
    setCarTax(s.inspection_est_car_tax ?? "1000");
    setMcInsp(s.inspection_est_motorcycle_inspection ?? "60");
    setMcCom(s.inspection_est_motorcycle_compulsory ?? "400");
    setMcTax(s.inspection_est_motorcycle_tax ?? "100");
  }, [
    s.inspection_enabled,
    s.inspection_base_service_fee, s.inspection_per_extra_service_fee,
    s.inspection_est_car_inspection, s.inspection_est_car_compulsory, s.inspection_est_car_tax,
    s.inspection_est_motorcycle_inspection, s.inspection_est_motorcycle_compulsory, s.inspection_est_motorcycle_tax,
  ]);

  const save = async () => {
    await updateSettings.mutateAsync({
      inspection_enabled: enabled ? "true" : "false",
      inspection_base_service_fee: base.trim() || "0",
      inspection_per_extra_service_fee: perExtra.trim() || "0",
      inspection_est_car_inspection: carInsp.trim() || "0",
      inspection_est_car_compulsory: carCom.trim() || "0",
      inspection_est_car_tax: carTax.trim() || "0",
      inspection_est_motorcycle_inspection: mcInsp.trim() || "0",
      inspection_est_motorcycle_compulsory: mcCom.trim() || "0",
      inspection_est_motorcycle_tax: mcTax.trim() || "0",
    });
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
          <Wrench className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900">ราคาบริการตรวจสภาพ-พรบ.</h2>
          <p className="text-xs text-gray-400 mt-1">
            สูตรคิดค่าบริการ FoodSpark + ประมาณการค่าราชการที่แสดงในหน้าจองให้ลูกค้า
            (ค่าจริงกรอกตอนปิดออเดอร์)
          </p>
        </div>
      </div>

      {notice && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${notice.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {notice.message}
        </div>
      )}

      <label className="flex items-center gap-3 mb-5 cursor-pointer">
        <span className="relative inline-flex items-center">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <span className="w-11 h-6 bg-gray-200 peer-checked:bg-violet-600 rounded-full transition-colors" />
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {enabled ? "เปิดให้บริการตรวจสภาพ-พรบ." : "ปิดบริการ (ลูกค้าจะกดสั่งไม่ได้)"}
          </p>
        </div>
      </label>

      <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4 mb-3">
        <h3 className="text-sm font-bold text-violet-900 mb-3">ค่าบริการ FoodSpark</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="ค่าบริการเริ่มต้น (฿)" value={base} onChange={setBase} />
          <NumField label="ค่าบริการเพิ่มต่อรายการ (฿)" value={perExtra} onChange={setPerExtra} />
        </div>
        <p className="mt-2 text-[11px] text-violet-700">
          สูตร: ฿เริ่มต้น + (จำนวนบริการ − 1) × ฿เพิ่ม
        </p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 mb-3">
        <h3 className="text-sm font-bold text-blue-900 mb-3">ค่าราชการประมาณ — รถยนต์</h3>
        <div className="grid grid-cols-3 gap-3">
          <NumField label="ตรวจสภาพ (฿)" value={carInsp} onChange={setCarInsp} />
          <NumField label="พรบ. (฿)" value={carCom} onChange={setCarCom} />
          <NumField label="ภาษีประจำปี (฿)" value={carTax} onChange={setCarTax} />
        </div>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
        <h3 className="text-sm font-bold text-emerald-900 mb-3">ค่าราชการประมาณ — มอเตอร์ไซค์</h3>
        <div className="grid grid-cols-3 gap-3">
          <NumField label="ตรวจสภาพ (฿)" value={mcInsp} onChange={setMcInsp} />
          <NumField label="พรบ. (฿)" value={mcCom} onChange={setMcCom} />
          <NumField label="ภาษีประจำปี (฿)" value={mcTax} onChange={setMcTax} />
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={updateSettings.isPending}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {updateSettings.isPending ? "กำลังบันทึก..." : "บันทึกสูตรราคา"}
      </button>
    </section>
  );
}
