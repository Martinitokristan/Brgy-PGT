"use client";

import { ReactNode, useState, useEffect } from "react";
import {
  Home,
  Bell,
  Calendar,
  User,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  Search,
  ChevronRight,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ResidentLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: me } = useSWR("/api/profile/me", fetcher);

  useEffect(() => {
    async function checkRole() {
      const res = await fetch("/api/profile/me");
      if (res.ok) {
        const data = await res.json();
        const isProfilePage = pathname?.startsWith("/profile/");
        
        // If an admin accidentally enters the resident-styled layout area, 
        // redirect them to the proper admin dashboard or specific user view.
        if (data.role === "admin") {
          if (pathname?.startsWith("/profile/")) {
            const userId = pathname.split("/").pop();
            if (userId && userId !== "me") {
              router.push(`/admin/users/${userId}`);
              return;
            }
          }
          router.push("/admin/dashboard");
        }
      }
    }
    void checkRole();
  }, [router, pathname]);

  const bottomTabs = [
    { label: "Home", href: "/feed", icon: Home },
    { label: "Events", href: "/events", icon: Calendar },
    { label: "Alerts", href: "/notifications", icon: Bell },
    { label: "Profile", href: "/profile/me", icon: User },
  ];

  const sidebarLinks = [
    { label: "Feed", href: "/feed", icon: Home },
    { label: "Events", href: "/events", icon: Calendar },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Profile", href: "/profile/me", icon: User },
  ];

  const avatarLetter = me?.name?.charAt(0)?.toUpperCase() || "R";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-[#0B1120] ring-1 ring-white/5 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0 shadow-2xl shadow-black" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-6 py-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg ring-1 ring-white/10">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <span className="text-base font-bold text-white">BarangayPGT</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Info */}
          <div className="mx-4 mb-6 flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {avatarLetter}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{me?.name || "Resident"}</p>
              <p className="truncate text-xs text-slate-400">{me?.email || ""}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 overflow-y-auto">
            {sidebarLinks.map((item) => {
              const Icon = item.icon;
              const safePath = pathname || "";
              const isActive = safePath === item.href || safePath.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 opacity-60" />}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-4 pb-8 mt-4">
            <button
              onClick={() => router.push("/login")}
              className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 transition-all hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-5 w-5 transition-all group-hover:rotate-180" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Top App Bar */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-slate-900">BarangayPGT</span>
        </div>

        {/* Right Actions */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Search className="h-5 w-5" />
        </button>
      </header>

      {/* Main Content — add bottom padding so content isn't hidden behind tab bar */}
      <main className="flex-1 pb-16">
        {children}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch border-t border-slate-200 bg-white">
        {bottomTabs.map((tab) => {
          const Icon = tab.icon;
          const safePath = pathname || "";
          const isActive =
            safePath === tab.href ||
            (tab.href !== "/feed" && safePath.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 1.75} />
              {isActive && (
                <div className="h-0.5 w-6 rounded-full bg-blue-600" />
              )}
            </Link>
          );
        })}
        {/* Menu Tab */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-slate-400 transition-colors hover:text-slate-600"
        >
          <Menu className="h-6 w-6" strokeWidth={1.75} />
        </button>
      </nav>
    </div>
  );
}
