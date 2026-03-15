"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  User, Bell, Moon, Sun, Globe, Trash2, ChevronRight,
  Lock, Loader2, Eye, EyeOff, AlertTriangle, X, Check,
  MonitorX, Languages,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── Dark mode ────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Explicit check — if not set or "0", default to light
    const stored = localStorage.getItem("brgy_dark") === "1";
    setDark(stored);
    document.documentElement.classList.toggle("dark", stored);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("brgy_dark", next ? "1" : "0");
    // Apply to the whole app immediately
    document.documentElement.classList.toggle("dark", next);
  }

  return { dark, toggle };
}

// ── Notification prefs ───────────────────────────────────────
function useNotifPrefs() {
  const [push, setPush] = useState(false);
  const [email, setEmail] = useState(false);

  useEffect(() => {
    setPush(localStorage.getItem("brgy_notif_push") === "1");
    setEmail(localStorage.getItem("brgy_notif_email") === "1");
  }, []);

  function togglePush() {
    const next = !push;
    setPush(next);
    localStorage.setItem("brgy_notif_push", next ? "1" : "0");
    if (next && "Notification" in window) Notification.requestPermission();
  }

  function toggleEmail() {
    const next = !email;
    setEmail(next);
    localStorage.setItem("brgy_notif_email", next ? "1" : "0");
  }

  return { push, togglePush, email, toggleEmail };
}

// ── Language ─────────────────────────────────────────────────
const LANGS = [
  { code: "en", label: "English (Philippines)" },
  { code: "fil", label: "Filipino (Tagalog)" },
];

function useLang() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    setLang(localStorage.getItem("brgy_lang") || "en");
  }, []);

  function changeLang(code: string) {
    setLang(code);
    localStorage.setItem("brgy_lang", code);
    document.documentElement.lang = code;
    // Dispatch storage event so other components/tabs using useT() pick up the change
    window.dispatchEvent(new StorageEvent("storage", { key: "brgy_lang", newValue: code }));
    // Reload the page so all static text also updates (simple but effective)
    window.location.reload();
  }

  return { lang, changeLang, label: LANGS.find((l) => l.code === lang)?.label ?? "English (Philippines)" };
}

