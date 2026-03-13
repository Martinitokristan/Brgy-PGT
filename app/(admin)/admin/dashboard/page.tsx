"use client";

import { 
  FileText, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  Download,
  Calendar,
  ShieldCheck
} from "lucide-react";

export default function AdminDashboardPage() {
  const stats = [
    { label: "Total Posts", value: "1", icon: FileText, color: "blue", trend: "+12%" },
    { label: "Active Urgent", value: "0", icon: AlertTriangle, color: "red", trend: "0%" },
    { label: "Pending", value: "0", icon: Clock, color: "orange", trend: "0%" },
    { label: "In Progress", value: "0", icon: TrendingUp, color: "indigo", trend: "0%" },
    { label: "Resolved", value: "1", icon: CheckCircle2, color: "emerald", trend: "+5%" },
    { label: "Residents", value: "5", icon: Users, color: "blue", trend: "+2" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Admin Dashboard</h1>
            <p className="text-sm font-medium text-slate-500">Welcome back, Administrator. Here's what's happening today.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 active:scale-95">
            <Calendar className="h-4 w-4" />
            March 13, 2026
          </button>
          <button className="flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95">
            <Download className="h-4 w-4" />
            Reports
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses: Record<string, string> = {
            blue: "bg-blue-600",
            red: "bg-red-500",
            orange: "bg-amber-500",
            indigo: "bg-indigo-500",
            emerald: "bg-emerald-500"
          };
          const colorClass = colorClasses[stat.color] || "bg-blue-600";

          return (
            <div 
              key={stat.label} 
              className="group overflow-hidden rounded-[32px] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/60 transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:ring-slate-300/60"
            >
              <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${colorClass} text-white shadow-lg transition-transform group-hover:scale-110`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
                <span className={`text-[10px] font-bold ${stat.trend.startsWith("+") ? "text-emerald-600" : "text-slate-400"}`}>
                  {stat.trend}
                </span>
              </div>
              <div className={`mt-4 h-1 w-full rounded-full bg-slate-100`}>
                <div className={`h-1 rounded-full ${colorClass}`} style={{ width: stat.value === "0" ? "0%" : "60%" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Posts by Purpose Chart Placeholder */}
        <div className="rounded-[32px] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/60">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Posts by Purpose</h2>
            <select className="rounded-lg border-0 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600/10">
              <option>Last 30 days</option>
              <option>Last 7 days</option>
            </select>
          </div>
          
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative flex h-64 w-64 items-center justify-center">
              {/* Fake Donut Chart with SVG */}
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#ef4444"
                  strokeWidth="12"
                  strokeDasharray="251.2"
                  strokeDashoffset="62.8"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <p className="text-4xl font-black text-slate-900">1</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Posts</p>
              </div>
            </div>
            
            <div className="mt-8 flex flex-wrap justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-slate-600">Emergency (100%)</span>
              </div>
              <div className="flex items-center gap-2 opacity-30">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-slate-600">Complaint</span>
              </div>
              <div className="flex items-center gap-2 opacity-30">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-slate-600">Suggestion</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="rounded-[32px] bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/60">
          <h2 className="mb-6 text-xl font-bold text-slate-900">Recent Barangay Activity</h2>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1 border-b border-slate-50 pb-6 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">New Resident Registered</p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">2h ago</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-500">A new resident from Purok {i} has joined the platform.</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-8 w-full rounded-2xl bg-slate-50 py-4 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
}


