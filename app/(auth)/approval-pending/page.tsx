"use client";

import { Clock, ShieldCheck, Mail, LogOut, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { useEffect, useState } from "react";

export default function ApprovalPendingPage() {
  const router = useRouter();
  const [justVerified, setJustVerified] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
      setJustVerified(true);
      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({ path: newUrl }, "", newUrl);
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f8faff] via-[#edf2ff] to-[#f3f6ff] px-4">
      <div className="w-full max-w-lg overflow-hidden rounded-[40px] bg-white p-1 shadow-[0_32px_80px_rgba(37,99,235,0.12)]">
        <div className="bg-white px-8 pb-10 pt-12 text-center sm:px-12">
          {/* Animated Header Icon */}
          <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 animate-pulse rounded-[32px] bg-blue-600/10" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl shadow-blue-500/30">
              <Clock className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg ring-4 ring-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900">
            Account Under Review
          </h1>

          {justVerified && (
            <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-100 animate-in fade-in slide-in-from-top-2 duration-700">
               <p className="text-sm font-bold text-emerald-600">
                 Email verified successfully!
               </p>
            </div>
          )}

          <p className="mx-auto mb-10 max-w-sm text-lg font-medium leading-relaxed text-slate-500">
            Thank you for registering with Barangay Pagatpatan. Your residency verification is now in progress.
          </p>

          <div className="grid gap-4 text-left">
            <div className="flex items-start gap-4 rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100 transition-all hover:bg-slate-100/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Email Verified</h3>
                <p className="text-sm text-slate-500">Your email has been successfully confirmed.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-3xl bg-blue-50/50 p-5 ring-1 ring-blue-100/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Verification in Progress</h3>
                <p className="text-sm text-slate-500">An admin is reviewing your Valid ID. This usually takes 1-2 business days.</p>
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            <div className="rounded-2xl bg-blue-600/5 px-6 py-4">
              <p className="text-sm font-semibold text-blue-700">
                Wait for an SMS notification once your account is fully active.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="group inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-slate-600"
            >
              <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Sign out and return later
            </button>
          </div>
        </div>

        {/* Footer Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-700" />
      </div>
    </div>
  );
}
