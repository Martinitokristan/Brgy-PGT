"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type DateTimePickerProps = {
  value: string; // "YYYY-MM-DDTHH:mm" format
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  minYear?: number;
  maxYear?: number;
};

type View = "calendar" | "month" | "year" | "time";

export default function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  required,
  className = "",
  minYear = 2020,
  maxYear,
}: DateTimePickerProps) {
  const currentYear = new Date().getFullYear();
  const resolvedMaxYear = maxYear ?? currentYear + 5;

  // Parse "YYYY-MM-DDTHH:mm"
  const parsed = value ? new Date(value) : null;
  const dateStr = value?.split("T")[0] ?? "";
  const timeStr = value?.split("T")[1] ?? "08:00";

  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? currentYear);
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? new Date().getMonth());
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("calendar");
  const [yearPageStart, setYearPageStart] = useState(
    Math.floor((parsed?.getFullYear() ?? currentYear) / 20) * 20
  );
  const [hour, setHour] = useState(parsed ? parsed.getHours() : 8);
  const [minute, setMinute] = useState(parsed ? parsed.getMinutes() : 0);
  const [period, setPeriod] = useState<"AM" | "PM">(parsed ? (parsed.getHours() >= 12 ? "PM" : "AM") : "AM");

  const ref = useRef<HTMLDivElement>(null);
  const [openAbove, setOpenAbove] = useState(false);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenAbove(spaceBelow < 400);
    }
  }, [open]);

  useEffect(() => {
    if (open && value) {
      const d = new Date(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      const h = d.getHours();
      setHour(h === 0 ? 12 : h > 12 ? h - 12 : h);
      setMinute(d.getMinutes());
      setPeriod(h >= 12 ? "PM" : "AM");
      setView("calendar");
      setYearPageStart(Math.floor(d.getFullYear() / 20) * 20);
    } else if (open && !value) {
      setView("calendar");
      setHour(8);
      setMinute(0);
      setPeriod("AM");
    }
  }, [open, value]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDay = new Date(viewYear, viewMonth, 1).getDay();

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [startDay, daysInMonth]);

  function buildDateTime(y: number, m: number, d: number, h: number, min: number, p: "AM" | "PM") {
    let h24 = h;
    if (p === "AM" && h === 12) h24 = 0;
    else if (p === "PM" && h !== 12) h24 = h + 12;
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    const hh = String(h24).padStart(2, "0");
    const mi = String(min).padStart(2, "0");
    return `${y}-${mm}-${dd}T${hh}:${mi}`;
  }

  function selectDay(day: number) {
    onChange(buildDateTime(viewYear, viewMonth, day, hour, minute, period));
    setView("time");
  }

  function confirmTime() {
    if (!dateStr) {
      // No date selected yet, go back to calendar
      setView("calendar");
      return;
    }
    const d = new Date(dateStr + "T00:00:00");
    onChange(buildDateTime(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute, period));
    setOpen(false);
  }

  const isSelected = (day: number) => {
    if (!parsed) return false;
    return parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === day;
  };

  const isToday = (day: number) => {
    const now = new Date();
    return now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === day;
  };

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const displayValue = parsed
    ? parsed.toLocaleString("en-US", {
        month: "long", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
      })
    : "";

  const yearGridYears = useMemo(() => {
    const years: number[] = [];
    for (let y = yearPageStart; y < yearPageStart + 20; y++) {
      if (y >= minYear && y <= resolvedMaxYear) years.push(y);
    }
    return years;
  }, [yearPageStart, minYear, resolvedMaxYear]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-3 rounded-2xl border-0 bg-slate-50 px-4 py-4 text-left text-sm transition-all ring-1 ring-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 ${className}`}
      >
        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
        <span className={displayValue ? "text-slate-900" : "text-slate-400"}>
          {displayValue || placeholder}
        </span>
      </button>

      {required && (
        <input
          type="text"
          value={value}
          required
          onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none"
          tabIndex={-1}
        />
      )}

      {open && (
        <div className={`absolute left-0 right-0 z-50 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 animate-in fade-in duration-200 ${openAbove ? 'bottom-full mb-2' : 'top-full mt-2'}`} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            {view !== "time" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (view === "calendar") prevMonth();
                    else if (view === "year") setYearPageStart((s) => Math.max(s - 20, minYear));
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (view === "calendar") setView("month");
                    else if (view === "month") setView("year");
                    else setView("calendar");
                  }}
                  className="rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  {view === "calendar" && `${MONTHS[viewMonth]} ${viewYear}`}
                  {view === "month" && `${viewYear}`}
                  {view === "year" && `${yearPageStart} – ${Math.min(yearPageStart + 19, resolvedMaxYear)}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (view === "calendar") nextMonth();
                    else if (view === "year") setYearPageStart((s) => Math.min(s + 20, resolvedMaxYear - 19));
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="flex w-full items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-800">Select Time</span>
              </div>
            )}
          </div>

          {/* Year Grid */}
          {view === "year" && (
            <div className="grid grid-cols-4 gap-1.5 p-3">
              {yearGridYears.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setViewYear(y); setView("month"); }}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                    y === viewYear
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                      : y === currentYear
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Month Grid */}
          {view === "month" && (
            <div className="grid grid-cols-3 gap-1.5 p-3">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setViewMonth(i); setView("calendar"); }}
                  className={`rounded-xl py-3 text-sm font-semibold transition-colors ${
                    i === viewMonth && viewYear === (parsed?.getFullYear() ?? -1)
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {/* Calendar Grid */}
          {view === "calendar" && (
            <div className="p-3">
              <div className="mb-1 grid grid-cols-7 text-center">
                {DAYS.map((d) => (
                  <span key={d} className="py-1 text-[11px] font-bold uppercase text-slate-400">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {calendarCells.map((day, i) =>
                  day === null ? (
                    <div key={`empty-${i}`} className="h-9" />
                  ) : (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={`flex h-9 items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                        isSelected(day)
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                          : isToday(day)
                          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {day}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Time Picker */}
          {view === "time" && (
            <div className="p-4">
              <div className="flex items-center justify-center gap-3">
                {/* Hour */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setHour((h) => (h >= 12 ? 1 : h + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <ChevronLeft className="h-4 w-4 rotate-90" />
                  </button>
                  <span className="flex h-12 w-14 items-center justify-center rounded-xl bg-slate-100 text-xl font-bold text-slate-900">
                    {String(hour).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHour((h) => (h <= 1 ? 12 : h - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <ChevronLeft className="h-4 w-4 -rotate-90" />
                  </button>
                </div>

                <span className="text-xl font-bold text-slate-400">:</span>

                {/* Minute */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setMinute((m) => (m >= 55 ? 0 : m + 5))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <ChevronLeft className="h-4 w-4 rotate-90" />
                  </button>
                  <span className="flex h-12 w-14 items-center justify-center rounded-xl bg-slate-100 text-xl font-bold text-slate-900">
                    {String(minute).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMinute((m) => (m <= 0 ? 55 : m - 5))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <ChevronLeft className="h-4 w-4 -rotate-90" />
                  </button>
                </div>

                {/* AM/PM */}
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    type="button"
                    onClick={() => setPeriod("AM")}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                      period === "AM"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod("PM")}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                      period === "PM"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setView("calendar")}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={confirmTime}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
