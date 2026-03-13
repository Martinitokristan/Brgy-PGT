/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let token = window.localStorage.getItem("device_token");
    if (!token) {
      token = self.crypto.randomUUID();
      window.localStorage.setItem("device_token", token);
    }
    setDeviceToken(token);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, device_token: deviceToken }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Login failed.");
      setSubmitting(false);
      return;
    }

    const body = await res.json();
    const profile = body?.profile;

    if (body?.pending_device_verification && deviceToken) {
      router.push(
        `/verify-device?email=${encodeURIComponent(email)}&device_token=${encodeURIComponent(
          deviceToken
        )}`
      );
      setSubmitting(false);
      return;
    }

    // Simple redirect logic based on role and approval.
    if (profile?.role === "admin") {
      router.push("/admin/dashboard");
    } else if (profile?.is_approved === false) {
      router.push("/approval-pending");
    } else {
      router.push("/feed");
    }

    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8faff] via-[#edf2ff] to-[#f3f6ff] px-4 py-8">
      <div className="w-full max-w-sm overflow-hidden rounded-[32px] bg-white p-1 shadow-[0_25px_70px_rgba(37,99,235,0.12)]">
        <div className="bg-white px-6 pt-10 pb-8 sm:px-10">
          <div className="mb-8 flex flex-col items-center">
            <div className="logo-badge relative mb-5 flex h-14 w-14 items-center justify-center">
              <div className="absolute inset-0 scale-110 rounded-2xl bg-blue-600/10 blur-xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Barangay Online
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Welcome back! Please sign in.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Mail className="h-3 w-3" />
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:ring-offset-0 ring-1 ring-slate-200"
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Lock className="h-3 w-3" />
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:ring-offset-0 ring-1 ring-slate-200"
                  placeholder="Enter your password"
                />
              </div>
              <div className="flex justify-end pr-1">
                <a
                  href="/forgot-password"
                  className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
                >
                  Forgot Password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group relative mt-2 inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="relative z-10">
                {submitting ? "Signing in..." : "Sign In to Your Account"}
              </span>
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-center transition-all animate-in fade-in slide-in-from-top-1">
                <p className="text-xs font-medium text-red-600" role="alert">
                  {error}
                </p>
              </div>
            )}

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400">or</span>
              </div>
            </div>

            <p className="text-center text-sm text-slate-600 font-medium">
              Don&apos;t have an account?{" "}
              <a
                href="/register"
                className="font-bold text-blue-600 transition-colors hover:text-blue-700 underline-offset-4 hover:underline"
              >
                Register here
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}


