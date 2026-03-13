"use client";

import { CheckCircle2, X } from "lucide-react";

export default function VerifySuccessPage() {
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
            Verified Successfully!
          </h1>
          <p className="mx-auto mb-8 max-w-xs text-lg font-medium leading-relaxed text-slate-500">
            Your email has been confirmed. You can now close this tab and return to your registration window.
          </p>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-sm font-semibold text-slate-600">
              Redirecting you on your other window...
            </p>
          </div>
          
          <button 
            onClick={() => window.close()}
            className="mt-8 text-sm font-bold text-slate-400 transition-colors hover:text-slate-600 flex items-center justify-center gap-2 mx-auto"
          >
            <X className="h-4 w-4" />
            Close this tab
          </button>
        </div>
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700" />
      </div>
    </div>
  );
}
