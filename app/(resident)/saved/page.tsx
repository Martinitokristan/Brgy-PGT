"use client";

import { useState } from "react";
import useSWR from "swr";
import { Calendar, MapPin, Clock, Bookmark, Check, Users, Search, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useT } from "@/lib/useT";

type Event = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  image: string | null;
  saved_at: string;
  is_interested: boolean;
  reminder_3d_sent: boolean;
  reminder_10h_sent: boolean;
};

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatSavedDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "Saved yesterday";
  if (diffDays < 7) return `Saved ${diffDays} days ago`;
  return `Saved on ${formatDate(d)}`;
}

export default function SavedEventsPage() {
  const { data: events, error, isLoading, mutate } = useSWR<Event[]>("/api/saved-events", fetcher);
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useT();

  const eventsList = Array.isArray(events) ? events : [];
  const filteredEvents = eventsList.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUnsave = async (eventId: number) => {
    try {
      const response = await fetch("/api/saved-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, action: "unsave" }),
      });

      if (response.ok) {
        mutate(); // Refresh the data
      }
    } catch (error) {
      console.error("Error unsaving event:", error);
    }
  };

  const handleToggleInterest = async (eventId: number, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/event-interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          event_id: eventId, 
          action: currentStatus ? "not_interested" : "interested" 
        }),
      });

      if (response.ok) {
        mutate(); // Refresh the data
      }
    } catch (error) {
      console.error("Error toggling interest:", error);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Saved Events</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search saved events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-2xl bg-red-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-red-600">Failed to load saved events</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bookmark className="mb-3 h-12 w-12 text-slate-200" />
            <p className="text-sm font-semibold text-slate-400">
              {eventsList.length === 0 ? "No saved events yet" : "No matching events found"}
            </p>
            {eventsList.length === 0 && (
              <Link 
                href="/events"
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Browse events to save
              </Link>
            )}
          </div>
        )}

        {/* Event Cards */}
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-5 shadow-sm"
          >
            {/* Header with saved date and unsave button */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-blue-600 fill-blue-600" />
                <span className="text-xs text-slate-500">{formatSavedDate(event.saved_at)}</span>
              </div>
              <button
                onClick={() => handleUnsave(event.id)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Remove from saved"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{event.title}</h3>
            {event.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{event.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mb-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span>{formatDate(event.event_date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-orange-400" />
                <span>{formatTime(event.event_date)}</span>
              </div>
            </div>

            {event.location && (
              <div className="flex items-center gap-1.5 mb-4">
                <MapPin className="h-4 w-4 text-red-500" />
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {event.location}
                </span>
              </div>
            )}

            {/* Interest Status */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 mb-3">
              {event.is_interested ? (
                <>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-emerald-700">You're interested</p>
                    <p className="text-[10px] text-slate-500">
                      {event.reminder_3d_sent && event.reminder_10h_sent 
                        ? "Reminders sent" 
                        : event.reminder_3d_sent 
                        ? "3-day reminder sent" 
                        : event.reminder_10h_sent 
                        ? "10-hour reminder sent"
                        : "Reminders scheduled"
                      }
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-600">Not interested</p>
                    <p className="text-[10px] text-slate-400">Click to get reminders</p>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleToggleInterest(event.id, event.is_interested)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                  event.is_interested
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {event.is_interested ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Interested
                  </>
                ) : (
                  <>
                    <Users className="h-3.5 w-3.5" />
                    Get Reminders
                  </>
                )}
              </button>
              <Link
                href={`/events?detail=${event.id}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                View Details
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
