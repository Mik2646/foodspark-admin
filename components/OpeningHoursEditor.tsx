"use client";

import { useState } from "react";

export type OpeningHourEntry = {
  day: number;       // 0 = Sunday, 6 = Saturday
  open: string;      // HH:MM
  close: string;     // HH:MM
  enabled: boolean;
};

const DAY_LABELS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const DAY_LABELS_FULL_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

/**
 * Default schedule when a shop hasn't configured one yet — all 7 days,
 * 09:00-21:00, enabled. Most Thai shops fall close to this range, so
 * the merchant can hit Save with one tap if they're a "every day same
 * hours" shop and only need to tweak the time for outliers.
 */
function defaultSchedule(): OpeningHourEntry[] {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    open: "09:00",
    close: "21:00",
    enabled: true,
  }));
}

/** Merge incoming entries (possibly partial / out-of-order) into a fully
 *  populated 7-day array sorted Sun→Sat. Missing days default to disabled. */
function normalizeSchedule(input: unknown): OpeningHourEntry[] {
  const arr = Array.isArray(input) ? input : [];
  const byDay = new Map<number, OpeningHourEntry>();
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Partial<OpeningHourEntry>;
    if (typeof r.day !== "number" || r.day < 0 || r.day > 6) continue;
    byDay.set(r.day, {
      day: r.day,
      open: typeof r.open === "string" && /^\d{2}:\d{2}$/.test(r.open) ? r.open : "09:00",
      close: typeof r.close === "string" && /^\d{2}:\d{2}$/.test(r.close) ? r.close : "21:00",
      enabled: r.enabled !== false,
    });
  }
  return Array.from({ length: 7 }, (_, day) =>
    byDay.get(day) ?? { day, open: "09:00", close: "21:00", enabled: false },
  );
}

type Props = {
  value: OpeningHourEntry[] | null | undefined;
  onChange: (next: OpeningHourEntry[]) => void;
};

/**
 * Weekly opening-hours editor.
 *
 * Stores the same `[{day, open, close, enabled}]` shape that
 * `restaurants.openingHours` in the schema expects, and that
 * `isRestaurantOpenNow()` consumes server-side to derive `isOpenNow`
 * + `closesAt` on every list / order path.
 *
 * UX:
 *  - 7 rows (Sun → Sat) each with an enable toggle + two `<input type=time>`
 *  - "ใช้กับวันอื่นทั้งหมด" quick-apply button: copy a row's hours to all
 *    enabled days. Saves the merchant 6 taps for the common "all days
 *    same hours" shape.
 *  - "ใช้ค่าเริ่มต้น" reset button: 09:00-21:00 every day.
 *
 * Pure presentational — parent owns state + handles save.
 */
export default function OpeningHoursEditor({ value, onChange }: Props) {
  const [schedule] = useState(() => normalizeSchedule(value ?? defaultSchedule()));
  const [working, setWorking] = useState<OpeningHourEntry[]>(schedule);

  function update(day: number, patch: Partial<OpeningHourEntry>) {
    const next = working.map((row) => (row.day === day ? { ...row, ...patch } : row));
    setWorking(next);
    onChange(next);
  }

  function applyToAll(srcDay: number) {
    const src = working.find((r) => r.day === srcDay);
    if (!src) return;
    const next = working.map((row) => ({
      ...row,
      open: src.open,
      close: src.close,
      enabled: src.enabled,
    }));
    setWorking(next);
    onChange(next);
  }

  function reset() {
    const next = defaultSchedule();
    setWorking(next);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">เวลาเปิด-ปิดร้าน</p>
        <button
          type="button"
          onClick={reset}
          className="text-[11px] text-gray-500 underline"
        >
          ใช้ค่าเริ่มต้น (09:00-21:00 ทุกวัน)
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {working.map((row) => (
          <div
            key={row.day}
            className="flex items-center gap-2 px-3 py-2"
          >
            <div className="w-10 text-xs font-semibold text-gray-600 flex-shrink-0">
              {DAY_LABELS_TH[row.day]}
              <span className="block text-[9px] text-gray-400 font-normal">
                {DAY_LABELS_FULL_TH[row.day]}
              </span>
            </div>
            <label className="flex items-center gap-1 flex-shrink-0">
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) => update(row.day, { enabled: e.target.checked })}
                className="w-4 h-4 accent-orange-500"
              />
              <span className={`text-[11px] ${row.enabled ? "text-emerald-600" : "text-gray-400"}`}>
                {row.enabled ? "เปิด" : "ปิด"}
              </span>
            </label>
            <input
              type="time"
              value={row.open}
              disabled={!row.enabled}
              onChange={(e) => update(row.day, { open: e.target.value })}
              className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <span className="text-xs text-gray-400">-</span>
            <input
              type="time"
              value={row.close}
              disabled={!row.enabled}
              onChange={(e) => update(row.day, { close: e.target.value })}
              className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              type="button"
              onClick={() => applyToAll(row.day)}
              disabled={!row.enabled}
              title="ใช้เวลาเดียวกันกับทุกวัน"
              className="text-[10px] text-orange-500 font-semibold whitespace-nowrap disabled:text-gray-300 px-1"
            >
              ใช้ทุกวัน
            </button>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-gray-500">
        💡 ลูกค้าจะเห็น “เปิด/ปิด” ในหน้าร้านตามเวลาที่ตั้งไว้ — ระบบยังเช็คตอนกดสั่งด้วย ป้องกันออเดอร์เข้ามานอกเวลา
      </p>
    </div>
  );
}
