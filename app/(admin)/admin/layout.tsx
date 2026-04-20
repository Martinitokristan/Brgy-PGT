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
import { PageSkeleton } from "@/app/components/ui/Skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());


export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useSWR("/api/profile?action=me", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });
  const { data: notifData } = useSWR("/api/notifications?action=unread_count", fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });
  const unreadCount: number = notifData?.count ?? 0;

  useEffect(() => {
    if (!me) return;
    if (me.role !== "admin") {
      router.push("/feed");
    }
  }, [me, router]);

  // Admin panel always runs in light mode regardless of resident dark-mode preference
  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");
    return () => {
      if (wasDark) html.classList.add("dark");
    };
  }, []);


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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-[#0B1120] ring-1 ring-white/5 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? "translate-x-0 shadow-2xl shadow-black" : "-translate-x-full lg:-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[14px] font-extrabold text-white leading-tight">Barangay PGT</p>
              <p className="text-[10px] font-medium text-slate-500">Admin Portal</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-6 px-3 overflow-y-auto">
            {menuGroups.map((group) => (
              <div key={group.title} className="space-y-3">
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  {group.title}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all ${
                          isActive 
                            ? "bg-[#1E293B] text-white shadow-sm" 
                            : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-[-12px] h-5 w-1.5 rounded-r-full bg-blue-600 shadow-[4px_0_12px_rgba(37,99,235,0.6)]" />
                        )}
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "!text-white" : "!text-slate-400 group-hover:!text-white"}`} />
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
          <div className="mt-auto px-4 pb-6">
            <div className="mb-6 flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white text-[13px] font-bold shadow-lg shadow-blue-500/30">
                {me?.name?.charAt(0) || "B"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-[13px] font-bold text-white">{me?.name || "Administrator"}</p>
                <p className="text-[11px] font-semibold text-slate-500">Administrator</p>
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
              className="group flex w-full items-center gap-3 px-3 py-2 text-[13px] font-bold text-slate-400 transition-all hover:text-white"
            >
              <LogOut className="h-4 w-4 text-slate-500 transition-all group-hover:rotate-180 group-hover:text-white" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col transition-all lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Bell with real-time unread count */}
            <a href="/admin/notifications" className="relative rounded-lg p-1.5 text-slate-500 hover:bg-slate-50">
              <BellRing className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </a>
            <div className="hidden h-4 w-px bg-slate-200 sm:block" />
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-500/20">
              {me?.name?.charAt(0) || "B"}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden bg-slate-50/50 dark:bg-slate-950 p-4 lg:p-6">
          <div className="mx-auto w-full max-w-6xl">
            {!me ? <PageSkeleton /> : children}
          </div>
        </main>
      </div>
    </div>
  );
}
