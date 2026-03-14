"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

export default function VerifySuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // After 3s auto-redirect to approval-pending
    const t = setTimeout(() => {
      router.push("/approval-pending?verified=true");
    }, 3000);
    return () => clearTimeout(t);
  }, [router]);

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
            Email Verified!
          </h1>
          <p className="mx-auto mb-8 max-w-xs text-base font-medium leading-relaxed text-slate-500">
            Your email has been confirmed successfully. Redirecting you to your account status…
          </p>

          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <p className="text-sm font-semibold text-emerald-700">
              Redirecting in a moment…
            </p>
          </div>

          <button
            onClick={() => router.push("/approval-pending?verified=true")}
            className="mt-8 flex items-center justify-center gap-2 mx-auto text-sm font-bold text-slate-400 transition-colors hover:text-slate-600"
          >
            <X className="h-4 w-4" />
            Continue now
          </button>
        </div>
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700" />
      </div>
    </div>
  );
}
