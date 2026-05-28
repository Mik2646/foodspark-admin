"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Save, Loader2, X } from "lucide-react";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] w-full rounded-[14px] bg-gray-50 flex items-center justify-center text-sm text-gray-400">
      กำลังโหลดแผนที่…
    </div>
  ),
});

type Props = {
  lat: number | null | undefined;
  lng: number | null | undefined;
  address?: string | null;
  saving: boolean;
  onSave: (coords: { lat: number; lng: number }) => void;
};

// Default center: บ้านผือ area (Udon Thani) — used only when a shop has
// no pin yet, so the admin sees a reasonable starting view instead of
// the middle of the ocean (Leaflet defaults to [0,0]).
const DEFAULT_LAT = 17.6837;
const DEFAULT_LNG = 102.4595;

export default function RestaurantLocationCard({
  lat,
  lng,
  address,
  saving,
  onSave,
}: Props) {
  const initialLat = lat ?? DEFAULT_LAT;
  const initialLng = lng ?? DEFAULT_LNG;
  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });
  const [editing, setEditing] = useState(false);
  const prevSavingRef = useRef(saving);

  // Close the editor when a save completes (saving prop transitions
  // true → false). Without this, the map stays open and the save
  // button just disables, which feels unfinished.
  useEffect(() => {
    if (prevSavingRef.current && !saving && editing) {
      setEditing(false);
    }
    prevSavingRef.current = saving;
  }, [saving, editing]);

  const hasOriginalPin = lat != null && lng != null;
  const dirty =
    editing &&
    (Math.abs(coords.lat - initialLat) > 1e-7 ||
      Math.abs(coords.lng - initialLng) > 1e-7);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">ตำแหน่งร้านบนแผนที่</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {hasOriginalPin
                ? `${initialLat.toFixed(6)}, ${initialLng.toFixed(6)}`
                : "ยังไม่ปักหมุด — ลากหมุดบนแผนที่เพื่อตั้งตำแหน่ง"}
            </p>
            {address && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{address}</p>
            )}
          </div>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 flex-shrink-0 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" /> เลื่อนหมุด
          </button>
        ) : (
          <button
            onClick={() => {
              setCoords({ lat: initialLat, lng: initialLng });
              setEditing(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-50 flex-shrink-0 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> ยกเลิก
          </button>
        )}
      </div>

      {editing && (
        <>
          <LocationPickerMap
            lat={coords.lat}
            lng={coords.lng}
            onChange={(next) => setCoords(next)}
          />
          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-xs text-gray-500">
              ตำแหน่งใหม่:{" "}
              <span className="font-mono text-gray-700">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </span>
            </p>
            <button
              disabled={!dirty || saving}
              onClick={() => onSave(coords)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              บันทึกตำแหน่ง
            </button>
          </div>
        </>
      )}
    </div>
  );
}
