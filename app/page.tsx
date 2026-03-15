"use client";

import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Users, Bell, MessageCircle, Calendar, ArrowRight, Star, MapPin, ChevronRight, Mail, Lock, X, Loader2, AlertTriangle, Megaphone } from "lucide-react";

const features = [
  { icon: AlertTriangle, title: "File Complaints", desc: "Report issues like road damage, noise, flooding, or illegal activities directly to barangay officials in seconds." },
  { icon: MessageCircle, title: "Community Feed", desc: "Post concerns, updates, and engage with neighbors. React, comment, and discuss issues affecting your community." },
  { icon: Bell, title: "Real-Time Alerts", desc: "Get instant notifications about emergencies, advisories, and updates from barangay officials." },
  { icon: Megaphone, title: "Official Announcements", desc: "Stay informed with verified posts from barangay admins about programs, schedules, and public notices." },
  { icon: Calendar, title: "Barangay Events", desc: "Never miss community events, meetings, clean-up drives, or government programs in your area." },
  { icon: ShieldCheck, title: "Verified Residents Only", desc: "Every account is reviewed by barangay admins. Only verified residents of Brgy. Pagatpatan can participate." },
];

const testimonials = [
  { name: "Maria S.", role: "Purok 3 Resident", text: "I reported a broken streetlight and it was fixed in 3 days. Before this, I had no idea who to contact!" },
  { name: "Juan D.", role: "Purok 7 Resident", text: "I got notified about road flooding before it got bad. This app saved me from getting stranded." },
  { name: "Ana R.", role: "Purok 11 Resident", text: "Now I can see what concerns other residents have. It feels like the community is finally connected." },
];

