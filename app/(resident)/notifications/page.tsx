"use client";

import useSWR from "swr";
import { 
  Bell, 
  CheckCircle2, 
  MessageCircle, 
  AlertTriangle,
  Clock,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  post_id: number | null;
  created_at: string;
};

export default function NotificationsPage() {
  const { data: notifications, mutate } = useSWR<Notification[]>("/api/notifications", fetcher);

  async function markAllAsRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    void mutate();
  }

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col py-6 sm:py-10">
      <div className="flex items-center justify-between px-4 sm:px-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <Bell className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Notifications</h1>
        </div>
        
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-sm font-bold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="mt-8 space-y-3 px-4 sm:px-0">
        {notifications?.map((notif) => (
          <div 
            key={notif.id}
            className={`group relative flex gap-4 rounded-3xl border p-4 transition-all ${
              notif.is_read 
                ? "border-slate-100 bg-white" 
                : "border-blue-100 bg-blue-50/50 shadow-sm"
            }`}
          >
            {/* Icon */}
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              notif.type === "urgent" ? "bg-rose-100 text-rose-600" :
              notif.type === "comment" ? "bg-blue-100 text-blue-600" :
              "bg-slate-100 text-slate-600"
            }`}>
              {notif.type === "urgent" ? <AlertTriangle className="h-6 w-6" /> :
               notif.type === "comment" ? <MessageCircle className="h-6 w-6" /> :
               <Bell className="h-6 w-6" />}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1">
              <div className="flex items-start justify-between">
                <h3 className={`text-sm font-bold ${notif.is_read ? "text-slate-900" : "text-blue-900"}`}>
                  {notif.title}
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <Clock className="h-3 w-3" />
                  {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-slate-600">{notif.message}</p>
              
              {notif.post_id && (
                <Link 
                  href={`/posts/${notif.post_id}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                >
                  <span>View Post</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>

            {/* Unread Dot */}
            {!notif.is_read && (
              <div className="absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-600"></div>
            )}
          </div>
        ))}

        {notifications?.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-slate-900">All caught up!</h3>
            <p className="max-w-[200px] text-sm text-slate-500">You don't have any new notifications at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
