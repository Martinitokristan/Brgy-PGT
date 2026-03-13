"use client";

import { X, Calendar, MapPin, Clock, Users, Share2, Bookmark } from "lucide-react";

type Event = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  image: string | null;
};

interface EventDetailModalProps {
  event: Event;
  onClose: () => void;
}

export default function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const dateObj = new Date(event.event_date);
  
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dateObj);

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(dateObj);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[32px] bg-white shadow-2xl transition-all animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-all hover:bg-white/40 active:scale-95"
        >
          <X size={20} />
        </button>

        {/* Hero Section with Image */}
        <div className="relative h-64 w-full bg-slate-200">
          {event.image ? (
            <img 
              src={event.image} 
              alt={event.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700">
              <Calendar className="h-20 w-20 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-8 right-8">
            <h2 className="text-3xl font-black text-white leading-tight">
              {event.title}
            </h2>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 mb-3">
                  About Event
                </h3>
                <p className="text-base text-slate-600 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <button className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200">
                  <Share2 size={16} /> Share
                </button>
                <button className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200">
                  <Bookmark size={16} /> Save
                </button>
              </div>
            </div>

            {/* Side Info */}
            <div className="space-y-6 rounded-3xl bg-slate-50 p-6 border border-slate-100">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                    <Calendar size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</p>
                    <p className="text-xs font-bold text-slate-900">{formattedDate}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                    <Clock size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time</p>
                    <p className="text-xs font-bold text-slate-900">{formattedTime}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                    <MapPin size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</p>
                    <p className="text-xs font-bold text-slate-900 leading-snug">{event.location}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white shadow-xl shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 active:scale-95 leading-none">
                  Interested
                </button>
                <p className="mt-3 text-center text-[10px] font-semibold text-slate-500 flex items-center justify-center gap-1.5">
                  <Users size={12} /> 12 residents are interested
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
