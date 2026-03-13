"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const passwordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let strength = 0;
    if (pwd.length >= 8) strength += 1;
    if (/[A-Za-z]/.test(pwd)) strength += 1;
    if (/[0-9]/.test(pwd)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 1;
    return strength;
  };

  const isPasswordSecure = (pwd: string) => {
    return pwd.length >= 8 && /[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd);
  };

  useEffect(() => {
    // When user arrives via Supabase reset link, a session is created.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!data.session) {
          setError("Reset link is invalid or has expired.");
        } else {
          setReady(true);
        }
      })
      .catch(() => {
        setError("Could not validate reset link.");
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;

    if (!isPasswordSecure(password)) {
      setError("Password must be at least 8 characters and contain letters and numbers.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      console.error(updateError);
      setError("Failed to update password.");
      setSubmitting(false);
      return;
    }

    setMessage("Password updated. Redirecting to login…");
    setSubmitting(false);

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10 sm:py-16">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-center text-xl font-semibold sm:text-2xl">
          Reset your password
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Choose a new password for your account.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 sm:text-sm">
              New password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Min 8 chars, mix of A-Z & 0-9"
            />
            {/* Strength Indicator */}
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4].map((step) => (
                <div 
                  key={step}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    passwordStrength(password) >= step 
                      ? step <= 2 ? "bg-red-400" : step === 3 ? "bg-amber-400" : "bg-emerald-500"
                      : "bg-slate-100"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 sm:text-sm">
              Confirm password
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                confirm && confirm !== password ? "border-red-500" : "border-slate-300"
              }`}
            />
            {confirm && confirm !== password && (
              <p className="text-[10px] font-bold text-red-500">Passwords do not match</p>
            )}
            {confirm && confirm === password && isPasswordSecure(password) && (
              <p className="text-[10px] font-bold text-emerald-500">Passwords match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !ready}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Updating…" : "Update password"}
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

