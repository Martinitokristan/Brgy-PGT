"use client";

import { useState } from "react";
import useSWR from "swr";
import { Calendar, Clock, MapPin, Search } from "lucide-react";
import EventDetailModal from "./components/EventDetailModal";

type Event = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  image: string | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = (events ?? []).filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Page Header */}
      <div className="bg-white px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-bold text-slate-900">Barangay Events</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
            <p className="text-sm font-semibold text-red-600">Failed to load events.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Calendar className="mb-3 h-12 w-12 text-slate-200" />
            <p className="text-sm font-semibold text-slate-400">No events found.</p>
          </div>
        )}

        {/* Event Cards */}
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="rounded-2xl border border-slate-100 bg-white px-5 py-5 shadow-sm"
          >
            <h3 className="text-base font-bold text-slate-900">{event.title}</h3>
            {event.description && (
              <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{event.description}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
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
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {event.location}
                </span>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSelectedEvent(event)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                View Details
              </button>
              <button className="ml-auto rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors active:scale-95">
                I&apos;m Interested
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
