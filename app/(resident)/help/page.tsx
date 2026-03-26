"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MessageSquare, Mail, Phone, ExternalLink, HelpCircle } from "lucide-react";
import { useT } from "@/lib/useT";

const faqKeys = [
  { q: "faq_create_post", a: "faq_create_post_a" },
  { q: "faq_approval", a: "faq_approval_a" },
  { q: "faq_profile_pic", a: "faq_profile_pic_a" },
  { q: "faq_bell", a: "faq_bell_a" },
  { q: "faq_report", a: "faq_report_a" },
  { q: "faq_password", a: "faq_password_a" },
  { q: "faq_snooze", a: "faq_snooze_a" },
  { q: "faq_react", a: "faq_react_a" },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(null);
  const { t } = useT();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-lg pb-16">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-slate-900 dark:text-white">{t("help_title")}</h1>
              <p className="text-[12px] text-slate-400">{t("help_subtitle")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 pt-4">
          {/* FAQ */}
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
            <p className="border-b border-slate-50 dark:border-slate-700 px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
              {t("faq_title")}
            </p>
            {faqKeys.map((item, i) => (
              <div key={i} className={i < faqKeys.length - 1 ? "border-b border-slate-50 dark:border-slate-700" : ""}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">{t(item.q)}</p>
                  {open === i ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </button>
                {open === i && (
                  <p className="px-4 pb-4 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{t(item.a)}</p>
                )}
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
            <p className="border-b border-slate-50 dark:border-slate-700 px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
              {t("contact_us")}
            </p>
            <a href="mailto:support@barangaypgt.gov.ph" className="flex items-center gap-4 border-b border-slate-50 dark:border-slate-700 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">{t("email_support")}</p>
                <p className="text-[12px] text-slate-400">support@barangaypgt.gov.ph</p>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-300" />
            </a>
            <a href="tel:+639000000000" className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <Phone className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">{t("barangay_hall")}</p>
                <p className="text-[12px] text-slate-400">{t("barangay_hall_hours")}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-300" />
            </a>
          </div>

          {/* Terms link */}
          <a href="/terms" className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 px-4 py-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-slate-400" />
              <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">{t("terms_privacy")}</p>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-300" />
          </a>

          <p className="pb-6 text-center text-[11px] text-slate-300">BarangayPGT v1.0.0 · Barangay Pagatpatan</p>
        </div>
      </div>
    </div>
  );
}
