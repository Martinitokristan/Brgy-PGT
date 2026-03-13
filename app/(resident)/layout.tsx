"use client";

import { ReactNode, useState, useEffect } from "react";
import { 
  Menu, 
  X, 
  Home, 
  Bell, 
  Calendar, 
  User, 
  LogOut,
  ShieldCheck,
  Building2,
  FileText,
  Users,
  MessageSquare,
  LayoutDashboard
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ResidentLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: me } = useSWR("/api/profile/me", fetcher);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function checkRole() {
      const res = await fetch("/api/profile/me");
      if (res.ok) {
        const profile = await res.json();
        if (profile.role === "admin") {
          router.push("/admin/dashboard");
        }
        setUserRole(profile.role);
      }
    }
    void checkRole();
  }, [router]);

  const navItems = [
    { label: "Feed", href: "/feed", icon: Home },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Events", href: "/events", icon: Calendar },
    { label: "Profile", href: "/profile/me", icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-[#0B1120] ring-1 ring-white/5 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0 shadow-2xl shadow-black" : "-translate-x-full lg:-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-start px-8 py-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
          </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-8 px-4 overflow-y-auto">

            {/* Quick Links Group */}
            <div className="space-y-4">
              <h3 className="px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                QUICK LINKS
              </h3>
              <div className="space-y-1">
                {[
                  { label: "Feed", href: "/feed", icon: Home },
                  { label: "Notifications", href: "/notifications", icon: Bell },
                ].map((item) => {
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
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-[-16px] h-6 w-1.5 rounded-r-full bg-blue-600 shadow-[2px_0_12px_rgba(37,99,235,0.4)]" />
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
          </nav>

          {/* Footer */}
          <div className="mt-auto px-6 pb-10">
            <button 
              onClick={() => router.push("/login")}
              className="group flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-slate-400 transition-all hover:text-white"
            >
              <LogOut className="h-5 w-5 text-slate-500 transition-all group-hover:rotate-180 group-hover:text-white" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-50"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/20">
                {(userRole === "admin" ? "A" : (me?.name?.charAt(0) || "R"))}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl p-4 py-8 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}



