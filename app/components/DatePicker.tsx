"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type DatePickerProps = {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  minYear?: number;
  maxYear?: number;
  label?: string;
  icon?: React.ReactNode;
  initialView?: "year" | "calendar";
};

type View = "calendar" | "month" | "year";

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  required,
  className = "",
  minYear = 1920,
  maxYear,
  label,
  icon,
  initialView = "year",
}: DatePickerProps) {
  const currentYear = new Date().getFullYear();
  const resolvedMaxYear = maxYear ?? currentYear;

  const parsed = value ? new Date(value + "T00:00:00") : null;
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? currentYear);
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? new Date().getMonth());
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>(initialView);
  const ref = useRef<HTMLDivElement>(null);
  const yearScrollRef = useRef<HTMLDivElement>(null);

  // All years from minYear to maxYear (descending so newest is on top)
  const allYears = useMemo(() => {
    const years: number[] = [];
    for (let y = resolvedMaxYear; y >= minYear; y--) years.push(y);
    return years;
  }, [minYear, resolvedMaxYear]);

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // When opening, sync view to current value & scroll to selected year
  useEffect(() => {
    if (open) {
      const d = value ? new Date(value + "T00:00:00") : new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setView(initialView);
    }
  }, [open, value, initialView]);

  // Auto-scroll to selected year when year view opens
  useEffect(() => {
    if (open && view === "year" && yearScrollRef.current) {
      const selectedBtn = yearScrollRef.current.querySelector("[data-selected=\"true\"]") as HTMLElement;
      if (selectedBtn) {
        // Delay slightly to ensure DOM is rendered
        requestAnimationFrame(() => {
          selectedBtn.scrollIntoView({ block: "center", behavior: "instant" });
        });
      }
    }
  }, [open, view]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDay = new Date(viewYear, viewMonth, 1).getDay();

  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [startDay, daysInMonth]);

  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  }

  function isSelected(day: number) {
    if (!parsed) return false;
    return parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === day;
  }

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
    ? parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-3 rounded-2xl border-0 bg-slate-50 px-4 py-4 text-left text-sm transition-all ring-1 ring-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 ${className}`}
      >
        {icon || <Calendar className="h-4 w-4 shrink-0 text-slate-400" />}
        <span className={displayValue ? "text-slate-900" : "text-slate-400"}>
          {displayValue || placeholder}
        </span>
      </button>

      {/* Hidden native input for form validation */}
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

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            {view === "calendar" ? (
              <>
                <button
                  type="button"
                  onClick={prevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("year")}
                  className="rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  {MONTHS[viewMonth]} {viewYear}
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : view === "month" ? (
              <>
                <div className="w-8" />
                <button
                  type="button"
                  onClick={() => setView("year")}
                  className="rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  {viewYear}
                </button>
                <div className="w-8" />
              </>
            ) : (
              <>
                <div className="w-8" />
                <p className="text-sm font-bold text-slate-800">Select Year</p>
                <div className="w-8" />
              </>
            )}
          </div>

          {/* Scrollable Year Grid */}
          {view === "year" && (
            <div
              ref={yearScrollRef}
              className="grid grid-cols-4 gap-1.5 p-3 max-h-64 overflow-y-auto overscroll-contain"
            >
              {allYears.map((y) => (
                <button
                  key={y}
                  type="button"
                  data-selected={y === viewYear}
                  onClick={() => {
                    setViewYear(y);
                    setView("month");
                  }}
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
                  onClick={() => {
                    setViewMonth(i);
                    setView("calendar");
                  }}
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
              {/* Day headers */}
              <div className="mb-1 grid grid-cols-7 text-center">
                {DAYS.map((d) => (
                  <span key={d} className="py-1 text-[11px] font-bold uppercase text-slate-400">
                    {d}
                  </span>
                ))}
              </div>
              {/* Day cells */}
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

          {/* Quick actions */}
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const mm = String(now.getMonth() + 1).padStart(2, "0");
                const dd = String(now.getDate()).padStart(2, "0");
                onChange(`${now.getFullYear()}-${mm}-${dd}`);
                setOpen(false);
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-100 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
