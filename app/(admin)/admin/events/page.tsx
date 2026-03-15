"use client";

import useSWR from "swr";
import { useState } from "react";
import { Calendar, MapPin, Clock, Plus, X } from "lucide-react";
import DateTimePicker from "@/app/components/DateTimePicker";

type Event = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  image: string | null;
};

type EventForm = {
  title: string;
  description: string;
  location: string;
  event_date: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const EMPTY_FORM: EventForm = { title: "", description: "", location: "", event_date: "" };

export default function AdminEventsPage() {
  const { data: events, isLoading, mutate } = useSWR<Event[]>("/api/admin?action=events", fetcher);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  function openNew() {
    setEditEvent(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setSelectedEvent(null);
  }

  function openEdit(event: Event) {
    setEditEvent(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      event_date: event.event_date,
    });
    setShowForm(true);
    setSelectedEvent(null);
  }

  async function handleSave() {
    if (!form.title || !form.event_date) return;
    setSaving(true);
    try {
      if (editEvent) {
        const res = await fetch("/api/admin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_event", id: editEvent.id, ...form }),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to update event");
        }
      } else {
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create_event", ...form }),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to create event");
        }
      }
      await mutate();
      setShowForm(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this event?")) return;
    setDeleting(id);
    await fetch(`/api/admin?action=event&id=${id}`, { method: "DELETE" });
    await mutate();
    setDeleting(null);
    if (selectedEvent?.id === id) setSelectedEvent(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-blue-600" />
        <h1 className="text-xl font-bold text-slate-900">Barangay Events</h1>
      </div>

      {/* Post New Event Button */}
      <button
        onClick={openNew}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Post New Event
      </button>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && (events ?? []).length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="mb-3 h-12 w-12 text-slate-200" />
          <p className="text-sm font-semibold text-slate-400">No events yet. Post a new one!</p>
        </div>
      )}

      {/* Event Cards */}
      <div className="flex flex-col gap-3">
        {(events ?? []).map((event) => (
          <div
            key={event.id}
            className="rounded-2xl border-l-4 border-blue-500 bg-white px-5 py-5 shadow-sm"
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

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSelectedEvent(event)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                View Details
              </button>
              <button
                onClick={() => openEdit(event)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
              >
                Edit Event
              </button>
              <button
                onClick={() => handleDelete(event.id)}
                disabled={deleting === event.id}
                className="ml-auto rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                {deleting === event.id ? "..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
          />
          <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-4 text-center text-xl font-bold text-slate-900">
              {selectedEvent.title}
            </h2>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Date
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {formatDateLong(selectedEvent.event_date)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Time
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {formatTime(selectedEvent.event_date)}
                </p>
              </div>
            </div>
            {selectedEvent.location && (
              <div className="mb-4 rounded-2xl bg-slate-50 p-4">
                <div className="mb-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Location
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800">{selectedEvent.location}</p>
              </div>
            )}
            {selectedEvent.description && (
              <div className="mb-5">
                <p className="mb-1 text-xs font-bold text-slate-500">About this event</p>
                <p className="text-sm text-slate-600 leading-relaxed">{selectedEvent.description}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(selectedEvent)}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
              >
                Edit This Event
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !saving && setShowForm(false)}
          />
          <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <button
              onClick={() => setShowForm(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-5 text-lg font-bold text-slate-900">
              {editEvent ? "Edit Event" : "New Event"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Event title"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="Event description"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. Barangay Hall"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Date & Time *
                </label>
                <DateTimePicker
                  value={form.event_date}
                  onChange={(val) => setForm((f) => ({ ...f, event_date: val }))}
                  placeholder="Select event date & time"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.title || !form.event_date}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : editEvent ? "Save Changes" : "Create Event"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
