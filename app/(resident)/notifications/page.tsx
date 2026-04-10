"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useSWRConfig } from "swr";
import { Bell, X, MoreHorizontal, Trash2, BellOff, UserX } from "lucide-react";
import { useT } from "@/lib/useT";

type Notification = {
  id: number;
  type: string;
  title?: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  post_id?: number | null;
  comment_id?: number | null;
  source_user_id?: string | null;
};


function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

export default function NotificationsPage() {
  const { data: notifications, isLoading, mutate } = useSWR<Notification[]>(
    "/api/notifications",
    fetcher
  );
  const { mutate: mutateGlobal } = useSWRConfig();

  const [openNotif, setOpenNotif] = useState<Notification | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    await mutate();
    // keep bell badge in sync immediately
    void mutateGlobal("/api/notifications?action=unread_count");
  }

  async function markOneRead(id: number) {
    const target = (notifications ?? []).find((n) => n.id === id);
    if (target && !target.is_read) {
      mutateGlobal(
        "/api/notifications?action=unread_count",
        (current: { count: number } | undefined) => ({ count: Math.max(0, (current?.count ?? 0) - 1) }),
        { revalidate: false }
      );
    }
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", id }),
    });
    await mutate();
    void mutateGlobal("/api/notifications?action=unread_count");
  }

  async function deleteNotification(notif: Notification) {
    if (!notif.is_read) {
      mutateGlobal(
        "/api/notifications?action=unread_count",
        (current: { count: number } | undefined) => ({ count: Math.max(0, (current?.count ?? 0) - 1) }),
        { revalidate: false }
      );
    }
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: notif.id }),
    });
    if (openNotif?.id === notif.id) setOpenNotif(null);
    setOpenMenuId(null);
    await mutate();
    void mutateGlobal("/api/notifications?action=unread_count");
  }

  async function mutePostFromNotif(notif: Notification) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mute_post", id: notif.id }),
    });
    if (openNotif?.id === notif.id) setOpenNotif(null);
    setOpenMenuId(null);
    await mutate();
    void mutateGlobal("/api/notifications?action=unread_count");
  }

  async function muteResidentFromNotif(notif: Notification) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mute_resident", id: notif.id }),
    });
    if (openNotif?.id === notif.id) setOpenNotif(null);
    setOpenMenuId(null);
    await mutate();
    void mutateGlobal("/api/notifications?action=unread_count");
  }

  const unread = (notifications ?? []).filter((n) => !n.is_read);
  const { t } = useT();

  return (
    <div>
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-slate-800 dark:text-white" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t("notifications_page_title")}</h1>
          </div>
          {unread.length > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              {t("mark_all_read")}
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
            <p className="text-base font-bold text-slate-800 dark:text-white">{t("all_caught_up")}</p>
            <p className="mt-1 text-sm text-slate-400">{t("no_notifications")}</p>
          </div>
        )}

        {(notifications ?? []).map((notif) => (
          <div
            key={notif.id}
            onClick={async () => {
              setOpenNotif(notif);
              if (!notif.is_read) await markOneRead(notif.id);
            }}
            className={`relative flex cursor-pointer items-start gap-3 rounded-2xl bg-white dark:bg-slate-900 px-4 py-4 shadow-sm transition-all ${
              !notif.is_read ? "border-l-4 border-blue-500" : "border-l-4 border-transparent"
            }`}
          >
            {/* Icon */}
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
              <Bell className="h-5 w-5 text-blue-500" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
                {notif.message}
              </p>
              <p className="mt-1 text-xs text-slate-400">{formatDate(notif.created_at)}</p>
            </div>

            {/* 3-dot menu */}
            <div className="relative shrink-0 self-start">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId((prev) => (prev === notif.id ? null : notif.id));
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Notification actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {openMenuId === notif.id && (
                <>
                  <button
                    onClick={() => setOpenMenuId(null)}
                    className="fixed inset-0 z-[70] cursor-default"
                    aria-label="Close menu backdrop"
                  />
                  <div className="absolute right-0 top-10 z-[71] w-56 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
                    <button
                      onClick={(e) => { e.stopPropagation(); void deleteNotification(notif); }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete notification
                    </button>
                    {notif.post_id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); void mutePostFromNotif(notif); }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <BellOff className="h-4 w-4" />
                        Turn off this post
                      </button>
                    )}
                    {notif.source_user_id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); void muteResidentFromNotif(notif); }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <UserX className="h-4 w-4" />
                        Turn off this resident
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Full notification modal */}
      {openNotif && (
        <div className="fixed inset-0 z-[80]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpenNotif(null)}
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-extrabold text-slate-900 dark:text-white">
                  {openNotif.title || "Notification"}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {formatDate(openNotif.created_at)}
                </p>
              </div>
              <button
                onClick={() => setOpenNotif(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-200"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-5 py-5">
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-700 dark:text-slate-200">
                {openNotif.message}
              </p>

              {openNotif.post_id && (
                <a
                  href={`/posts/${openNotif.post_id}?focus=comments${
                    openNotif.type === "policy_violation" ? "&reason=policy_violation" : ""
                  }${
                    openNotif.comment_id
                      ? `&comment_id=${openNotif.comment_id}`
                      : ""
                  }`}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Open related post
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
