"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Clock, User as UserIcon, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UserResult = {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
function getAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

const RECENT_KEY = "brgy_recent_profiles";
const MAX_RECENT = 8;

function getRecentProfiles(): UserResult[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch { return []; }
}

function saveRecentProfile(user: UserResult) {
  if (typeof window === "undefined") return;
  const current = getRecentProfiles().filter((u) => u.id !== user.id);
  const updated = [user, ...current].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function removeRecentProfile(id: string) {
  if (typeof window === "undefined") return;
  const updated = getRecentProfiles().filter((u) => u.id !== id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [recent, setRecent] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRecent(getRecentProfiles());
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/profile?action=search&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  }

  function handleVisit(user: UserResult) {
    saveRecentProfile(user);
    router.push(`/profile/${user.id}`);
  }

  function handleRemoveRecent(id: string) {
    removeRecentProfile(id);
    setRecent(getRecentProfiles());
  }

  function clearAllRecent() {
    localStorage.removeItem(RECENT_KEY);
    setRecent([]);
  }

  const showResults = query.trim().length > 0;
  const showRecent = !showResults && recent.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      {/* Search Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-4 pt-3 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              placeholder="Search BarangayPGT..."
              className="w-full rounded-full bg-slate-100 dark:bg-slate-800 py-2.5 pl-9 pr-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              if (query.trim()) doSearch(query);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-2">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-3 pt-4">
            {[0,1,2].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-11 w-11 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded-full bg-slate-100" />
                  <div className="h-2 w-1/4 rounded-full bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search Results */}
        {showResults && !loading && (
          <div>
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <UserIcon className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No residents found for &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {results.map((user) => (
                  <li key={user.id}>
                    <button
                      onClick={() => handleVisit(user)}
                      className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-2"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-base shadow-sm overflow-hidden">
                        {getAvatarUrl(user.avatar) ? (
                          <img src={getAvatarUrl(user.avatar)!} alt={user.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          user.name.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Recently Viewed */}
        {showRecent && (
          <div className="pt-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Recent</p>
              <button
                onClick={clearAllRecent}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Clear all
              </button>
            </div>
            <ul className="divide-y divide-slate-50">
              {recent.map((user) => (
                <li key={user.id}>
                  <div className="flex items-center gap-3 py-2.5">
                    <button
                      onClick={() => handleVisit(user)}
                      className="flex flex-1 items-center gap-3 text-left rounded-xl px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{user.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleRemoveRecent(user.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state when no query and no recent */}
        {!showResults && !showRecent && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Search className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-400">Search for residents by name</p>
          </div>
        )}
      </div>
    </div>
  );
}
