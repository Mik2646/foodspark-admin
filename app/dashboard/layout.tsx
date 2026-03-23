"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const session = loadSession();
    if (!session) router.replace("/login");
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
