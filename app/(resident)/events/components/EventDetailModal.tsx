"use client";

import { useState, useEffect } from "react";
import { X, Calendar, MapPin, Clock, Users, Share2, Bookmark, Check } from "lucide-react";

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
  onActionComplete?: () => void;
}

export default function EventDetailModal({ event, onClose, onActionComplete }: EventDetailModalProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [interestedCount, setInterestedCount] = useState(12);
  
  // Check initial state on mount
  useEffect(() => {
    const checkInitialState = async () => {
      try {
        // Check if event is saved
        const savedResponse = await fetch(`/api/saved-events`);
        if (savedResponse.ok) {
          const savedEvents = await savedResponse.json();
          const saved = savedEvents.some((e: any) => e.id === event.id);
          setIsSaved(saved);
        }

        // Check if interested
        const interestsResponse = await fetch(`/api/event-interests?event_ids=${event.id}`);
        if (interestsResponse.ok) {
          const data = await interestsResponse.json();
          setIsInterested(data.interested_events?.includes(event.id) || false);
          setInterestedCount(data.interested_events?.length || 0);
        }
      } catch (error) {
        console.error("Error checking initial state:", error);
      }
    };

    checkInitialState();
  }, [event.id]);
  
  const dateObj = new Date(event.event_date);
  
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dateObj);

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(dateObj);

  const handleSave = async () => {
    try {
      const response = await fetch("/api/saved-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          event_id: event.id, 
          action: isSaved ? "unsave" : "save" 
        }),
      });

      if (response.ok) {
        setIsSaved(!isSaved);
        // Notify parent to refresh data
        onActionComplete?.();
      }
    } catch (error) {
      console.error("Error saving event:", error);
    }
  };

  const handleInterested = async () => {
    try {
      const response = await fetch("/api/event-interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          event_id: event.id, 
          action: isInterested ? "not_interested" : "interested" 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsInterested(!isInterested);
        setInterestedCount(data.interested_count || interestedCount);
        // Notify parent to refresh data
        onActionComplete?.();
      }
    } catch (error) {
      console.error("Error toggling interest:", error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description || '',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // TODO: Show toast notification
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content - Truly full screen */}
      <div className="relative z-10 w-screen bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in zoom-in-95 fade-in slide-in-from-bottom-4 sm:slide-in-from-0 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Event Details</h3>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Event Image */}
          {event.image && (
            <div className="relative h-48 w-full bg-slate-100">
              <img 
                src={event.image} 
                alt={event.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="p-5 space-y-4">
            {/* Title */}
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              {event.title}
            </h2>

            {/* Interested Count - Prominent Position */}
            <div className="flex items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20 px-4 py-3 border border-blue-200 dark:border-blue-800">
              <Users className="h-5 w-5 text-blue-600 mr-2" />
              <div className="text-center">
                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{interestedCount}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Residents Interested</p>
              </div>
            </div>

            {/* Event Info - Enhanced */}
            <div className="space-y-4">
              {/* Date & Time */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
                    <Calendar size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{formattedDate}</p>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formattedTime}</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              {event.location && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg">
                      <MapPin size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Location</p>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{event.location}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                  About This Event
                </h4>
                <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95"
              >
                <Share2 size={18} />
                Share
              </button>
              <button
                onClick={handleSave}
                className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all active:scale-95 ${
                  isSaved 
                    ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-lg' 
                    : 'border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {isSaved ? <Check size={18} /> : <Bookmark size={18} />}
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Action */}
        <div className="p-5 pt-0">
          <button
            onClick={handleInterested}
            className={`w-full rounded-2xl py-4 text-lg font-black transition-all active:scale-95 shadow-lg ${
              isInterested
                ? 'bg-emerald-600 text-white border-2 border-emerald-600'
                : 'bg-blue-600 text-white border-2 border-blue-600 hover:bg-blue-700'
            }`}
          >
            {isInterested ? '✓ INTERESTED' : "I'M INTERESTED"}
          </button>
        </div>
      </div>
    </div>
  );
}
