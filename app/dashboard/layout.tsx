"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        กำลังตรวจสอบสิทธิ์แอดมิน...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
