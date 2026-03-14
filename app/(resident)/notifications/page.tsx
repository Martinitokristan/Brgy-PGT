"use client";

import useSWR, { mutate as globalMutate } from "swr";
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

export default function NotificationsPage() {
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
    <div>
      {/* Page Header */}
      <div className="bg-white px-4 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-slate-800" />
            <h1 className="text-lg font-bold text-slate-900">Notifications</h1>
          </div>
          {unread.length > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        )}

        {!isLoading && (notifications ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
              <Bell className="h-10 w-10 text-slate-300" />
            </div>
            <p className="text-base font-bold text-slate-800">You&apos;re all caught up!</p>
            <p className="mt-1 text-sm text-slate-400">No notifications to show right now.</p>
          </div>
        )}

        {(notifications ?? []).map((notif) => (
          <div
            key={notif.id}
            className={`relative flex items-start gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm transition-all ${
              !notif.is_read ? "border-l-4 border-blue-500" : "border-l-4 border-transparent"
            }`}
          >
            {/* Icon */}
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
              <Bell className="h-5 w-5 text-blue-500" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                {notif.message}
              </p>
              <p className="mt-1 text-xs text-slate-400">{formatDate(notif.created_at)}</p>
            </div>

            {/* View Button */}
            {notif.post_id && (
              <a
                href={`/feed`}
                className="shrink-0 self-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
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
