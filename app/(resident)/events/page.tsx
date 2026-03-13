"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Filter, LayoutGrid, Calendar as CalendarIcon, Search } from "lucide-react";
import EventCard from "./components/EventCard";
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

export default function EventsPage() {
  const { data: events, error, isLoading } = useSWR<Event[]>("/api/events", fetcher);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = (events ?? []).filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-1 flex-col gap-6 py-8 px-4 sm:px-6 lg:px-8 bg-slate-50/50 min-h-screen">
      {/* Header Section */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/20">
                <CalendarIcon size={24} />
             </div>
             <h1 className="text-3xl font-black tracking-tight text-slate-900">Barangay Events</h1>
          </div>
          <p className="text-sm font-medium text-slate-500 max-w-md">
            Stay connected with the latest activities, workshops, and gatherings in our community.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border-0 bg-white px-11 py-3.5 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
          <button className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50">
            <Filter size={18} /> Filter
          </button>
        </div>
      </header>

      {/* Events Grid */}
      <section className="relative mt-4">
        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[420px] animate-pulse rounded-2xl bg-white ring-1 ring-slate-100" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-red-100 bg-red-50/30 p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <Plus className="h-8 w-8 rotate-45" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Failed to load events</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
               Please try again later or contact support if the problem persists.
            </p>
          </div>
        )}

        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-slate-200 bg-white p-16 text-center shadow-sm">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-slate-50 text-slate-300">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No events found</h3>
            <p className="mt-2 text-sm font-medium text-slate-500 max-w-xs mx-auto leading-relaxed">
              We couldn&apos;t find any events matching your current search. Try different keywords or check back later!
            </p>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <EventCard 
              key={event.id}
              event={event}
              onClick={() => setSelectedEvent(event)}
            />
          ))}
        </div>
      </section>

      {/* Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
