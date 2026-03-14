"use client";

import useSWR from "swr";
import Link from "next/link";
import {
  FileText,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity,
  Calendar,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Stats = {
  totalPosts: number;
  pendingPosts: number;
  inProgressPosts: number;
  resolvedPosts: number;
  urgentPosts: number;
  totalResidents: number;
  approvedResidents: number;
  byPurpose: Record<string, number>;
  byUrgency: Record<string, number>;
};

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function DonutChart({
  data,
  size = 120,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400"
      >
        No data
      </div>
    );
  }
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.7;
  const innerR = (size / 2) * 0.44;
  let cumulative = 0;
  const slices = data.map((d) => {
    const pct = d.value / total;
    const start = cumulative;
    cumulative += pct;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(startAngle);
    const iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(endAngle);
    const iy2 = cy + innerR * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    const path = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      "Z",
    ].join(" ");
    return { ...d, path };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} />
      ))}
      <circle cx={cx} cy={cy} r={innerR * 0.9} fill="white" />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.14}
        fontWeight="700"
        fill="#1e293b"
      >
        {total}
      </text>
    </svg>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useSWR<Stats>("/api/admin/stats", fetcher, {
    refreshInterval: 30000,
  });

  const statCards = [
    {
      label: "TOTAL POSTS",
      value: stats?.totalPosts ?? 0,
      icon: FileText,
      color: "border-t-blue-500",
      valueColor: "text-slate-900",
    },
    {
      label: "ACTIVE URGENT",
      value: stats?.urgentPosts ?? 0,
      icon: AlertTriangle,
      color: "border-t-red-500",
      valueColor: "text-red-500",
    },
    {
      label: "PENDING",
      value: stats?.pendingPosts ?? 0,
      icon: Clock,
      color: "border-t-orange-500",
      valueColor: "text-orange-500",
    },
    {
      label: "IN PROGRESS",
      value: stats?.inProgressPosts ?? 0,
      icon: Activity,
      color: "border-t-teal-500",
      valueColor: "text-teal-500",
    },
    {
      label: "RESOLVED",
      value: stats?.resolvedPosts ?? 0,
      icon: CheckCircle2,
      color: "border-t-green-500",
      valueColor: "text-green-500",
    },
    {
      label: "RESIDENTS",
      value: stats?.totalResidents ?? 0,
      icon: Users,
      color: "border-t-blue-600",
      valueColor: "text-blue-600",
    },
  ];

  const byPurposeData = Object.entries(stats?.byPurpose ?? {}).map(([label, value], i) => ({
    label,
    value,
    color: COLORS[i % COLORS.length],
  }));

  const byUrgencyData = Object.entries(stats?.byUrgency ?? {}).map(([label, value], i) => ({
    label,
    value,
    color: ["#ef4444", "#f59e0b", "#10b981"][i % 3],
  }));

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 pb-8 sm:p-6">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-500/30">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-black text-slate-900">Admin Dashboard</h1>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/admin/posts"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Manage All Posts
        </Link>
        <Link
          href="/admin/events"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Manage Events
        </Link>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl border-t-4 bg-white px-4 py-5 shadow-sm text-center ${card.color}`}
            >
              <Icon className="h-4 w-4 text-slate-400 mb-1" />
              {isLoading ? (
                <div className="h-8 w-12 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <p className={`text-3xl font-black ${card.valueColor}`}>{card.value}</p>
              )}
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Posts by Purpose */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-bold text-slate-800">Posts by Purpose</p>
          <div className="flex items-center gap-5">
            <DonutChart data={byPurposeData} size={110} />
            <div className="flex flex-col gap-2 min-w-0">
              {byPurposeData.map((d) => (
                <div key={d.label} className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="truncate text-[11px] font-semibold text-slate-600">
                    {d.label}
                  </span>
                  <span className="ml-auto text-[11px] font-black text-slate-800">{d.value}</span>
                </div>
              ))}
              {byPurposeData.length === 0 && (
                <p className="text-xs text-slate-400">No posts yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Posts by Urgency */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-bold text-slate-800">Posts by Urgency</p>
          <div className="flex items-center gap-5">
            <DonutChart data={byUrgencyData} size={110} />
            <div className="flex flex-col gap-2 min-w-0">
              {byUrgencyData.map((d) => (
                <div key={d.label} className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="truncate text-[11px] font-semibold text-slate-600 capitalize">
                    {d.label}
                  </span>
                  <span className="ml-auto text-[11px] font-black text-slate-800">{d.value}</span>
                </div>
              ))}
              {byUrgencyData.length === 0 && (
                <p className="text-xs text-slate-400">No posts yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-bold text-slate-800">Status Overview</p>
        <div className="flex flex-col gap-3">
          {[
            { label: "Pending", value: stats?.pendingPosts ?? 0, color: "bg-orange-500", pct: stats?.totalPosts ? ((stats.pendingPosts / stats.totalPosts) * 100) : 0 },
            { label: "In Progress", value: stats?.inProgressPosts ?? 0, color: "bg-teal-500", pct: stats?.totalPosts ? ((stats.inProgressPosts / stats.totalPosts) * 100) : 0 },
            { label: "Resolved", value: stats?.resolvedPosts ?? 0, color: "bg-green-500", pct: stats?.totalPosts ? ((stats.resolvedPosts / stats.totalPosts) * 100) : 0 },
          ].map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">{row.label}</span>
                <span className="text-xs font-bold text-slate-800">{row.value}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${row.color}`}
                  style={{ width: `${Math.min(row.pct, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
