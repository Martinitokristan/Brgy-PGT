"use client";

import Link from "next/link";
import { ShieldCheck, Users, Bell, MessageCircle, Calendar, ArrowRight, Star, MapPin, ChevronRight } from "lucide-react";

const features = [
  { icon: MessageCircle, title: "Community Feed", desc: "Post concerns, updates, and announcements. Comment, react, and engage with your neighbors in real time." },
  { icon: Bell, title: "Instant Alerts", desc: "Get notified immediately when the barangay posts emergencies, events, or important updates." },
  { icon: Calendar, title: "Events", desc: "Stay up to date with community activities, meetings, and barangay events in your area." },
  { icon: Users, title: "Follow Residents", desc: "Connect with fellow residents, follow their updates, and build a stronger community online." },
  { icon: ShieldCheck, title: "Secure & Verified", desc: "Every account is reviewed and approved by barangay admins. Only verified residents can post." },
  { icon: MapPin, title: "Barangay Pagatpatan", desc: "Built exclusively for residents of Barangay Pagatpatan, Cagayan de Oro City." },
];

const testimonials = [
  { name: "Maria S.", role: "Resident", text: "Finally a way to reach our barangay officials directly. It's fast and easy to use!" },
  { name: "Juan D.", role: "Resident", text: "I got notified about the road flooding before it got bad. This app saved me time." },
  { name: "Ana R.", role: "Resident", text: "The approval process made me feel safe knowing everyone is verified." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-[16px] font-extrabold text-slate-900">BarangayPGT</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-xl px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors">
            Join Now
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-20 text-center">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.3),transparent_60%)]" />

        <div className="relative mx-auto max-w-lg">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-white shadow-2xl shadow-blue-900/30">
            <ShieldCheck className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-[32px] font-black leading-tight text-white">
            Your Barangay,<br />Connected.
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-blue-100">
            BarangayPGT is the official digital platform for Barangay Pagatpatan residents — post concerns, stay informed, and build community.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-[15px] font-black text-blue-700 shadow-xl shadow-blue-900/20 hover:bg-blue-50 transition-colors"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/30 px-7 py-3.5 text-[15px] font-bold text-white hover:bg-white/10 transition-colors"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-4 text-[12px] text-blue-200">Free for all verified Barangay Pagatpatan residents</p>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-lg">
          <p className="mb-1 text-center text-[11px] font-black uppercase tracking-wider text-blue-600">Features</p>
          <h2 className="text-center text-[24px] font-black text-slate-900">Everything your barangay needs</h2>
          <p className="mt-2 text-center text-[14px] text-slate-400">Built for the community, by the community.</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
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
          <p className="mb-1 text-center text-[11px] font-black uppercase tracking-wider text-blue-600">Community</p>
          <h2 className="text-center text-[22px] font-black text-slate-900">What residents say</h2>

          <div className="mt-6 space-y-4">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <div className="mb-3 flex items-center gap-1">
                  {[1,2,3,4,5].map((n) => <Star key={n} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-[14px] italic leading-relaxed text-slate-600">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
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
          <p className="mb-1 text-center text-[11px] font-black uppercase tracking-wider text-blue-600">How It Works</p>
          <h2 className="text-center text-[22px] font-black text-slate-900">Getting started is easy</h2>
          <div className="mt-8 space-y-4">
            {[
              { n: "1", title: "Register", desc: "Create your account with your personal information and valid ID." },
              { n: "2", title: "Verify Email", desc: "Click the verification link sent to your Gmail inbox." },
              { n: "3", title: "Wait for Approval", desc: "The barangay admin reviews your ID within 1–2 days." },
              { n: "4", title: "Start Connecting", desc: "Receive an SMS once approved, then log in and join the community." },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
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
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-16 text-center">
        <div className="mx-auto max-w-sm">
          <h2 className="text-[24px] font-black text-white">Ready to join?</h2>
          <p className="mt-2 text-[14px] text-blue-100">Register today and become a verified member of Barangay Pagatpatan's digital community.</p>
          <Link
            href="/register"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-[15px] font-black text-blue-700 shadow-xl hover:bg-blue-50 transition-colors"
          >
            Create Free Account
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white px-5 py-8">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
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
