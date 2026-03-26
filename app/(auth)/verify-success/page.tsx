"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

function VerifySuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (error) return;
    // Count down then redirect to feed
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push("/feed");
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [error, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8faff] via-[#edf2ff] to-[#f3f6ff] px-4">
        <div className="w-full max-w-md overflow-hidden rounded-[40px] bg-white p-1 shadow-[0_32px_80px_rgba(37,99,235,0.12)]">
          <div className="bg-white px-8 pb-10 pt-12 text-center sm:px-12">
            <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-pulse rounded-[32px] bg-red-600/10" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-red-500 to-red-700 shadow-xl shadow-red-500/30">
                <XCircle className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900">
              Verification Failed
            </h1>
            <p className="mx-auto mb-8 max-w-xs text-base font-medium leading-relaxed text-slate-500">
              {error}
            </p>
            <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
              <p className="text-sm font-semibold text-red-700">
                You may close this tab and try registering again.
              </p>
            </div>
          </div>
          <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-rose-600 to-red-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8faff] via-[#edf2ff] to-[#f3f6ff] px-4">
      <div className="w-full max-w-md overflow-hidden rounded-[40px] bg-white p-1 shadow-[0_32px_80px_rgba(37,99,235,0.12)]">
        <div className="bg-white px-8 pb-10 pt-12 text-center sm:px-12">
          <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 animate-pulse rounded-[32px] bg-emerald-600/10" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl shadow-emerald-500/30">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
          </div>

          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900">
            Email Verified! 🎉
          </h1>
          <p className="mx-auto mb-6 max-w-xs text-base font-medium leading-relaxed text-slate-500">
            Your email has been confirmed. Redirecting you to your feed in a moment...
          </p>

          <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              <p className="text-sm font-bold text-emerald-700">
                Redirecting to feed in {countdown}s...
              </p>
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700" />
      </div>
    </div>
  );
}

export default function VerifySuccessPage() {
  return (
    <Suspense>
      <VerifySuccessContent />
    </Suspense>
  );
}
