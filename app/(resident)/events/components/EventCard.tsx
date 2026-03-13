"use client";

import { Calendar, MapPin, Clock, Info } from "lucide-react";

type Event = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  image: string | null;
};

interface EventCardProps {
  event: Event;
  onClick: () => void;
}

export default function EventCard({ event, onClick }: EventCardProps) {
  const dateObj = new Date(event.event_date);
  
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dateObj);

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(dateObj);

  return (
    <div 
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer"
    >
      {/* Event Image */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        {event.image ? (
          <img 
            src={event.image} 
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <Calendar className="h-12 w-12 text-blue-200" />
          </div>
        )}
        
        {/* Date Badge Overlay */}
        <div className="absolute top-4 left-4 rounded-xl bg-white/95 px-3 py-1.5 text-center shadow-lg backdrop-blur-sm">
          <span className="block text-xs font-bold uppercase tracking-wider text-blue-600">
            {new Intl.DateTimeFormat("en-US", { month: "short" }).format(dateObj)}
          </span>
          <span className="block text-lg font-black text-slate-900 leading-none">
            {dateObj.getDate()}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-1 text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
          {event.title}
        </h3>
        
        <p className="mt-2 line-clamp-2 text-sm text-slate-600 leading-relaxed">
          {event.description}
        </p>

        <div className="mt-auto pt-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Calendar size={14} />
              </div>
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Clock size={14} />
              </div>
              <span>{formattedTime}</span>
            </div>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <MapPin size={14} />
              </div>
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button className="flex-1 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200">
              Details
            </button>
            <button 
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                // Logic for "Interested" could go here
              }}
            >
              Interested
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
