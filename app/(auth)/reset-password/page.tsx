"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Za-z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const isSecure = password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setError("Reset link is invalid or has expired. Please request a new one.");
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isSecure) { setError("Password must be at least 8 characters with letters and numbers."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError("Failed to update password. Please try again.");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/"), 2000);
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8faff] via-[#edf2ff] to-[#f3f6ff] px-4">
        <div className="w-full max-w-sm overflow-hidden rounded-[32px] bg-white shadow-[0_25px_70px_rgba(37,99,235,0.12)]">
          <div className="px-8 pb-10 pt-12 text-center sm:px-10">
            <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-pulse rounded-[24px] bg-emerald-600/10" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-slate-900">Password Updated!</h1>
            <p className="text-sm font-medium text-slate-500">Redirecting you to sign in…</p>
          </div>
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8faff] via-[#edf2ff] to-[#f3f6ff] px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-[32px] bg-white shadow-[0_25px_70px_rgba(37,99,235,0.12)]">
        <div className="px-8 pb-10 pt-12 sm:px-10">
          <div className="mb-8 text-center">
            <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-[20px] bg-blue-600/10 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
                <Lock className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Reset Password</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">Choose a new strong password.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">New Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars, mix of A-Z & 0-9"
                className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 ring-1 ring-slate-200 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              <div className="flex gap-1 pt-1">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    strength >= s ? s <= 2 ? "bg-red-400" : s === 3 ? "bg-amber-400" : "bg-emerald-500" : "bg-slate-100"
                  }`} />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Confirm Password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                className={`block w-full rounded-2xl border-0 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 ring-1 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 ${
                  confirm && confirm !== password ? "ring-red-400" : "ring-slate-200"
                }`}
              />
              {confirm && confirm !== password && <p className="text-[10px] font-bold text-red-500">Passwords do not match</p>}
              {confirm && confirm === password && isSecure && <p className="text-[10px] font-bold text-emerald-500">Passwords match ✓</p>}
            </div>

            <button
              type="submit"
              disabled={submitting || !ready}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Updating…" : "Update Password"}
            </button>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-100">
                <p className="text-xs font-semibold text-red-600">{error}</p>
              </div>
            )}
          </form>
        </div>
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-700" />
      </div>
    </div>
  );
}
