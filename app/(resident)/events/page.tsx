"use client";

import { useState } from "react";
import useSWR from "swr";
import { Calendar, Clock, MapPin, Search, Bookmark, Check, Users } from "lucide-react";
import EventDetailModal from "./components/EventDetailModal";
import { useT } from "@/lib/useT";

type Event = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  image: string | null;
  is_interested?: boolean;
  saved_at?: string;
  reminder_3d_sent?: boolean;
  reminder_10h_sent?: boolean;
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

export default function EventsPage() {
  const { data: events, error, isLoading } = useSWR<Event[]>("/api/events", fetcher);
  const { data: savedEvents, mutate: mutateSaved } = useSWR<Event[]>("/api/saved-events", fetcher);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useT();

  const eventsList = Array.isArray(events) ? events : [];
  const filteredEvents = eventsList.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper functions
  const isEventSaved = (eventId: number) => {
    return savedEvents?.some(event => event.id === eventId) || false;
  };

  const isEventInterested = (eventId: number) => {
    return savedEvents?.some(event => event.id === eventId && event.is_interested) || false;
  };

  // Get interested status from API directly for all events
  const { data: interestsData, mutate: mutateInterests } = useSWR(
    eventsList.length > 0 ? `/api/event-interests?event_ids=${eventsList.map(e => e.id).join(',')}` : null,
    fetcher
  );

  const isEventInterestedDirect = (eventId: number) => {
    return interestsData?.interested_events?.includes(eventId) || false;
  };

  const handleSaveEvent = async (eventId: number) => {
    try {
      const response = await fetch("/api/saved-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, action: "save" }),
      });

      if (response.ok) {
        mutateSaved(); // Refresh saved events data
      }
    } catch (error) {
      console.error("Error saving event:", error);
    }
  };

  const handleUnsaveEvent = async (eventId: number) => {
    try {
      const response = await fetch("/api/saved-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, action: "unsave" }),
      });

      if (response.ok) {
        mutateSaved(); // Refresh saved events data
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
        // Refresh both data sources to ensure sync
        mutateSaved(); // Refresh saved events data
        mutateInterests(); // Refresh interests data
      }
    } catch (error) {
      console.error("Error toggling interest:", error);
    }
  };

  // Callback function to refresh data when modal actions are completed
  const handleModalActionComplete = () => {
    mutateSaved();
    mutateInterests();
  };

  return (
    <div>
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t("barangay_events")}</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("search_events")}
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
            <p className="text-sm font-semibold text-red-600">{t("failed_load_events")}</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Calendar className="mb-3 h-12 w-12 text-slate-200" />
            <p className="text-sm font-semibold text-slate-400">{t("no_events")}</p>
          </div>
        )}

        {/* Event Cards */}
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-5 shadow-sm"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{event.title}</h3>
            {event.description && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{event.description}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
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
              <div className="mt-2 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-red-500" />
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {event.location}
                </span>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSelectedEvent(event)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t("view_details")}
              </button>
              <button
                onClick={() => handleToggleInterest(event.id, isEventInterestedDirect(event.id))}
                className={`flex-1 flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors active:scale-95 ${
                  isEventInterestedDirect(event.id)
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isEventInterestedDirect(event.id) ? (
                  <>
                    <Check className="h-3 w-3" />
                    Interested
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3" />
                    {t("im_interested")}
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <EventDetailModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
          onActionComplete={handleModalActionComplete}
        />
      )}
    </div>
  );
}
