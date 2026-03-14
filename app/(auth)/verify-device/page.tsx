"use client";

import { Suspense, FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyDeviceForm() {
  const router = useRouter();
  const search = useSearchParams();
  const emailParam = search?.get("email") ?? "";
  const deviceTokenParam = search?.get("device_token") ?? "";

  const [email, setEmail] = useState(emailParam);
  const [deviceToken, setDeviceToken] = useState(deviceTokenParam);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/auth/device/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, device_token: deviceToken }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setError(body?.error ?? "Failed to verify device.");
      setSubmitting(false);
      return;
    }

    setMessage("Device verified. Redirecting to login…");
    setSubmitting(false);

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10 sm:py-16">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-center text-xl font-semibold sm:text-2xl">
          Verify this device
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Enter the 6-digit code we sent to your email to trust this device for
          future logins.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 sm:text-sm">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 sm:text-sm">
              Verification code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg tracking-[0.35em] shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Verifying…" : "Verify device"}
          </button>

          {error && (
            <p className="text-center text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="text-center text-xs text-green-600" role="status">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default function VerifyDevicePage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center p-10 mt-20"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>}>
      <VerifyDeviceForm />
    </Suspense>
  );
}
