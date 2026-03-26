"use client";

import { Suspense, FormEvent, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Loader2, ArrowLeft, RefreshCw } from "lucide-react";

function VerifyDeviceForm() {
  const router = useRouter();
  const search = useSearchParams();
  const emailParam = search?.get("email") ?? "";
  const deviceTokenParam = search?.get("device_token") ?? "";

  const [email] = useState(emailParam);
  const [deviceToken] = useState(deviceTokenParam);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleDigitChange(idx: number, val: string) {
    const cleaned = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = cleaned;
    setDigits(next);
    if (cleaned && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? "";
    setDigits(next);
    const lastFilled = Math.min(pasted.length, 5);
    inputRefs.current[lastFilled]?.focus();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "device_verify", email, code, device_token: deviceToken }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setError(body?.error ?? "Invalid or expired code.");
      setSubmitting(false);
      return;
    }

    router.push("/feed");
  }

  async function handleResend() {
    setResending(true);
    setResendMsg(null);
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "device_resend", email, device_token: deviceToken }),
    });
    const body = await res.json().catch(() => null);
    setResending(false);
    if (res.ok) {
      setResendMsg("A new code has been sent to your email.");
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } else {
      setError(body?.error ?? "Failed to resend code.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f0f4ff] via-[#e8eeff] to-[#f5f8ff] px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-[32px] bg-white shadow-[0_20px_60px_rgba(37,99,235,0.15)]">
        <div className="px-8 pb-10 pt-10 text-center sm:px-10">
          {/* Icon */}
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-pulse rounded-[24px] bg-blue-600/10" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-blue-500 to-indigo-700 shadow-xl shadow-blue-500/30">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
          </div>

          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">
            New Device Login
          </h1>
          <p className="mb-2 text-sm font-medium text-slate-500">
            To secure your account, please enter the 6-digit code we sent to
          </p>
          <p className="mb-8 text-sm font-bold text-blue-600">{email}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP Boxes */}
            <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`h-12 w-10 rounded-xl border-2 bg-slate-50 text-center text-lg font-bold text-slate-900 transition-all focus:bg-white focus:outline-none ${
                    d ? "border-blue-500 bg-blue-50/50" : "border-slate-200"
                  } focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting || digits.join("").length < 6}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Verifying…" : "Verify Device"}
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-100">
              <p className="text-xs font-semibold text-red-600">{error}</p>
            </div>
          )}
          {resendMsg && (
            <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
              <p className="text-xs font-semibold text-emerald-600">{resendMsg}</p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-slate-500">Didn&apos;t receive the code?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 transition-colors hover:text-blue-600"
            >
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {resending ? "Sending…" : "Resend Code"}
            </button>

            <div className="flex items-center gap-2 text-slate-300">
              <div className="flex-1 border-t" />
              <span className="text-xs">or</span>
              <div className="flex-1 border-t" />
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel Login
            </button>
          </div>
        </div>
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-700" />
      </div>
    </div>
  );
}

export default function VerifyDevicePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    }>
      <VerifyDeviceForm />
    </Suspense>
  );
}
