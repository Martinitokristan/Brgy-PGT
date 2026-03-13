"use client";

import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    const res = await fetch("/api/auth/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setError(body?.error ?? "Failed to send reset email.");
      setSubmitting(false);
      return;
    }

    setMessage(
      body?.message ??
        "If that email is registered, a reset link has been sent."
    );
    setSubmitting(false);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10 sm:py-16">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-center text-xl font-semibold sm:text-2xl">
          Forgot your password?
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Enter your email address and we will send you a password reset link.
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

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Sending…" : "Send reset link"}
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

