"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { ChefHat, Menu } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const validate = () => {
      const session = loadSession();
      if (!session) {
        setReady(false);
        router.replace("/login");
        return;
      }
      setReady(true);
    };

    validate();
    window.addEventListener("storage", validate);
    window.addEventListener("admin-session-cleared", validate);
    const interval = window.setInterval(validate, 60_000);
    return () => {
      window.removeEventListener("storage", validate);
      window.removeEventListener("admin-session-cleared", validate);
      window.clearInterval(interval);
    };
  }, [router]);

  // Close the mobile drawer when the route changes so navigation feels
  // snappy (the user doesn't have to tap close after every nav).
  useEffect(() => {
    if (!mobileOpen) return;
    const close = () => setMobileOpen(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, [mobileOpen]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        กำลังตรวจสอบสิทธิ์แอดมิน...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar — hamburger + brand. Hidden on md+ because the
            sidebar handles brand+nav inline. */}
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-700 active:scale-95"
            aria-label="เปิดเมนู"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-orange-500" />
            <span className="text-base font-bold text-orange-500">FoodSpark</span>
            <span className="text-xs text-gray-400">Admin</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
