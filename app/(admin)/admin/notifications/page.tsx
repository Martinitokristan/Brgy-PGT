"use client";

import useSWR from "swr";
import { Bell } from "lucide-react";

type Notification = {
  id: number;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  post_id?: number | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

export default function AdminNotificationsPage() {
  const { data: notifications, isLoading, mutate } = useSWR<Notification[]>(
    "/api/notifications",
    fetcher
  );

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    mutate();
  }

  const unread = (notifications ?? []).filter((n) => !n.is_read);

  return (
    <div className="p-4 sm:p-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">Notifications (Admin)</h1>
        </div>
        {unread.length > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-100" />
            ))}
          </div>
        )}

        {!isLoading && (notifications ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
              <Bell className="h-10 w-10 text-slate-200" />
            </div>
            <p className="text-base font-bold text-slate-800">No new notifications</p>
            <p className="mt-1 text-sm text-slate-400">We'll notify you when something happens.</p>
          </div>
        )}

        {(notifications ?? []).map((notif) => (
          <div
            key={notif.id}
            className={`relative flex items-start gap-4 rounded-2xl bg-white px-5 py-5 shadow-sm transition-all ring-1 ring-slate-100 ${
              !notif.is_read ? "border-l-4 border-blue-500" : ""
            }`}
          >
            {/* Icon */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-slate-900 leading-snug">
                {notif.message}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">{formatDate(notif.created_at)}</p>
            </div>

            {/* View Button */}
            {notif.post_id && (
              <a
                href={`/admin/feed`}
                className="shrink-0 self-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
              >
                View
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
