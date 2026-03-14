"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, MonitorX, Eye, EyeOff, ShieldCheck, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";

export default function SecurityPage() {
  const router = useRouter();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [changing, setChanging] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg({ type: "error", text: "Passwords do not match." }); return; }
    if (newPw.length < 8) { setPwMsg({ type: "error", text: "Password must be at least 8 characters." }); return; }
    setChanging(true);
    try {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg({ type: "success", text: "Password changed successfully!" });
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      } else {
        setPwMsg({ type: "error", text: data?.error ?? "Failed to change password." });
      }
    } finally { setChanging(false); }
  }

  async function handleLogoutAll() {
    setLoggingOut(true);
    await fetch("/api/auth/logout-all", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  const pwStrength = newPw.length === 0 ? 0 : newPw.length < 6 ? 1 : newPw.length < 10 ? 2 : 3;
  const pwStrengthLabel = ["", "Weak", "Fair", "Strong"][pwStrength];
  const pwStrengthColor = ["", "bg-red-400", "bg-amber-400", "bg-emerald-500"][pwStrength];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-lg pb-16">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-slate-900">Security</h1>
              <p className="text-[12px] text-slate-400">Protect your BarangayPGT account</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 pt-4">
          {/* Change Password */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-50 px-4 py-3">
              <Lock className="h-4 w-4 text-blue-600" />
              <p className="text-[13px] font-bold text-slate-700">Change Password</p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4 px-4 py-4">
              {[
                { label: "Current Password", value: currentPw, set: setCurrentPw },
                { label: "New Password", value: newPw, set: setNewPw },
                { label: "Confirm New Password", value: confirmPw, set: setConfirmPw },
              ].map(({ label, value, set }) => (
                <div key={label} className="relative">
                  <label className="mb-1 block text-[12px] font-semibold text-slate-500">{label}</label>
                  <input
                    type={showPw ? "text" : "password"}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:bg-white"
                    required
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:underline"
              >
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                {showPw ? "Hide" : "Show"} passwords
              </button>

              {/* Strength bar */}
              {newPw && (
                <div>
                  <div className="flex h-1.5 w-full gap-1">
                    {[1,2,3].map((n) => (
                      <div key={n} className={`flex-1 rounded-full transition-colors ${pwStrength >= n ? pwStrengthColor : "bg-slate-100"}`} />
                    ))}
                  </div>
                  <p className={`mt-1 text-[11px] font-bold ${pwStrength === 1 ? "text-red-500" : pwStrength === 2 ? "text-amber-600" : "text-emerald-600"}`}>
                    {pwStrengthLabel}
                  </p>
                </div>
              )}

              {pwMsg && (
                <div className={`rounded-xl px-3 py-2 text-[13px] font-semibold ${pwMsg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {pwMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={changing}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {changing ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Update Password"}
              </button>
            </form>
          </div>

          {/* Active Sessions */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-50 px-4 py-3">
              <MonitorX className="h-4 w-4 text-red-500" />
              <p className="text-[13px] font-bold text-slate-700">Active Sessions</p>
            </div>
            <div className="px-4 py-4">
              <p className="mb-3 text-[13px] text-slate-500 leading-relaxed">
                If you think someone else has access to your account, you can immediately log out of all devices including this one.
              </p>
              {!showLogoutConfirm ? (
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <MonitorX size={16} />
                  Log out of all devices
                </button>
              ) : (
                <div className="rounded-xl bg-red-50 p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <p className="text-[13px] text-red-700 font-semibold">Are you sure? You will be logged out everywhere including this device.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogoutAll}
                      disabled={loggingOut}
                      className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loggingOut ? <Loader2 size={14} className="animate-spin" /> : "Yes, log out all"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
