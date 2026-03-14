"use client";

import { FormEvent, useState } from "react";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const body = await res.json().catch(() => null);
    setSubmitting(false);

    if (!res.ok) {
      setError(body?.error ?? "Failed to send reset email. Please try again.");
      return;
    }

    setSent(true);
  }

  if (sent) {
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
            <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-slate-900">Check your Gmail</h1>
            <p className="mb-6 text-sm font-medium leading-relaxed text-slate-500">
              We sent a password reset link to <strong className="text-slate-900">{email}</strong>. 
              Click the link in the email to set a new password.
            </p>
            <div className="rounded-2xl bg-slate-50 px-5 py-4 ring-1 ring-slate-100">
              <p className="text-xs font-semibold text-slate-500">The link expires in 60 minutes.</p>
            </div>
            <a
              href="/login"
              className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </a>
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
                <Mail className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Forgot Password?</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 ring-1 ring-slate-200 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Sending…" : "Send Reset Link"}
            </button>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-100">
                <p className="text-xs font-semibold text-red-600">{error}</p>
              </div>
            )}

            <a
              href="/login"
              className="flex items-center justify-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </a>
          </form>
        </div>
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-700" />
      </div>
    </div>
  );
}
