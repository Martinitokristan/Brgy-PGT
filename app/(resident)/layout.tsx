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
  Settings,
  HelpCircle,
  Lock,
  MonitorX,
  ChevronRight,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Inline translation maps for the layout
const layoutT: Record<string, Record<string, string>> = {
  en: { menu: "Menu", more: "More", home: "Home", events: "Events", notifications: "Notifications", profile: "Profile", alerts: "Alerts", settings: "Settings", help: "Help & Support", security: "Security", logout: "Logout", log_out_all: "Log out all devices", change_password: "Change Password" },
  fil: { menu: "Menu", more: "Iba Pa", home: "Home", events: "Mga Kaganapan", notifications: "Mga Abiso", profile: "Profile", alerts: "Mga Alerto", settings: "Mga Setting", help: "Tulong at Suporta", security: "Seguridad", logout: "Mag-logout", log_out_all: "Mag-logout sa lahat ng device", change_password: "Baguhin ang Password" },
};

export default function ResidentLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSecurityMenu, setShowSecurityMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: me } = useSWR("/api/profile/me", fetcher);

  // Language support
  const [lang, setLang] = useState("en");
  useEffect(() => {
    setLang(localStorage.getItem("brgy_lang") || "en");
    function onLangChange(e: StorageEvent) {
      if (e.key === "brgy_lang" && e.newValue) setLang(e.newValue);
    }
    window.addEventListener("storage", onLangChange);
    return () => window.removeEventListener("storage", onLangChange);
  }, []);
  const tl = (key: string) => layoutT[lang]?.[key] ?? layoutT.en[key] ?? key;

  useEffect(() => {
    async function checkRole() {
      const res = await fetch("/api/profile/me");
      if (res.ok) {
        const data = await res.json();
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

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const bottomTabs = [
    { label: tl("home"), href: "/feed", icon: Home },
    { label: tl("events"), href: "/events", icon: Calendar },
    { label: tl("alerts"), href: "/notifications", icon: Bell },
    { label: tl("profile"), href: "/profile/me", icon: User },
  ];

  const navLinks = [
    { label: tl("home"), href: "/feed", icon: Home },
    { label: tl("events"), href: "/events", icon: Calendar },
    { label: tl("notifications"), href: "/notifications", icon: Bell },
    { label: tl("profile"), href: "/profile/me", icon: User },
  ];

  const avatarLetter = me?.name?.charAt(0)?.toUpperCase() || "R";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer — Light Theme */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200/80 dark:ring-slate-700 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow">
                <ShieldCheck className="h-4.5 w-4.5 text-white h-5 w-5" />
              </div>
              <span className="text-[15px] font-bold text-slate-800 dark:text-white">BarangayPGT</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Info */}
          <Link
            href="/profile/me"
            onClick={() => setIsSidebarOpen(false)}
            className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 py-3 ring-1 ring-slate-100 dark:ring-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-bold text-white shadow-sm">
              {avatarLetter}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold text-slate-800 dark:text-white">{me?.name || "Resident"}</p>
              <p className="truncate text-[11px] text-slate-400">{me?.email || ""}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
          </Link>

          {/* — Menu Label — */}
          <p className="px-5 pt-5 pb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
            {tl("menu")}
          </p>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const safePath = pathname || "";
              const isActive = safePath === item.href || safePath.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <div className="h-2 w-2 rounded-full bg-blue-600" />}
                </Link>
              );
            })}

            {/* — Divider + More section — */}
            <div className="pt-3 pb-1">
              <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                {tl("more")}
              </p>
            </div>

            {/* Settings */}
            <Link
              href="/settings"
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
            >
              <Settings className="h-5 w-5 text-slate-400" />
              {tl("settings")}
            </Link>

            {/* Help & Support */}
            <Link
              href="/help"
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
            >
              <HelpCircle className="h-5 w-5 text-slate-400" />
              {tl("help")}
            </Link>

            {/* Security */}
            <div>
              <button
                onClick={() => setShowSecurityMenu((v) => !v)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
              >
                <Lock className="h-5 w-5 text-slate-400" />
                <span className="flex-1 text-left">{tl("security")}</span>
                <ChevronRight className={`h-4 w-4 text-slate-300 transition-transform ${showSecurityMenu ? "rotate-90" : ""}`} />
              </button>

              {showSecurityMenu && (
                <div className="mx-2 mt-1 overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-100 dark:ring-slate-700">
                  <button
                    onClick={async () => {
                      await fetch("/api/auth/logout-all", { method: "POST" }).catch(() => {});
                      router.push("/");
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-[13px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <MonitorX className="h-4 w-4 shrink-0" />
                    {tl("log_out_all")}
                  </button>
                  <button
                    onClick={() => {
                      setShowSecurityMenu(false);
                      setIsSidebarOpen(false);
                      router.push("/forgot-password");
                    }}
                    className="flex w-full items-center gap-3 border-t border-slate-100 dark:border-slate-700 px-4 py-3 text-[13px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Lock className="h-4 w-4 shrink-0" />
                    {tl("change_password")}
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Logout at bottom */}
          <div className="border-t border-slate-100 px-3 py-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-bold text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut className="h-5 w-5" />
              {tl("logout")}
            </button>
          </div>
        </div>
      </aside>

      {/* Top App Bar */}
      {pathname?.startsWith("/profile/") ? (
        /* On profile pages: only show back + search */
        <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between bg-transparent px-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow backdrop-blur-sm hover:bg-white transition-colors"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <Link
            href="/search"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow backdrop-blur-sm hover:bg-white transition-colors"
          >
            <Search className="h-4 w-4" />
          </Link>
        </header>
      ) : (
        <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-bold text-slate-900 dark:text-white">BarangayPGT</span>
          </div>

          {/* Search icon routes to /search page */}
          <Link
            href="/search"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Search residents"
          >
            <Search className="h-5 w-5" />
          </Link>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 pb-16 ${pathname?.startsWith("/profile/") ? "-mt-14" : ""}`}>
        {children}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
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
                isActive ? "text-blue-600" : "text-slate-900 dark:text-slate-200"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <div className="h-0.5 w-6 rounded-full bg-blue-600" />
              )}
            </Link>
          );
        })}
        {/* Menu Tab */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-slate-900 dark:text-slate-200 transition-colors hover:text-slate-600"
        >
          <Menu className="h-6 w-6" strokeWidth={2} />
        </button>
      </nav>
    </div>
  );
}
