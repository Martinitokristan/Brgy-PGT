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
  userGrowth: { month: string; count: number }[];
};

/* Auto-scale Y-axis: pick a nice ceiling from the tier list */
function niceMax(maxVal: number): number {
  const tiers = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
  for (const t of tiers) if (maxVal <= t) return t;
  return Math.ceil(maxVal / 10000) * 10000;
}

function formatAxisLabel(n: number): string {
  if (n >= 1000) return `${n / 1000}k`;
  return n.toString();
}

/* Smooth area chart component */
function AreaChart({
  data,
  color = "#10b981",
  gradientId,
  height = 180,
}: {
  data: { label: string; value: number }[];
  color?: string;
  gradientId: string;
  height?: number;
}) {
  if (data.length === 0) return <p className="text-xs text-slate-400">No data</p>;
  const rawMax = Math.max(...data.map((d) => d.value), 1);
  const yMax = niceMax(rawMax);
  const W = 500;
  const H = height;
  const padL = 45;
  const padR = 15;
  const padT = 15;
  const padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const points = data.map((d, i) => ({
    x: padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
    y: padT + chartH - (d.value / yMax) * chartH,
  }));

  // Build smooth curve
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const cp1x = points[i].x + (points[i + 1].x - points[i].x) / 3;
    const cp1y = points[i].y;
    const cp2x = points[i + 1].x - (points[i + 1].x - points[i].x) / 3;
    const cp2y = points[i + 1].y;
    linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i + 1].x} ${points[i + 1].y}`;
  }

  const areaPath = linePath + ` L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`;

  // Y-axis gridlines (4 steps)
  const ySteps = 4;
  const yLines = Array.from({ length: ySteps + 1 }, (_, i) => {
    const val = (yMax / ySteps) * i;
    const y = padT + chartH - (val / yMax) * chartH;
    return { val, y };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Grid lines + Y labels */}
      {yLines.map((yl, i) => (
        <g key={i}>
          <line x1={padL} y1={yl.y} x2={W - padR} y2={yl.y} stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray={i === 0 ? "0" : "4 3"} />
          <text x={padL - 8} y={yl.y + 3.5} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">
            {formatAxisLabel(Math.round(yl.val))}
          </text>
        </g>
      ))}
      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradientId})`} />
      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots + X labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2.5" />
          <text x={p.x} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="600">
            {data[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}

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
  const { data: stats, isLoading } = useSWR<Stats>("/api/admin?action=stats", fetcher, {
    refreshInterval: 30000,
  });

  const statCards = [
    {
      label: "TOTAL POSTS",
      value: stats?.totalPosts ?? 0,
      icon: FileText,
      color: "border-t-blue-500",
      bg: "bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-slate-900",
      valueColor: "text-blue-700 dark:text-blue-400",
      iconBg: "bg-blue-100 dark:bg-blue-900/50",
      iconColor: "text-blue-600",
    },
    {
      label: "ACTIVE URGENT",
      value: stats?.urgentPosts ?? 0,
      icon: AlertTriangle,
      color: "border-t-red-500",
      bg: "bg-gradient-to-br from-red-50 to-white dark:from-red-950/40 dark:to-slate-900",
      valueColor: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-100 dark:bg-red-900/50",
      iconColor: "text-red-500",
    },
    {
      label: "PENDING",
      value: stats?.pendingPosts ?? 0,
      icon: Clock,
      color: "border-t-orange-500",
      bg: "bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/40 dark:to-slate-900",
      valueColor: "text-orange-600 dark:text-orange-400",
      iconBg: "bg-orange-100 dark:bg-orange-900/50",
      iconColor: "text-orange-500",
    },
    {
      label: "IN PROGRESS",
      value: stats?.inProgressPosts ?? 0,
      icon: Activity,
      color: "border-t-teal-500",
      bg: "bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/40 dark:to-slate-900",
      valueColor: "text-teal-600 dark:text-teal-400",
      iconBg: "bg-teal-100 dark:bg-teal-900/50",
      iconColor: "text-teal-500",
    },
    {
      label: "RESOLVED",
      value: stats?.resolvedPosts ?? 0,
      icon: CheckCircle2,
      color: "border-t-green-500",
      bg: "bg-gradient-to-br from-green-50 to-white dark:from-green-950/40 dark:to-slate-900",
      valueColor: "text-green-600 dark:text-green-400",
      iconBg: "bg-green-100 dark:bg-green-900/50",
      iconColor: "text-green-500",
    },
    {
      label: "RESIDENTS",
      value: stats?.totalResidents ?? 0,
      icon: Users,
      color: "border-t-indigo-500",
      bg: "bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-slate-900",
      valueColor: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
      iconColor: "text-indigo-500",
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
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Admin Dashboard</h1>
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
              className={`flex flex-col gap-3 rounded-2xl border-t-4 ${card.bg} px-4 py-5 shadow-sm ${card.color}`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.iconBg}`}>
                <Icon className={`h-4.5 w-4.5 ${card.iconColor}`} />
              </div>
              {isLoading ? (
                <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              ) : (
                <p className={`text-3xl font-black ${card.valueColor}`}>{card.value}</p>
              )}
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Posts by Purpose */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
          <p className="mb-4 text-sm font-bold text-slate-800 dark:text-white">Posts by Purpose</p>
          <div className="flex items-center gap-5">
            <DonutChart data={byPurposeData} size={110} />
            <div className="flex flex-col gap-2.5 min-w-0 flex-1">
              {byPurposeData.map((d) => {
                const total = byPurposeData.reduce((s, x) => s + x.value, 0);
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={d.label} className="flex items-center gap-2 min-w-0">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                    <span className="truncate text-[11px] font-semibold text-slate-600 dark:text-slate-400 capitalize">{d.label}</span>
                    <span className="ml-auto text-[11px] font-black text-slate-800 dark:text-white">{d.value} <span className="font-medium text-slate-400">({pct}%)</span></span>
                  </div>
                );
              })}
              {byPurposeData.length === 0 && <p className="text-xs text-slate-400">No posts yet</p>}
            </div>
          </div>
        </div>

        {/* Posts by Urgency */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
          <p className="mb-4 text-sm font-bold text-slate-800 dark:text-white">Posts by Urgency</p>
          <div className="flex items-center gap-5">
            <DonutChart data={byUrgencyData} size={110} />
            <div className="flex flex-col gap-2.5 min-w-0 flex-1">
              {byUrgencyData.map((d) => {
                const total = byUrgencyData.reduce((s, x) => s + x.value, 0);
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={d.label} className="flex items-center gap-2 min-w-0">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                    <span className="truncate text-[11px] font-semibold text-slate-600 dark:text-slate-400 capitalize">{d.label}</span>
                    <span className="ml-auto text-[11px] font-black text-slate-800 dark:text-white">{d.value} <span className="font-medium text-slate-400">({pct}%)</span></span>
                  </div>
                );
              })}
              {byUrgencyData.length === 0 && <p className="text-xs text-slate-400">No posts yet</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Status Overview — Area Chart */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
        <p className="mb-2 text-sm font-bold text-slate-800 dark:text-white">Status Overview</p>
        <AreaChart
          data={[
            { label: "Resolved", value: stats?.resolvedPosts ?? 0 },
            { label: "In Progress", value: stats?.inProgressPosts ?? 0 },
            { label: "Pending", value: stats?.pendingPosts ?? 0 },
          ]}
          color="#10b981"
          gradientId="statusGrad"
        />
      </div>

      {/* Users Growth — Area Chart (Blue) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800 dark:text-white">Users Growth</p>
          <div className="flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1">
            <Users className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-[11px] font-bold text-blue-600">{stats?.totalResidents ?? 0} total</span>
          </div>
        </div>
        <AreaChart
          data={(stats?.userGrowth ?? []).slice().reverse().map((g) => ({ label: g.month, value: g.count }))}
          color="#2563eb"
          gradientId="usersGrad"
        />
      </div>
    </div>
  );
}
