"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { ensureNotificationPermission, flashTitle, playNewOrderChime, showBrowserNotification } from "@/lib/notifyClient";
import {
  AlertTriangle,
  Bell,
  BookText,
  CalendarClock,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Flame,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  ShoppingBasket,
  Star,
  Store,
  Tag,
  TicketPercent,
  Users,
  Bike,
  Settings,
  Image,
  X,
  Car,
  Wrench,
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
  { href: "/dashboard/concierge", label: "ร้านดัง (รับหิ้ว)", icon: Star },
  { href: "/dashboard/pos-interest", label: "สนใจ POS", icon: MonitorSmartphone },
  { href: "/dashboard/orders", label: "ออเดอร์ทั้งหมด", icon: ClipboardList },
  { href: "/dashboard/riders", label: "ไรเดอร์", icon: Bike },
  { href: "/dashboard/approvals", label: "อนุมัติคำขอ", icon: ShieldCheck },
  { href: "/dashboard/categories", label: "หมวดหมู่", icon: Tag },
  { href: "/dashboard/markets", label: "ตลาดนัด", icon: ShoppingBasket },
  { href: "/dashboard/preorders", label: "พรีออเดอร์", icon: CalendarClock },
  { href: "/dashboard/transport", label: "บริการรับส่ง", icon: Car },
  { href: "/dashboard/inspection", label: "ตรวจสภาพ-พรบ.", icon: Wrench },
  { href: "/dashboard/promos", label: "โปรโมโค้ด", icon: TicketPercent },
  { href: "/dashboard/flash-deals", label: "ดีลแฟลช", icon: Flame },
  { href: "/dashboard/banners", label: "จัดการ Banner", icon: Image },
  { href: "/dashboard/settings", label: "ตั้งค่าระบบ", icon: Settings },
];

const SIDEBAR_COLLAPSED_KEY = "foodspark_admin_sidebar_collapsed";

/**
 * Sidebar — responsive:
 *  - Desktop (md+): pinned, can collapse to icon-only via the chevron
 *    button at the top. State persists in localStorage so the choice
 *    survives reloads.
 *  - Mobile (< md): hidden by default. Hamburger button in DashboardLayout
 *    flips `mobileOpen` to slide the sidebar in as a full overlay.
 *    Tapping the backdrop or any nav link closes it.
 */
export function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate the collapsed pref from localStorage AFTER mount so we don't
  // mismatch SSR markup. Defaults to expanded.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      }
      return next;
    });
  };

  const { data: pending = [] } = trpc.admin.listPendingApprovals.useQuery(undefined, { refetchInterval: 15000 });
  const { data: unreadNotifications = [] } = trpc.admin.listNotifications.useQuery(
    { unreadOnly: true, limit: 200 },
    { refetchInterval: 15000 },
  );
  const pendingCount = pending.length;
  const unreadCount = unreadNotifications.length;

  useEffect(() => { ensureNotificationPermission(); }, []);

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

  const widthClass = collapsed ? "md:w-16" : "md:w-60";

  return (
    <>
      {/* Mobile backdrop. Renders only when the drawer is open so it
          doesn't intercept clicks on desktop. */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="ปิดเมนู"
          onClick={onMobileClose}
          className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen bg-white border-r border-gray-200 flex flex-col transition-[width,transform] duration-200 ease-out ${widthClass} ${
          mobileOpen
            ? "w-72 translate-x-0 shadow-2xl"
            : "w-72 -translate-x-full md:translate-x-0 md:shadow-none"
        }`}
      >
        {/* Brand header */}
        <div className="shrink-0 px-3 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <ChefHat className="w-5 h-5 text-orange-500" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className="text-base font-bold text-orange-500">FoodSpark</span>
              <p className="text-xs text-gray-400 leading-none mt-0.5">Admin Panel</p>
            </div>
          )}
          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden md:inline-flex w-7 h-7 rounded-lg items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          {/* Mobile close button */}
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50"
            aria-label="ปิดเมนู"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {links.map(({ href, label, icon: Icon }) => {
            // The overview link is "/dashboard" — every subpage path starts
            // with it, so prefix-matching would keep it highlighted everywhere.
            // Match it exactly; all other links use prefix matching.
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === href || pathname.startsWith(href + "/");
            const isApprovals = href === "/dashboard/approvals";
            const isInbox = href === "/dashboard/inbox";
            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                title={collapsed ? label : undefined}
                className={`group relative flex items-center ${collapsed ? "md:justify-center md:px-2" : "gap-3 px-3"} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{label}</span>}
                {!collapsed && isApprovals && pendingCount > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
                {!collapsed && isInbox && unreadCount > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {/* Collapsed-mode badge dot — kept small so the row stays
                    icon-only but the alert is still surfaced. */}
                {collapsed && (isApprovals && pendingCount > 0 || isInbox && unreadCount > 0) && (
                  <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${isApprovals ? "bg-red-500" : "bg-orange-500"}`} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 px-2 py-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            title={collapsed ? "ออกจากระบบ" : undefined}
            className={`w-full flex items-center ${collapsed ? "md:justify-center md:px-2" : "gap-3 px-3"} py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>ออกจากระบบ</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
