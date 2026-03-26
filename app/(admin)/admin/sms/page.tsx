"use client";

import useSWR from "swr";
import { FormEvent, useState } from "react";
import { Send, History } from "lucide-react";

type SmsLog = {
  id: number;
  admin_id: string | null;
  recipient_phone: string;
  recipient_name: string | null;
  message_content: string;
  status: string;
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatDateTime(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AdminSmsPage() {
  const { data, error, isLoading, mutate } = useSWR<SmsLog[]>("/api/admin?action=sms", fetcher);

  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState<string | null>(null);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setSendError(null);
    setSendOk(null);

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sms", to, message }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok || !body?.success) {
      setSendError(body?.error ?? "Failed to send SMS.");
      setSending(false);
      return;
    }

    setSendOk("SMS sent successfully.");
    setSending(false);
    setMessage("");
    void mutate();
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 pb-8 sm:p-6">
      {/* Send Form Card */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Send className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-bold text-slate-900">Send SMS Message</h1>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              To (Phone Number)
            </label>
            <input
              type="tel"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="e.g. +639171234567"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Message</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending…" : "Send SMS"}
          </button>

          {sendError && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">
              {sendError}
            </p>
          )}
          {sendOk && (
            <p className="rounded-xl bg-green-50 px-4 py-2 text-xs font-semibold text-green-600">
              {sendOk}
            </p>
          )}
        </form>
      </div>

      {/* SMS Logs */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-slate-600" />
          <h2 className="text-base font-bold text-slate-900">SMS Logs</h2>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
            Failed to load logs. Make sure you are logged in as an admin.
          </p>
        )}

        {!isLoading && !error && (data ?? []).length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No SMS logs yet.</p>
        )}

        <div className="flex flex-col gap-3">
          {(data ?? []).map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4"
            >
              {/* Top Row */}
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                  <span className="font-semibold">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    log.status === "sent"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {log.status === "sent" ? "Sent" : "Failed"}
                </span>
              </div>

              {/* Recipient & Admin */}
              <div className="mb-2 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Recipient
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {log.recipient_name && (
                      <span className="text-slate-900">{log.recipient_name} — </span>
                    )}
                    {log.recipient_phone}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Admin
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    Barangay Pagatpatan Official Account
                  </p>
                </div>
              </div>

              {/* Message */}
              <div className="rounded-lg bg-blue-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                  Message Content
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">{log.message_content}</p>
              </div>

              {log.error_message && (
                <p className="mt-2 text-[11px] text-red-600">{log.error_message}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
