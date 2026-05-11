export type MenuMeta = {
  soldOut: boolean;
  stockCount: number | null;
  scheduleEnabled: boolean;
  availableFrom: string | null; // HH:mm
  availableTo: string | null; // HH:mm
  prepMinutes: number | null;
};

export type MenuAvailability = {
  available: boolean;
  reason: "ok" | "hidden" | "sold_out" | "stock_empty" | "outside_schedule";
  message: string;
};

const MENU_META_MARKER_RE = /<!--\s*foodspark-menu-meta:(\{[\s\S]*?\})\s*-->/m;

function clampInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function toNullableInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (["1", "true", "yes", "on"].includes(lower)) return true;
    if (["0", "false", "no", "off"].includes(lower)) return false;
  }
  return fallback;
}

function toMinutes(time: string): number {
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

export function defaultMenuMeta(): MenuMeta {
  return {
    soldOut: false,
    stockCount: null,
    scheduleEnabled: false,
    availableFrom: null,
    availableTo: null,
    prepMinutes: null,
  };
}

export function parseMenuMeta(description: string | null | undefined): {
  plainDescription: string;
  meta: MenuMeta;
} {
  const raw = String(description ?? "");
  const match = raw.match(MENU_META_MARKER_RE);
  const plainDescription = raw.replace(MENU_META_MARKER_RE, "").trim();
  if (!match?.[1]) return { plainDescription, meta: defaultMenuMeta() };

  try {
    const parsed = JSON.parse(match[1]) as Partial<MenuMeta>;
    return {
      plainDescription,
      meta: {
        soldOut: toBoolean(parsed.soldOut, false),
        stockCount: toNullableInt(parsed.stockCount),
        scheduleEnabled: toBoolean(parsed.scheduleEnabled, false),
        availableFrom: normalizeTime(parsed.availableFrom),
        availableTo: normalizeTime(parsed.availableTo),
        prepMinutes: toNullableInt(parsed.prepMinutes),
      },
    };
  } catch {
    return { plainDescription, meta: defaultMenuMeta() };
  }
}

export function buildMenuDescription(plainDescription: string, meta: MenuMeta): string {
  const cleaned = String(plainDescription || "").replace(MENU_META_MARKER_RE, "").trim();
  const payload: MenuMeta = {
    soldOut: !!meta.soldOut,
    stockCount: toNullableInt(meta.stockCount),
    scheduleEnabled: !!meta.scheduleEnabled,
    availableFrom: normalizeTime(meta.availableFrom),
    availableTo: normalizeTime(meta.availableTo),
    prepMinutes: toNullableInt(meta.prepMinutes),
  };
  const marker = `<!-- foodspark-menu-meta:${JSON.stringify(payload)} -->`;
  return cleaned ? `${cleaned}\n\n${marker}` : marker;
}

export function isWithinMenuSchedule(
  meta: Pick<MenuMeta, "scheduleEnabled" | "availableFrom" | "availableTo">,
  now: Date,
): boolean {
  if (!meta.scheduleEnabled) return true;
  if (!meta.availableFrom || !meta.availableTo) return true;
  const fromMin = toMinutes(meta.availableFrom);
  const toMin = toMinutes(meta.availableTo);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Same value means always available.
  if (fromMin === toMin) return true;

  if (fromMin < toMin) {
    return nowMin >= fromMin && nowMin < toMin;
  }
  // Cross midnight, e.g. 20:00 -> 02:00
  return nowMin >= fromMin || nowMin < toMin;
}

export function getMenuAvailability({
  isAvailable,
  meta,
  now = new Date(),
}: {
  isAvailable?: boolean | null;
  meta?: MenuMeta | null;
  now?: Date;
}): MenuAvailability {
  if (isAvailable === false) {
    return { available: false, reason: "hidden", message: "ปิดขายชั่วคราว" };
  }

  const resolvedMeta = meta ?? defaultMenuMeta();

  if (resolvedMeta.soldOut) {
    return { available: false, reason: "sold_out", message: "หมดชั่วคราว" };
  }

  if (resolvedMeta.stockCount != null && resolvedMeta.stockCount <= 0) {
    return { available: false, reason: "stock_empty", message: "สต็อกหมด" };
  }

  if (!isWithinMenuSchedule(resolvedMeta, now)) {
    return { available: false, reason: "outside_schedule", message: "นอกเวลาขาย" };
  }

  return { available: true, reason: "ok", message: "พร้อมขาย" };
}

export function formatMenuSchedule(meta: Pick<MenuMeta, "scheduleEnabled" | "availableFrom" | "availableTo">): string | null {
  if (!meta.scheduleEnabled) return null;
  if (!meta.availableFrom || !meta.availableTo) return "กำหนดเวลาไม่ครบ";
  return `${meta.availableFrom}-${meta.availableTo}`;
}

export function toSafePrepMinutes(value: unknown): number | null {
  const n = toNullableInt(value);
  if (n == null) return null;
  return clampInt(n, 0);
}

