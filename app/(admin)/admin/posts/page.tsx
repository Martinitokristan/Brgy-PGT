"use client";

import useSWR from "swr";
import { useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";

type Post = {
  id: number;
  user_id: string;
  title: string | null;
  description: string | null;
  purpose: string | null;
  urgency_level: string | null;
  status: string | null;
  created_at: string;
  profiles?: { name: string | null } | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const URGENCY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-orange-100 text-orange-700",
  low: "bg-green-100 text-green-700",
};

const STATUS_OPTIONS = ["pending", "in_progress", "resolved"];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminPostsPage() {
  const { data: posts, isLoading, mutate } = useSWR<Post[]>("/api/posts", fetcher);

  const [search, setSearch] = useState("");
  const [filterUrgency, setFilterUrgency] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [updating, setUpdating] = useState<number | null>(null);

  const allPurposes = Array.from(new Set((posts ?? []).map((p) => p.purpose).filter(Boolean)));

  const filtered = (posts ?? []).filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q);
    const matchUrgency = filterUrgency === "all" || p.urgency_level === filterUrgency;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchType = filterType === "all" || p.purpose === filterType;
    return matchSearch && matchUrgency && matchStatus && matchType;
  });

  async function changeStatus(postId: number, newStatus: string) {
    setUpdating(postId);
    await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await mutate();
    setUpdating(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8 sm:p-6">
      <h1 className="text-xl font-bold text-slate-900">Manage Posts</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search title or content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none"
        >
          <option value="all">All Urgency</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none"
        >
          <option value="all">All Types</option>
          {allPurposes.map((p) => (
            <option key={p} value={p!}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-semibold text-slate-400">No posts found.</p>
        </div>
      )}

      {/* Post Cards */}
      <div className="flex flex-col gap-3">
        {filtered.map((post, idx) => {
          const urgency = post.urgency_level ?? "low";
          const urgencyClass = URGENCY_COLORS[urgency] ?? URGENCY_COLORS.low;
          return (
            <div
              key={post.id}
              className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm"
            >
              {/* Top Row */}
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                  <span className="text-xs text-slate-400">{formatDate(post.created_at)}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${urgencyClass}`}
                  >
                    {urgency}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h3 className="mb-1 text-[15px] font-bold text-slate-900 leading-snug line-clamp-2">
                {post.title || "(No title)"}
              </h3>

              {/* Author & Type */}
              <p className="mb-3 text-xs text-slate-500">
                {post.profiles?.name && (
                  <Link href={`/admin/users/${post.user_id}`}>
                    <span className="font-bold text-slate-700 hover:text-blue-600 hover:underline">
                      {post.profiles.name}
                    </span>
                  </Link>
                )}
                {post.purpose && (
                  <span className="ml-1 text-slate-400">• {post.purpose}</span>
                )}
              </p>

              {/* Actions Row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Dropdown */}
                <select
                  value={post.status ?? "pending"}
                  onChange={(e) => changeStatus(post.id, e.target.value)}
                  disabled={updating === post.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none disabled:opacity-50"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s === "in_progress"
                        ? "In Progress"
                        : s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>

                {/* View Button */}
                <a
                  href={`/admin/feed#post-${post.id}`}
                  className="ml-auto rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  View
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
