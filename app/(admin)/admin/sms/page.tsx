"use client";

import useSWR from "swr";
import { FormEvent, useState } from "react";

type SmsLog = {
  id: number;
  admin_id: string | null;
  recipient_phone: string;
  message_content: string;
  status: string;
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminSmsPage() {
  const { data, error, isLoading, mutate } = useSWR<SmsLog[]>(
    "/api/admin/sms",
    fetcher
  );

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

    const res = await fetch("/api/admin/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message }),
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
    <div className="flex flex-1 flex-col gap-4 py-4 sm:py-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">SMS console</h1>
          <p className="text-sm text-slate-600">
            Send SMS to residents and view recent SMS logs.
          </p>
        </div>
      </header>

      <section className="rounded-lg border bg-white p-4 text-sm shadow-sm">
        <h2 className="text-sm font-semibold sm:text-base">Send SMS</h2>
        <form className="mt-3 space-y-3" onSubmit={handleSend}>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 sm:text-sm">
              Recipient phone
            </label>
            <input
              type="tel"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+639XXXXXXXXX or 09XXXXXXXXX"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 sm:text-sm">
              Message
            </label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {sending ? "Sending…" : "Send SMS"}
          </button>
          {sendError && (
            <p className="text-xs text-red-600" role="alert">
              {sendError}
            </p>
          )}
          {sendOk && (
            <p className="text-xs text-green-600" role="status">
              {sendOk}
            </p>
          )}
        </form>
      </section>

      <section className="rounded-lg border bg-white p-4 text-sm shadow-sm">
        <h2 className="text-sm font-semibold sm:text-base">Recent SMS logs</h2>
        {isLoading && (
          <p className="mt-2 text-xs text-slate-600">Loading logs…</p>
        )}
        {error && (
          <p className="mt-2 text-xs text-red-600">
            Failed to load logs. Make sure you are logged in as an admin.
          </p>
        )}
        {!isLoading && !error && (
          <div className="mt-3 max-h-80 overflow-auto rounded border border-slate-100">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[11px] uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">To</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Message</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-2 py-1 align-top text-[11px] text-slate-500">
                      {log.created_at}
                    </td>
                    <td className="px-2 py-1 align-top text-[11px] text-slate-700">
                      {log.recipient_phone}
                    </td>
                    <td className="px-2 py-1 align-top text-[11px]">
                      {log.status === "sent" ? (
                        <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 align-top text-[11px] text-slate-700">
                      {log.message_content}
                      {log.error_message && (
                        <div className="mt-1 text-[10px] text-red-600">
                          {log.error_message}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {(data ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-3 text-center text-[11px] text-slate-600"
                    >
                      No SMS logs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

