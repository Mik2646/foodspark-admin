"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/lib/auth";
import { ChefHat, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const email = emailRef.current?.value ?? "";
    const password = passwordRef.current?.value ?? "";
    if (!email || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    setError("");
    setLoading(true);
    const result = await loginAdmin(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "เกิดข้อผิดพลาด");
    } else {
      router.replace("/dashboard");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleLogin();
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-10">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-50 rounded-2xl mb-3">
            <ChefHat className="w-7 h-7 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FoodSpark Admin</h1>
          <p className="text-sm text-gray-500 mt-1">เข้าสู่ระบบสำหรับผู้ดูแลระบบ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <input
              ref={emailRef}
              type="email"
              name="email"
              required
              autoComplete="email"
              defaultValue=""
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="admin@foodspark.app"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input
              ref={passwordRef}
              type="password"
              name="password"
              required
              autoComplete="current-password"
              defaultValue=""
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