export default function SettingsPage() {
  const { data: me } = useSWR("/api/profile/me", fetcher);
  const router = useRouter();
  const { dark, toggle: toggleDark } = useDarkMode();
  const { push, togglePush, email, toggleEmail } = useNotifPrefs();
  const { lang, changeLang, label: langLabel } = useLang();
  // Dynamic translations based on current language
  const { t } = { t: (key: string) => {
    const stored = lang;
    const maps: Record<string, Record<string, string>> = {
      en: { settings_title: "Settings", settings_subtitle: "Manage your account and preferences", account: "ACCOUNT", edit_profile: "Edit Profile", edit_profile_desc: "Update your name, photo, and contact info", change_password: "Change Password", change_password_desc: "Update your account password", notifications_title: "NOTIFICATIONS", push_notifications: "Push Notifications", push_notifications_desc: "Alerts on your device for new posts", email_notifications: "Email Notifications", email_notifications_desc: "Weekly digest of barangay activity", appearance: "APPEARANCE", dark_mode: "Dark Mode", dark_mode_on: "Dark theme is on", dark_mode_off: "Light theme is on", language: "Language", security_title: "SECURITY", logout_all_devices: "Log Out All Devices", logout_all_desc: "Immediately end all active sessions", log_out: "Log out", account_actions: "ACCOUNT ACTIONS", delete_account: "Delete Account", delete_account_desc: "Deactivate your account (recoverable via email)" },
      fil: { settings_title: "Mga Setting", settings_subtitle: "Pamahalaan ang iyong account at mga kagustuhan", account: "ACCOUNT", edit_profile: "I-edit ang Profile", edit_profile_desc: "I-update ang pangalan, larawan, at contact info", change_password: "Baguhin ang Password", change_password_desc: "I-update ang iyong password", notifications_title: "MGA ABISO", push_notifications: "Push Notifications", push_notifications_desc: "Mga alerto sa device para sa mga bagong post", email_notifications: "Email Notifications", email_notifications_desc: "Lingguhang buod ng mga aktibidad ng barangay", appearance: "HITSURA", dark_mode: "Dark Mode", dark_mode_on: "Naka-on ang dark theme", dark_mode_off: "Naka-on ang light theme", language: "Wika", security_title: "SEGURIDAD", logout_all_devices: "Mag-logout sa Lahat ng Device", logout_all_desc: "Agad na tapusin ang lahat ng aktibong session", log_out: "Mag-logout", account_actions: "MGA AKSYON SA ACCOUNT", delete_account: "Burahin ang Account", delete_account_desc: "I-deactivate ang account (mababawi sa pamamagitan ng email)" },
    };
    return maps[stored]?.[key] ?? maps.en[key] ?? key;
  }};

  // ── Change password ──────────────────────────────────────
  const [showPwModal, setShowPwModal] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const pwStrength = newPw.length === 0 ? 0 : newPw.length < 6 ? 1 : newPw.length < 10 ? 2 : 3;

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg({ type: "err", text: "Passwords do not match." }); return; }
    if (newPw.length < 8) { setPwMsg({ type: "err", text: "Minimum 8 characters required." }); return; }
    setSavingPw(true);
    try {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPw }),
      });
      const d = await res.json();
      if (res.ok) {
        setPwMsg({ type: "ok", text: "Password updated!" });
        setNewPw(""); setConfirmPw("");
        setTimeout(() => { setShowPwModal(false); setPwMsg(null); }, 1800);
      } else {
        setPwMsg({ type: "err", text: d?.error ?? "Failed." });
      }
    } finally { setSavingPw(false); }
  }

  // ── Logout all ───────────────────────────────────────────
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  async function logoutAll() {
    setLoggingOutAll(true);
    await fetch("/api/auth/logout-all", { method: "POST" }).catch(() => {});
    router.push("/");
  }

  // ── Delete account ───────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason }),
      });
      if (res.ok) {
        setDeleteMsg({ type: "ok", text: "Account deactivated. Recovery instructions have been sent to your email." });
        setTimeout(() => router.push("/"), 3000);
      } else {
        const d = await res.json();
        setDeleteMsg({ type: "err", text: d?.error ?? "Failed to delete account." });
      }
    } finally { setDeletingAccount(false); }
  }

  // ── Language picker ───────────────────────────────────────
  const [showLangPicker, setShowLangPicker] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-5 py-5 dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-[22px] font-bold text-slate-900 dark:text-white">{t("settings_title")}</h1>
        <p className="mt-0.5 text-sm text-slate-400">{t("settings_subtitle")}</p>
      </div>

      <div className="mx-auto max-w-lg space-y-3 px-4 pt-4 pb-16">

        {/* ── Account ── */}
        <SettingsCard title={t("account")}>
          <SettingsRow icon={<User size={16} className="text-slate-500" />} label={t("edit_profile")} desc={t("edit_profile_desc")}>
            <button onClick={() => router.push("/profile/me")}><ChevronRight size={16} className="text-slate-300" /></button>
          </SettingsRow>
          <SettingsRow icon={<Lock size={16} className="text-slate-500" />} label={t("change_password")} desc={t("change_password_desc")} last>
            <button onClick={() => { setShowPwModal(true); setPwMsg(null); }}>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          </SettingsRow>
        </SettingsCard>

        {/* ── Notifications ── */}
        <SettingsCard title={t("notifications_title")}>
          <SettingsRow icon={<Bell size={16} className="text-slate-500" />} label={t("push_notifications")} desc={t("push_notifications_desc")}>
            <Toggle on={push} onToggle={togglePush} />
          </SettingsRow>
          <SettingsRow icon={<Bell size={16} className="text-slate-500" />} label={t("email_notifications")} desc={t("email_notifications_desc")} last>
            <Toggle on={email} onToggle={toggleEmail} />
          </SettingsRow>
        </SettingsCard>

        {/* ── Appearance ── */}
        <SettingsCard title={t("appearance")}>
          <SettingsRow
            icon={dark ? <Moon size={16} className="text-indigo-500" /> : <Sun size={16} className="text-amber-500" />}
            label={t("dark_mode")}
            desc={dark ? t("dark_mode_on") : t("dark_mode_off")}
          >
            <Toggle on={dark} onToggle={toggleDark} />
          </SettingsRow>
          <SettingsRow icon={<Languages size={16} className="text-slate-500" />} label={t("language")} desc={langLabel} last>
            <button onClick={() => setShowLangPicker(true)}>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          </SettingsRow>
        </SettingsCard>

        {/* ── Security ── */}
        <SettingsCard title={t("security_title")}>
          <SettingsRow icon={<MonitorX size={16} className="text-slate-500" />} label={t("logout_all_devices")} desc={t("logout_all_desc")} last>
            <button onClick={() => setShowLogoutConfirm(true)} className="text-xs font-bold text-red-500 hover:underline">{t("log_out")}</button>
          </SettingsRow>
        </SettingsCard>

        {/* ── Danger ── */}
        <SettingsCard title={t("account_actions")}>
          <SettingsRow icon={<Trash2 size={16} className="text-red-500" />} label={t("delete_account")} desc={t("delete_account_desc")} last danger>
            <button onClick={() => { setShowDeleteModal(true); setDeleteMsg(null); setDeleteReason(""); }}>
              <ChevronRight size={16} className="text-red-300" />
            </button>
          </SettingsRow>
        </SettingsCard>

        <p className="pb-6 text-center text-[11px] text-slate-300">BarangayPGT v1.0.0 · © 2026</p>
      </div>

      {/* ── Change Password Modal ── */}
      {showPwModal && (
        <Modal onClose={() => setShowPwModal(false)} title="Change Password">
          <form onSubmit={handleChangePw} className="space-y-4">
            {[
              { label: "New Password", value: newPw, set: setNewPw },
              { label: "Confirm Password", value: confirmPw, set: setConfirmPw },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="mb-1 block text-[12px] font-semibold text-slate-500">{label}</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 focus:outline-none"
                />
              </div>
            ))}
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:underline">
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />} {showPw ? "Hide" : "Show"} passwords
            </button>
            {newPw && (
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                pwStrength === 1 ? "bg-red-50 ring-1 ring-red-100" : pwStrength === 2 ? "bg-amber-50 ring-1 ring-amber-100" : "bg-emerald-50 ring-1 ring-emerald-100"
              }`}>
                <div className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  pwStrength === 1 ? "bg-red-500" : pwStrength === 2 ? "bg-amber-500" : "bg-emerald-500"
                }`}>
                  {pwStrength >= 3 ? (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01" /></svg>
                  )}
                </div>
                <span className={`text-[11px] font-bold ${
                  pwStrength === 1 ? "text-red-600" : pwStrength === 2 ? "text-amber-600" : "text-emerald-600"
                }`}>
                  {pwStrength === 1 ? "Weak — Add numbers & special characters" : pwStrength === 2 ? "Fair — Add special characters" : "Strong — Excellent password!"}
                </span>
              </div>
            )}
            {pwMsg && (
              <div className={`rounded-xl px-3 py-2 text-[13px] font-semibold ${pwMsg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {pwMsg.text}
              </div>
            )}
            <button type="submit" disabled={savingPw}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {savingPw ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Update Password"}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Log out all devices confirm ── */}
      {showLogoutConfirm && (
        <Modal onClose={() => setShowLogoutConfirm(false)} title="Log Out All Devices">
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 mb-4">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-[13px] text-red-700">This will end all sessions, including this device. You'll need to log in again.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={logoutAll} disabled={loggingOutAll}
              className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1">
              {loggingOutAll ? <Loader2 size={14} className="animate-spin" /> : "Log Out All"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Account Modal ── */}
      {showDeleteModal && (
        <Modal onClose={() => setShowDeleteModal(false)} title="Deactivate Account">
          {deleteMsg ? (
            <div className={`rounded-xl p-4 text-center text-[14px] font-semibold ${deleteMsg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {deleteMsg.text}
            </div>
          ) : (
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <p className="text-[13px] text-slate-500 leading-relaxed">
                Your account will be <strong>deactivated</strong>, not permanently deleted. You can recover it by sending a recovery request via email to the barangay within <strong>30 days</strong>.
              </p>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-500">Reason (optional)</label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                  placeholder="Tell us why you're leaving..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-[12px] text-amber-800">
                ⚠️ To recover your account, email <strong>support@barangaypgt.gov.ph</strong> with your registered name and reason for recovery.
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowDeleteModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={deletingAccount}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1">
                  {deletingAccount ? <Loader2 size={14} className="animate-spin" /> : "Deactivate"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* ── Language Picker Modal ── */}
      {showLangPicker && (
        <Modal onClose={() => setShowLangPicker(false)} title="Language">
          <div className="space-y-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => { changeLang(l.code); setShowLangPicker(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${lang === l.code ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"}`}
              >
                <span className="text-[14px] font-semibold">{l.label}</span>
                {lang === l.code && <Check size={16} className="text-blue-600" />}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
      <p className="border-b border-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:border-slate-700">
        {title}
      </p>
      {children}
    </div>
  );
}

function SettingsRow({ icon, label, desc, children, last, danger }: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  children: React.ReactNode;
  last?: boolean;
  danger?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${!last ? "border-b border-slate-50 dark:border-slate-700" : ""}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-red-50" : "bg-slate-100 dark:bg-slate-700"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-semibold ${danger ? "text-red-600" : "text-slate-800 dark:text-slate-100"}`}>{label}</p>
        <p className="text-[12px] text-slate-400">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${on ? "bg-blue-600" : "bg-slate-200"}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-5 py-4">
          <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
