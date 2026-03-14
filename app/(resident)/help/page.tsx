"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MessageSquare, Mail, Phone, ExternalLink, HelpCircle } from "lucide-react";

const faqs = [
  { q: "How do I create a post?", a: "Tap the 'What's on your mind?' bar on your feed to open the post composer. Fill in a title, description, category, and optionally attach a photo. Tap Post when ready." },
  { q: "How long does account approval take?", a: "After verifying your email, an admin will review and approve your account within 1–2 business days. You will receive an SMS notification once approved." },
  { q: "How do I change my profile picture?", a: "Go to your Profile tab and tap the camera icon on your profile picture. Select a photo from your gallery. It will upload instantly." },
  { q: "What is the Bell Priority feature?", a: "Bell Priority lets you get instant push notifications whenever a specific resident posts. Go to their profile and tap Following → Bell Priority." },
  { q: "Can I report a post?", a: "Currently, contact the barangay admin directly using the contact details below. A full reporting system is coming soon." },
  { q: "How do I change my password?", a: "Go to Menu → Security → Change Password, or use 'Forgot Password' on the login screen." },
  { q: "What happens when I snooze someone?", a: "Snoozing hides that resident's posts from your feed for 30 days without unfollowing them." },
  { q: "How do I react to a post?", a: "Tap Like to toggle a thumbs-up reaction. Hold (long-press) the Like button to see all reaction emojis and pick one." },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-lg pb-16">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-slate-900">Help & Support</h1>
              <p className="text-[12px] text-slate-400">BarangayPGT Support Center</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 pt-4">
          {/* FAQ */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <p className="border-b border-slate-50 px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
              Frequently Asked Questions
            </p>
            {faqs.map((item, i) => (
              <div key={i} className={i < faqs.length - 1 ? "border-b border-slate-50" : ""}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <p className="text-[14px] font-semibold text-slate-800">{item.q}</p>
                  {open === i ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </button>
                {open === i && (
                  <p className="px-4 pb-4 text-[13px] leading-relaxed text-slate-500">{item.a}</p>
                )}
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <p className="border-b border-slate-50 px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
              Contact Us
            </p>
            <a href="mailto:support@barangaypgt.gov.ph" className="flex items-center gap-4 border-b border-slate-50 px-4 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-slate-800">Email Support</p>
                <p className="text-[12px] text-slate-400">support@barangaypgt.gov.ph</p>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-300" />
            </a>
            <a href="tel:+639000000000" className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <Phone className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-slate-800">Barangay Hall</p>
                <p className="text-[12px] text-slate-400">Mon–Fri 8AM–5PM</p>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-300" />
            </a>
          </div>

          {/* Terms link */}
          <a href="/terms" className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-slate-400" />
              <p className="text-[14px] font-semibold text-slate-700">Terms of Service & Privacy Policy</p>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-300" />
          </a>

          <p className="pb-6 text-center text-[11px] text-slate-300">BarangayPGT v1.0.0 · Barangay Pagatpatan</p>
        </div>
      </div>
    </div>
  );
}
