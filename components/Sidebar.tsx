"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { ensureNotificationPermission, flashTitle, playNewOrderChime, showBrowserNotification } from "@/lib/notifyClient";
import {
  AlertTriangle,
  Bell,
  BookText,
  ChefHat,
  ClipboardList,
  Flame,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Store,
  Tag,
  TicketPercent,
  Users,
  Bike,
  Settings,
  Image,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const links = [
  { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/dashboard/inbox", label: "กล่องแจ้งเตือน", icon: Bell },
  { href: "/dashboard/incidents", label: "Incident Center", icon: AlertTriangle },
  { href: "/dashboard/disputes", label: "Refund/Dispute", icon: HandCoins },
  { href: "/dashboard/finance", label: "การเงิน/Settlement", icon: HandCoins },
  { href: "/dashboard/audit", label: "Audit Log", icon: BookText },
  { href: "/dashboard/rbac", label: "RBAC สิทธิ์แอดมิน", icon: KeyRound },
  { href: "/dashboard/users", label: "ผู้ใช้งาน", icon: Users },
  { href: "/dashboard/restaurants", label: "ร้านอาหาร", icon: Store },
  { href: "/dashboard/orders", label: "ออเดอร์ทั้งหมด", icon: ClipboardList },
  { href: "/dashboard/riders", label: "ไรเดอร์", icon: Bike },
  { href: "/dashboard/approvals", label: "อนุมัติคำขอ", icon: ShieldCheck },
  { href: "/dashboard/categories", label: "หมวดหมู่", icon: Tag },
  { href: "/dashboard/promos", label: "โปรโมโค้ด", icon: TicketPercent },
  { href: "/dashboard/flash-deals", label: "ดีลแฟลช", icon: Flame },
  { href: "/dashboard/banners", label: "จัดการ Banner", icon: Image },
  { href: "/dashboard/settings", label: "ตั้งค่าระบบ", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: pending = [] } = trpc.admin.listPendingApprovals.useQuery(undefined, { refetchInterval: 15000 });
  const { data: unreadNotifications = [] } = trpc.admin.listNotifications.useQuery(
    { unreadOnly: true, limit: 200 },
    { refetchInterval: 15000 },
  );
  const pendingCount = pending.length;
  const unreadCount = unreadNotifications.length;

  // Ask once per session — only relevant when admin actually uses the panel
  useEffect(() => { ensureNotificationPermission(); }, []);

  // Watch the unread count: any increase = something new arrived since the
  // last 15s poll. Beep + system notification + flashing title catch the
  // admin even if they're on another tab.
  const prevCountRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevCountRef.current;
    if (prev != null && unreadCount > prev) {
      const newest: any = (unreadNotifications as any)[0];
      const title = newest?.title ?? "🛒 ออเดอร์ใหม่";
      const message = newest?.message ?? `มีแจ้งเตือนใหม่ ${unreadCount - prev} รายการ`;
      playNewOrderChime();
      showBrowserNotification(title, message);
      flashTitle(`🔔 (${unreadCount}) ${title}`);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount, unreadNotifications]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    // Sidebar is pinned to the viewport with `sticky top-0 h-screen`
    // (was `min-h-screen` which let the bar grow with its content and
    // pushed the last menu items below the fold with no way to reach
    // them). The inner `<nav>` claims `overflow-y-auto` so it owns the
    // scroll inside that fixed height — the bottom Logout block stays
    // visible no matter how long the link list grows.
    <aside className="sticky top-0 w-60 h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="shrink-0 px-6 py-5 border-b border-gray-100 flex items-center gap-2">
        <ChefHat className="w-5 h-5 text-orange-500" />
        <div>
          <span className="text-base font-bold text-orange-500">FoodSpark</span>
          <p className="text-xs text-gray-400 leading-none mt-0.5">Admin Panel</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const isApprovals = href === "/dashboard/approvals";
          const isInbox = href === "/dashboard/inbox";
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
              <span className="flex-1">{label}</span>
              {isApprovals && pendingCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
              {isInbox && unreadCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 px-3 py-4 border-t border-gray-100">
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
