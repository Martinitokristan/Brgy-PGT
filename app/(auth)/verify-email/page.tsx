"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, RefreshCw, ArrowLeft } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  // Poll for verification status — auto-redirect when verified
  useEffect(() => {
    if (!email) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/register/status?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.verified) {
          clearInterval(intervalId);
          setTimeout(() => {
            router.push("/approval-pending?verified=true");
          }, 1000);
        }
      } catch (err) {
        console.error("Status polling error:", err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [email, router]);

  async function handleResend() {
    setResending(true);
    setResendMsg(null);
    try {
      const res = await fetch("/api/auth/register/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendMsg("Verification email sent! Check your Gmail.");
      } else {
        setResendMsg(data?.error ?? "Failed to resend email.");
      }
    } catch {
      setResendMsg("Failed to resend email. Please try again.");
    }
    setResending(false);
  }

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8faff] via-[#edf2ff] to-[#f3f6ff] px-4">
        <div className="text-center">
          <p className="text-sm text-slate-500">No email provided.</p>
          <button onClick={() => router.push("/")} className="mt-4 text-sm font-bold text-blue-600 hover:underline">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8faff] via-[#edf2ff] to-[#f3f6ff] px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-[40px] bg-white p-1 shadow-[0_25px_70px_rgba(37,99,235,0.1)]">
        <div className="bg-white px-8 pb-12 pt-12 text-center sm:px-12">
          {/* Animated Mail Icon */}
          <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 scale-110 animate-pulse rounded-[32px] bg-blue-600/10" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl shadow-blue-500/30">
              <Mail className="h-10 w-10 text-white" />
            </div>
          </div>

          <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
            Verify Your Email
          </h1>
          <p className="mb-2 text-sm font-medium leading-relaxed text-slate-500">
            We&apos;ve sent a verification link to
          </p>
          <p className="mb-6 text-sm font-bold text-slate-900">{email}</p>
          <p className="mb-8 text-xs leading-relaxed text-slate-400">
            Click the link in your email to verify your account. The link expires in <strong className="text-slate-600">15 minutes</strong>.
            If you don&apos;t see it, check your spam folder.
          </p>

          {/* Polling indicator */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-blue-500"
                  style={{
                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-slate-400">Waiting for verification...</span>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleResend}
              disabled={resending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Sending..." : "Resend Verification Email"}
            </button>

            {resendMsg && (
              <p className={`text-sm font-medium ${resendMsg.includes("sent") ? "text-emerald-600" : "text-red-500"}`}>
                {resendMsg}
              </p>
            )}

            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-400 transition-colors hover:text-slate-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Home
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8faff] via-[#edf2ff] to-[#f3f6ff]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
