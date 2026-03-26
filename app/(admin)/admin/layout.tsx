"use client";

import { ReactNode, useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  MessageSquare, 
  Calendar, 
  Home, 
  Bell, 
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  User as UserIcon,
  Building2,
  BellRing
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const countFetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useSWR("/api/profile?action=me", fetcher);
  const { data: notifData } = useSWR("/api/notifications?action=unread_count", countFetcher, {
    refreshInterval: 15000, // poll every 15 seconds for real-time feel
  });
  const unreadCount: number = notifData?.count ?? 0;

  useEffect(() => {
    async function checkRole() {
      const res = await fetch("/api/profile?action=me");
      if (res.ok) {
        const data = await res.json();
        if (data.role !== "admin") {
          router.push("/feed");
        }
      } else {
        router.push("/");
      }
    }
    void checkRole();
  }, [router]);


  const menuGroups = [
    {
      title: "ADMIN",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Manage Posts", href: "/admin/posts", icon: FileText },
        { label: "Manage Users", href: "/admin/users", icon: Users },
        { label: "SMS Management", href: "/admin/sms", icon: MessageSquare },
        { label: "Manage Events", href: "/admin/events", icon: Calendar },
      ]
    },
    {
      title: "QUICK LINKS",
      items: [
        { label: "Feed", href: "/admin/feed", icon: Home },
        { label: "Notifications", href: "/admin/notifications", icon: Bell },
      ]
    }
  ];

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-white dark:bg-slate-950">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-[#0B1120] ring-1 ring-white/5 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? "translate-x-0 shadow-2xl shadow-black" : "-translate-x-full lg:-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[15px] font-extrabold text-white leading-tight">Barangay PGT</p>
              <p className="text-[11px] font-medium text-slate-500">Admin Portal</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-8 px-4 overflow-y-auto">
            {menuGroups.map((group) => (
              <div key={group.title} className="space-y-4">
                <h3 className="px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`group relative flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                          isActive 
                            ? "bg-[#1E293B] text-white shadow-sm" 
                            : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-[-16px] h-6 w-1.5 rounded-r-full bg-blue-600 shadow-[4px_0_12px_rgba(37,99,235,0.6)]" />
                        )}
                        <Icon className={`h-5 w-5 shrink-0 ${isActive ? "!text-white" : "!text-slate-400 group-hover:!text-white"}`} />
                        <span className={`${isActive ? "!text-white" : "!text-slate-400 group-hover:!text-white"}`}>
                          {item.label}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="mt-auto px-6 pb-10">
            <div className="mb-8 flex items-center gap-4 px-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30">
                {me?.name?.charAt(0) || "B"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-bold text-white">{me?.name || "Administrator"}</p>
                <p className="text-xs font-semibold text-slate-500">Administrator</p>
              </div>
            </div>
            <button 
              onClick={async () => {
                await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }).catch(() => {});
                // Clear SWR cache for profile
                const { mutate } = await import("swr");
                mutate("/api/profile?action=me", null, false);
                router.push("/");
              }}
              className="group flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-slate-400 transition-all hover:text-white"
            >
              <LogOut className="h-5 w-5 text-slate-500 transition-all group-hover:rotate-180 group-hover:text-white" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col transition-all lg:pl-72">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6 lg:px-8 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-50"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Bell with real-time unread count */}
            <a href="/admin/notifications" className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-50">
              <BellRing className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </a>
            <div className="hidden h-5 w-px bg-slate-200 sm:block" />
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/20">
              {me?.name?.charAt(0) || "B"}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden bg-slate-50/50 dark:bg-slate-950 p-4 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