export default function LandingPage() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let token = window.localStorage.getItem("device_token");
    if (!token) {
      token = self.crypto.randomUUID();
      window.localStorage.setItem("device_token", token);
    }
    setDeviceToken(token);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showLogin) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [showLogin]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email, password, device_token: deviceToken }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Login failed.");
      setSubmitting(false);
      return;
    }
    const body = await res.json();
    const profile = body?.profile;
    // Unverified email — redirect to verify-email page (can resend there)
    if (body?.needs_verification && body?.redirect_to) {
      router.push(body.redirect_to);
      setSubmitting(false);
      return;
    }
    if (body?.pending_approval) {
      router.push("/approval-pending");
      setSubmitting(false);
      return;
    }
    if (body?.pending_device_verification && deviceToken) {
      router.push(`/verify-device?email=${encodeURIComponent(email)}&device_token=${encodeURIComponent(deviceToken)}`);
      setSubmitting(false);
      return;
    }
    if (profile?.role === "admin") router.push("/admin/dashboard");
    else if (profile?.is_approved === false) router.push("/approval-pending");
    else router.push("/feed");
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Sign In Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowLogin(false); setError(null); }} />
          <div className="relative z-10 w-full max-w-sm mx-4 overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="px-7 pt-8 pb-7">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-600/30">
                    <ShieldCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Welcome Back</h2>
                    <p className="text-[12px] text-slate-400">Sign in to your account</p>
                  </div>
                </div>
                <button onClick={() => { setShowLogin(false); setError(null); }} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <Mail className="h-3 w-3" /> Email
                  </label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="block w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <Lock className="h-3 w-3" /> Password
                  </label>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="block w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all" />
                  <div className="flex justify-end pr-1">
                    <Link href="/forgot-password" className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">Forgot Password?</Link>
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98] disabled:opacity-60">
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign In"}
                </button>
                {error && (
                  <div className="rounded-xl bg-red-50 p-3 text-center">
                    <p className="text-xs font-medium text-red-600">{error}</p>
                  </div>
                )}
                <p className="text-center text-sm text-slate-500">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="font-bold text-blue-600 hover:underline">Register</Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-[16px] font-extrabold text-slate-900">BarangayPGT</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLogin(true)} className="rounded-xl px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            Sign In
          </button>
          <Link href="/register" className="rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors">
            Join Now
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#312e81] px-6 py-24 text-center">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(67,56,202,0.3),transparent_60%)]" />

        <div className="relative mx-auto max-w-lg">
          <div className="logo-badge mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-white shadow-2xl shadow-blue-900/40">
            <Megaphone className="h-10 w-10 text-[#1e3a8a]" />
          </div>
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">Online Complaint &amp; Community Network</p>
          <h1 className="text-[32px] font-black leading-tight text-white drop-shadow-sm">
            Report. Connect.<br />Get Heard.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-blue-200/90">
            The exclusive online platform for Barangay Pagatpatan residents — file complaints, post concerns, and stay updated with your community. 100% free.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-[15px] font-black text-[#1e3a8a] shadow-xl shadow-blue-900/30 hover:bg-blue-50 transition-colors"
            >
              Register for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setShowLogin(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-white/30 px-7 py-3.5 text-[15px] font-bold text-white hover:bg-white/10 transition-colors"
            >
              Sign In
            </button>
          </div>
          <p className="mt-4 text-[12px] text-blue-300/70">No fees, no hidden charges — free for all verified residents</p>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-lg">
          <p className="mb-1 text-center text-[11px] font-black uppercase tracking-wider text-[#1e40af]">Why BarangayPGT?</p>
          <h2 className="text-center text-[24px] font-black text-slate-900">Your voice matters here</h2>
          <p className="mt-2 text-center text-[14px] text-slate-400">File complaints, get updates, and connect with your barangay — all in one place, all for free.</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e3a8a]">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-50 px-5 py-14">
        <div className="mx-auto max-w-lg">
          <p className="mb-1 text-center text-[11px] font-black uppercase tracking-wider text-[#1e40af]">From Our Residents</p>
          <h2 className="text-center text-[22px] font-black text-slate-900">Real impact, real stories</h2>

          <div className="mt-6 space-y-4">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <div className="mb-3 flex items-center gap-1">
                  {[1,2,3,4,5].map((n) => <Star key={n} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-[14px] italic leading-relaxed text-slate-600">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e3a8a] text-xs font-bold text-white">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">{t.name}</p>
                    <p className="text-[11px] text-slate-400">{t.role} · Brgy. Pagatpatan</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-14">
        <div className="mx-auto max-w-lg">
          <p className="mb-1 text-center text-[11px] font-black uppercase tracking-wider text-[#1e40af]">How It Works</p>
          <h2 className="text-center text-[22px] font-black text-slate-900">Join in 4 easy steps — it&apos;s free</h2>
          <div className="mt-8 space-y-4">
            {[
              { n: "1", title: "Register for Free", desc: "Fill in your details and upload a valid ID. No fees, no payments — completely free for all residents." },
              { n: "2", title: "Verify Your Email", desc: "Click the verification link we send to your Gmail. The link expires in 15 minutes." },
              { n: "3", title: "Admin Approval", desc: "A barangay admin reviews your ID and approves your account within 1–2 days." },
              { n: "4", title: "Start Reporting", desc: "Once approved, log in and start filing complaints, posting concerns, and engaging with your community." },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a] text-sm font-black text-white">
                  {step.n}
                </div>
                <div className="pt-0.5">
                  <p className="text-[15px] font-bold text-slate-900">{step.title}</p>
                  <p className="text-[13px] text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#1e3a8a] to-[#312e81] px-6 py-16 text-center">
        <div className="mx-auto max-w-sm">
          <h2 className="text-[24px] font-black text-white">Have a concern?</h2>
          <p className="mt-2 text-[14px] text-blue-100">Register now for free and let your barangay know. Your complaints and concerns deserve to be heard.</p>
          <Link
            href="/register"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-[15px] font-black text-[#1e3a8a] shadow-xl hover:bg-blue-50 transition-colors"
          >
            Register for Free
            <ChevronRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-[11px] text-blue-300/60">No payment required. Exclusive for Brgy. Pagatpatan residents.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white px-5 py-8">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1e3a8a]">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="text-[14px] font-bold text-slate-700">BarangayPGT</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="text-[12px] text-slate-400 hover:text-slate-600">Terms</Link>
              <Link href="/help" className="text-[12px] text-slate-400 hover:text-slate-600">Help</Link>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-300">
            © 2026 Barangay Pagatpatan, Cagayan de Oro City. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
