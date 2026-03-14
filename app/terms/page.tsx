import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Terms of Service | BarangayPGT" };

export default function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      body: `By registering for and using BarangayPGT ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Platform. These terms apply to all users, including residents, barangay officials, and administrators.`,
    },
    {
      title: "2. Eligibility",
      body: `The Platform is exclusively available to verified residents of Barangay Pagatpatan, Cagayan de Oro City. You must be at least 13 years of age. Accounts are subject to approval by a barangay administrator. Providing false information during registration may result in permanent suspension.`,
    },
    {
      title: "3. Account Registration & Security",
      body: `You are responsible for maintaining the confidentiality of your password and account. You agree to notify the barangay admin immediately if you suspect unauthorized use. BarangayPGT is not liable for losses resulting from unauthorized account access. You may not create accounts for others or impersonate any person.`,
    },
    {
      title: "4. User Content",
      body: `You retain ownership of content you post. By posting, you grant BarangayPGT a non-exclusive, royalty-free license to display and distribute your content within the Platform. You agree NOT to post: hateful, threatening, or harassing content; illegal content; spam or unsolicited promotions; content that violates the privacy of others; or false information about the barangay or its officials.`,
    },
    {
      title: "5. Acceptable Use",
      body: `You agree to use the Platform only for lawful purposes and in a manner consistent with community welfare. Prohibited activities include: attempting to gain unauthorized access to other accounts; distributing malware; engaging in vote manipulation; using automated tools to scrape or abuse the Platform; and any activity that disrupts the Platform's normal functioning.`,
    },
    {
      title: "6. Content Moderation",
      body: `Barangay administrators reserve the right to remove any content that violates these terms without notice. Repeated violations may result in account suspension or permanent ban. Administrators may update post statuses and add official responses to community concerns.`,
    },
    {
      title: "7. Privacy",
      body: `We collect personal information including your name, email, phone number, and address for the purpose of account verification and community management. This information is shared only with barangay officials as required for governance purposes. We do not sell your data to third parties. By using the Platform, you consent to receiving SMS notifications regarding your account status and barangay updates.`,
    },
    {
      title: "8. Intellectual Property",
      body: `The BarangayPGT name, logo, design, and software are the intellectual property of the Barangay Pagatpatan technology project. You may not reproduce or redistribute any part of the Platform without prior written consent from authorized barangay officials.`,
    },
    {
      title: "9. Disclaimer of Warranties",
      body: `The Platform is provided "as is" without warranties of any kind. BarangayPGT does not guarantee uninterrupted access, accuracy of all user-submitted content, or that the Platform will be free from errors or security vulnerabilities. Use of the Platform is at your own risk.`,
    },
    {
      title: "10. Limitation of Liability",
      body: `BarangayPGT and its administrators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform, including but not limited to data loss, service interruptions, or unauthorized access to your account.`,
    },
    {
      title: "11. Changes to Terms",
      body: `We reserve the right to modify these Terms at any time. Continued use of the Platform after changes constitutes your acceptance of the new terms. Users will be notified of significant changes via email or Platform announcement.`,
    },
    {
      title: "12. Governing Law",
      body: `These Terms are governed by the laws of the Republic of the Philippines. Any disputes shall be resolved under the jurisdiction of the appropriate courts of Cagayan de Oro City, Misamis Oriental.`,
    },
    {
      title: "13. Contact",
      body: `For questions about these Terms, contact the Barangay Pagatpatan Hall at barangaypgt@cagayan.gov.ph or visit the barangay hall during office hours (Monday–Friday, 8AM–5PM).`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-extrabold text-slate-900">BarangayPGT</span>
        </Link>
        <Link href="/register" className="rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-blue-700">
          Join Now
        </Link>
      </nav>

      <div className="mx-auto max-w-2xl px-5 py-10 pb-20">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-[28px] font-black text-slate-900">Terms of Service</h1>
          <p className="mt-2 text-[13px] text-slate-400">Effective Date: January 1, 2026 · Last updated: March 1, 2026</p>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-500">
            Please read these Terms of Service carefully before using BarangayPGT. By accessing or using our Platform, you agree to be bound by these terms.
          </p>
        </div>

        {/* Quick summary box */}
        <div className="mb-8 rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100">
          <p className="text-[13px] font-bold text-blue-800 mb-2">📋 Quick Summary</p>
          <ul className="space-y-1 text-[13px] text-blue-700">
            <li>✅ Only verified Barangay Pagatpatan residents may use this Platform</li>
            <li>✅ Keep your content respectful and truthful</li>
            <li>✅ Your data is used only for community governance</li>
            <li>✅ Administrators may moderate content to maintain community safety</li>
            <li>✅ These terms are governed by Philippine law</li>
          </ul>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <h2 className="mb-3 text-[16px] font-black text-slate-900">{section.title}</h2>
              <p className="text-[14px] leading-relaxed text-slate-500">{section.body}</p>
            </div>
          ))}
        </div>

        {/* Agreement footer */}
        <div className="mt-8 rounded-2xl bg-slate-900 p-6 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-blue-400" />
          <p className="text-[14px] font-bold text-white">By using BarangayPGT, you agree to these terms.</p>
          <p className="mt-1 text-[12px] text-slate-400">For questions, contact the Barangay Hall or email our support team.</p>
          <Link
            href="/register"
            className="mt-4 inline-block rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white px-5 py-6 text-center">
        <p className="text-[11px] text-slate-300">© 2026 Barangay Pagatpatan, Cagayan de Oro City · All rights reserved</p>
      </footer>
    </div>
  );
}
