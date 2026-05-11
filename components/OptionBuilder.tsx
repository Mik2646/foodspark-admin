"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";

export type OptionChoice = { id: string; label: string; price: number };
export type OptionGroup = {
  id: string;
  name: string;
  required: boolean;
  multiple: boolean;
  choices: OptionChoice[];
};

function newGroupId() { return `og_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function newChoiceId() { return `oc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

/**
 * Customisation builder for menu items. Mirrors the merchant-side
 * builder in foodspark-web/app/merchant/menu/page.tsx so an item
 * created/edited via admin is indistinguishable from one created by
 * the shop owner. Each group has independent required + multiple
 * flags; each choice has an optional surcharge.
 */
export default function OptionBuilder({
  options,
  onChange,
}: {
  options: OptionGroup[];
  onChange: (next: OptionGroup[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const addGroup = () => {
    onChange([
      ...options,
      { id: newGroupId(), name: "", required: false, multiple: false, choices: [] },
    ]);
    setOpen(true);
  };

  const updateGroup = (idx: number, patch: Partial<OptionGroup>) => {
    onChange(options.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  };

  const removeGroup = (idx: number) => onChange(options.filter((_, i) => i !== idx));

  const addChoice = (gIdx: number) => {
    const group = options[gIdx];
    if (!group) return;
    updateGroup(gIdx, { choices: [...group.choices, { id: newChoiceId(), label: "", price: 0 }] });
  };

  const updateChoice = (gIdx: number, cIdx: number, patch: Partial<OptionChoice>) => {
    const group = options[gIdx];
    if (!group) return;
    updateGroup(gIdx, {
      choices: group.choices.map((c, i) => (i === cIdx ? { ...c, ...patch } : c)),
    });
  };

  const removeChoice = (gIdx: number, cIdx: number) => {
    const group = options[gIdx];
    if (!group) return;
    updateGroup(gIdx, { choices: group.choices.filter((_, i) => i !== cIdx) });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
      >
        <span className="font-medium text-gray-700">
          ตัวเลือกเพิ่มเติม
          {options.length > 0 && <span className="ml-1 text-orange-500">({options.length} กลุ่ม)</span>}
        </span>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {open && (
        <div className="mt-2 space-y-3">
          {options.map((group, gIdx) => (
            <div key={group.id} className="border border-orange-100 rounded-lg p-3 bg-orange-50/40">
              <div className="flex items-center gap-2 mb-2">
                <input
                  value={group.name}
                  onChange={(e) => updateGroup(gIdx, { name: e.target.value })}
                  placeholder="เช่น ระดับความเผ็ด, ท็อปปิ้ง"
                  className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <button
                  type="button"
                  onClick={() => removeGroup(gIdx)}
                  className="w-7 h-7 bg-red-50 rounded-md flex items-center justify-center"
                  title="ลบกลุ่ม"
                >
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => updateGroup(gIdx, { required: !group.required })}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition ${
                    group.required
                      ? "border-orange-400 bg-orange-50 text-orange-700"
                      : "border-gray-200 bg-white text-gray-500"
                  }`}
                >
                  {group.required ? "บังคับเลือก" : "ไม่บังคับ"}
                </button>
                <button
                  type="button"
                  onClick={() => updateGroup(gIdx, { multiple: !group.multiple })}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition ${
                    group.multiple
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-500"
                  }`}
                >
                  {group.multiple ? "เลือกได้หลายอย่าง" : "เลือกได้อย่างเดียว"}
                </button>
              </div>

              <div className="space-y-1.5">
                {group.choices.map((choice, cIdx) => (
                  <div key={choice.id} className="flex items-center gap-2">
                    <input
                      value={choice.label}
                      onChange={(e) => updateChoice(gIdx, cIdx, { label: e.target.value })}
                      placeholder="เช่น ไม่เผ็ด, เผ็ดน้อย"
                      className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white">
                      <span className="pl-2 text-xs text-gray-400">+฿</span>
                      <input
                        type="number"
                        value={choice.price === 0 ? "" : choice.price}
                        onChange={(e) => updateChoice(gIdx, cIdx, { price: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        min={0}
                        className="w-14 py-1.5 pr-2 text-sm text-right focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeChoice(gIdx, cIdx)}
                      className="w-7 h-7 bg-red-50 rounded-md flex items-center justify-center"
                      title="ลบตัวเลือก"
                    >
                      <X size={13} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addChoice(gIdx)}
                className="mt-2 flex items-center gap-1 text-xs text-orange-500 font-semibold"
              >
                <Plus size={13} /> เพิ่มตัวเลือก
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addGroup}
            className="w-full border-2 border-dashed border-orange-300 text-orange-500 rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Plus size={14} /> เพิ่มกลุ่มตัวเลือก
          </button>
        </div>
      )}
    </div>
  );
}

export function cloneOptions(options?: OptionGroup[] | null): OptionGroup[] {
  return (options ?? []).map((group) => ({
    id: group.id || newGroupId(),
    name: group.name ?? "",
    required: !!group.required,
    multiple: !!group.multiple,
    choices: (group.choices ?? []).map((choice) => ({
      id: choice.id || newChoiceId(),
      label: choice.label ?? "",
      price: Number(choice.price) || 0,
    })),
  }));
}

/** Strip empty groups/choices before sending to backend. */
export function sanitizeOptions(options: OptionGroup[]): OptionGroup[] {
  return options
    .map((g) => ({
      ...g,
      name: g.name.trim(),
      choices: g.choices
        .map((c) => ({ ...c, label: c.label.trim() }))
        .filter((c) => c.label.length > 0),
    }))
    .filter((g) => g.name.length > 0 && g.choices.length > 0);
}
