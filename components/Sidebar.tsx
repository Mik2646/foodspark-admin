"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { LayoutDashboard, Users, Store, ClipboardList, LogOut, ChefHat, Bike } from "lucide-react";

const links = [
  { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "ผู้ใช้งาน", icon: Users },
  { href: "/dashboard/restaurants", label: "ร้านอาหาร", icon: Store },
  { href: "/dashboard/orders", label: "ออเดอร์ทั้งหมด", icon: ClipboardList },
  { href: "/dashboard/riders", label: "ไรเดอร์", icon: Bike },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
        <ChefHat className="w-5 h-5 text-orange-500" />
        <div>
          <span className="text-base font-bold text-orange-500">FoodSpark</span>
          <p className="text-xs text-gray-400 leading-none mt-0.5">Admin Panel</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-orange-50 text-orange-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
