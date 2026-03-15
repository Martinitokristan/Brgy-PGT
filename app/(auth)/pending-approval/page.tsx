"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Clock, LogOut, ArrowLeft } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PendingApprovalPage() {
  const router = useRouter();
  const { data: me, mutate } = useSWR("/api/profile/me", fetcher, {
    refreshInterval: 5000, // Poll every 5 seconds
  });

  // Redirect if actually approved
  useEffect(() => {
    if (me?.profile?.is_approved) {
      router.push("/feed");
    }
  }, [me, router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-12">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-500 shadow-inner">
            <Clock size={48} />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Account Pending Approval
        </h1>
        
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Your account is under review. A barangay admin will verify your identity and approve your account.
        </p>
        
        <p className="mt-2 text-sm text-slate-500">
          This usually takes 1–2 days. You&apos;ll receive an SMS notification once approved.
        </p>

        {/* Subtle animated dots to show the page is alive and polling */}
        <div className="my-8 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-amber-500 opacity-60"
              style={{
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>

        <div className="mt-10 border-t border-slate-100 pt-8">
          <p className="mb-6 text-sm text-slate-500">
            You can close this page and come back anytime. Your progress is saved.
          </p>

          <button
            onClick={handleLogout}
            className="group flex w-full items-center justify-center gap-2 text-sm font-semibold text-red-500 transition-colors hover:text-red-600"
          >
            <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
            Log out and try another account
          </button>
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
