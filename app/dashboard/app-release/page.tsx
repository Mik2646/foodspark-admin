"use client";

import { getToken } from "@/lib/trpc";
import { uploadApk } from "@/lib/upload";
import { useRef, useState } from "react";
import {
  Smartphone,
  UploadCloud,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

const APK_PUBLIC_URL = "https://pub-f525a27670b0476995b609fc925a2dfd.r2.dev/foodspark.apk";
const DOWNLOAD_PAGE_URL = "https://foodspark.techsparks-co-th.com/#download";

function fmtSize(bytes: number): string {
  if (!bytes) return "-";
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

export default function AppReleasePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ size: number; at: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".apk")) {
      setError("กรุณาเลือกไฟล์ .apk เท่านั้น");
      return;
    }
    setError(null);
    setResult(null);
    setProgress(0);
    setBusy(true);
    try {
      const { size } = await uploadApk(file, getToken(), setProgress);
      setResult({ size, at: new Date().toLocaleString("th-TH") });
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-2xl bg-orange-100 flex items-center justify-center">
          <Smartphone className="text-orange-500" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ไฟล์แอป Android (APK)</h1>
          <p className="text-sm text-gray-500">ไฟล์ที่ลูกค้าดาวน์โหลดจากหน้าเว็บ FoodSpark</p>
        </div>
      </div>

      {/* Current file */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">ไฟล์ปัจจุบัน</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={APK_PUBLIC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 border border-orange-200 text-orange-600 hover:bg-orange-50 font-semibold px-4 py-3 rounded-xl transition-colors"
          >
            <Download size={18} /> ทดสอบดาวน์โหลด APK
          </a>
          <a
            href={DOWNLOAD_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold px-4 py-3 rounded-xl transition-colors"
          >
            <ExternalLink size={18} /> เปิดหน้าดาวน์โหลด
          </a>
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mt-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">อัปโหลดไฟล์ใหม่ (แทนที่ของเดิม)</h2>
        <p className="text-xs text-gray-400 mb-4">
          URL ดาวน์โหลดคงเดิม — ลูกค้ากดโหลดได้ไฟล์เวอร์ชันใหม่ทันทีหลังอัปเสร็จ
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-orange-200 hover:border-orange-300 rounded-2xl py-10 flex flex-col items-center justify-center gap-2 text-orange-500 disabled:opacity-60 transition-colors"
        >
          {busy ? <Loader2 size={28} className="animate-spin" /> : <UploadCloud size={28} />}
          <span className="font-semibold">{busy ? `กำลังอัปโหลด ${progress}%` : "เลือกไฟล์ .apk"}</span>
          <span className="text-xs text-gray-400">รองรับสูงสุด 150MB</span>
        </button>
        <input ref={fileRef} type="file" accept=".apk,application/vnd.android.package-archive" hidden onChange={onPick} />

        {busy && (
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {result && (
          <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3 text-sm">
            <CheckCircle2 size={18} />
            <span>อัปโหลดสำเร็จ — {fmtSize(result.size)} • {result.at}</span>
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
