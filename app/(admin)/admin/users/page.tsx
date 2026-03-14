"use client";

import useSWR from "swr";
import { useState } from "react";
import {  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Mail,
  ShieldCheck,
  ShieldX,
  Camera,
  Image as ImageIcon,
  Users,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_approved: boolean;
  phone: string | null;
  purok_address: string | null;
  valid_id_path: string | null;
  avatar: string | null;
  created_at: string;
  barangays?: { name: string } | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-green-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function formatPhoneForDisplay(raw: string | null | undefined) {
  if (!raw) return "No phone verified";
  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith("63") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+63${digits.slice(1)}`;
  if (digits.startsWith("9") && digits.length === 10) return `+63${digits}`;
  return raw;
}

export default function AdminUsersPage() {
  const { data, isLoading, mutate } = useSWR<UserProfile[]>("/api/admin/users", fetcher);

  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [viewingIdUrl, setViewingIdUrl] = useState<string | null>(null);

  const users = data ?? [];

  const allBarangays = Array.from(
    new Set(users.map((u) => u.barangays?.name).filter(Boolean))
  );

  const filtered = users.filter((u) => {
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && u.is_approved) ||
      (filterStatus === "pending" && !u.is_approved);
    return matchRole && matchStatus;
  });

  async function toggleApproval(user: UserProfile) {
    setUpdating(user.id);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, is_approved: !user.is_approved }),
    });
    await mutate();
    setUpdating(null);
  }

  async function toggleRole(user: UserProfile, newRole: string) {
    setUpdating(user.id);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, role: newRole }),
    });
    await mutate();
    setUpdating(null);
  }

  const getStorageUrl = (path: string | null) => {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/valid-ids/${path}`;
  };

  const getAvatarUrl = (avatar: string | null) => {
    if (!avatar) return null;
    if (avatar.startsWith("http")) return avatar;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${avatar}`;
  };

  return (
    <div className="flex max-w-full flex-1 flex-col gap-4 overflow-x-hidden p-4 pb-8 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-slate-700" />
        <h1 className="text-xl font-bold text-slate-900">Users Management</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none"
        >
          <option value="all">All Roles</option>
          <option value="resident">Resident</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
        </select>
        {allBarangays.length > 0 && (
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none">
            <option value="all">All Barangays</option>
            {allBarangays.map((b) => (
              <option key={b} value={b!}>
                {b}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-semibold text-slate-400">No users found.</p>
        </div>
      )}

      {/* User Cards */}
      <div className="flex flex-col gap-3">
        {filtered.map((user) => {
          const initial = (user.name || user.email || "?").charAt(0).toUpperCase();
          const avatarBg = getAvatarColor(user.name || user.id);
          const isExpanded = expandedUserId === user.id;
          const isUpdating = updating === user.id;

          return (
            <motion.div
              layout
              key={user.id}
              className={`relative overflow-hidden break-words rounded-[20px] bg-white shadow-sm transition-all ${
                !user.is_approved ? "border-l-[6px] border-[#f59e0b]" : ""
              }`}
            >
              <div 
                className="flex cursor-pointer items-center gap-4 px-5 py-5"
                onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
              >
                {/* Avatar */}
                <div className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-full shadow-sm ${!getAvatarUrl(user.avatar) ? avatarBg : ""}`}>
                  {getAvatarUrl(user.avatar) ? (
                    <img
                      src={getAvatarUrl(user.avatar)!}
                      alt={user.name || "User"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center text-lg font-bold text-white ${avatarBg}`}>
                      {initial}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="truncate text-[15px] font-bold text-slate-900">
                    {user.name || "Anonymous"}
                  </h3>
                  <p className="truncate text-[13px] font-medium text-slate-400">
                    {user.email}
                  </p>
                </div>

                {/* Approved Indicator (Right Side) */}
                {user.is_approved && (
                  <div className="flex items-center gap-1 text-emerald-500">
                    <CheckCircle2 size={18} />
                    <span className="text-[11px] font-black uppercase tracking-widest hidden sm:inline">Approved</span>
                  </div>
                )}
                
                <ChevronDown 
                   size={20} 
                   className={`text-slate-300 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} 
                />
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-slate-50 px-6 pb-8 pt-6">
                      <div className="flex flex-col gap-5">
                        {/* Status Icons & Details */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 text-slate-600">
                            <Phone size={18} className="text-slate-400" />
                            <span className="text-sm font-bold">{formatPhoneForDisplay(user.phone)}</span>
                          </div>

                          <div className="flex items-center gap-3 text-slate-600">
                            <MapPin size={18} className="text-slate-400" />
                            <span className="text-sm font-bold">
                              {user.barangays?.name || "Barangay Pagatpatan"} — {user.purok_address || "No address"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-slate-600">
                            <Calendar size={18} className="text-slate-400" />
                            <span className="text-sm font-bold">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {/* View Valid ID Button - Only for Pending/Verification */}
                          {!user.is_approved && (
                            <div className="flex items-center gap-3">
                              <ImageIcon size={18} className="text-slate-400" />
                              <button
                                onClick={() => setViewingIdUrl(getStorageUrl(user.valid_id_path))}
                                className="rounded-lg border border-blue-600 px-4 py-1.5 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-50"
                              >
                                View Valid ID
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <label className="text-sm font-bold text-slate-600">Role:</label>
                            <select 
                              value={user.role || "resident"}
                              onChange={(e) => toggleRole(user, e.target.value)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                            >
                              <option value="resident">Resident</option>
                              <option value="admin">Admin</option>
                              <option value="rider">Rider</option>
                            </select>
                          </div>
                        </div>

                        {/* Approval Actions */}
                        {!user.is_approved && (
                          <div className="flex gap-3 pt-2">
                            <button
                              disabled={isUpdating}
                              onClick={() => toggleApproval(user)}
                              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                            >
                              {isUpdating ? "..." : (
                                <>
                                  <CheckCircle2 size={18} />
                                  Approve
                                </>
                              )}
                            </button>
                            <button
                              className="flex items-center gap-2 rounded-xl bg-[#dc2626] px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-700 active:scale-[0.98]"
                            >
                              <XCircle size={18} />
                              Reject
                            </button>
                          </div>
                        )}
                        
                        {user.is_approved && (
                           <div className="flex gap-3 pt-2">
                              <Link
                                href={`/admin/users/${user.id}`}
                                className="flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-2.5 text-sm font-bold text-slate-900 transition-all hover:bg-slate-200"
                              >
                                <ExternalLink size={18} />
                                View Profile
                              </Link>
                              <button
                                disabled={isUpdating}
                                onClick={() => toggleApproval(user)}
                                className="rounded-xl bg-slate-100 px-6 py-2.5 text-sm font-bold text-slate-500 transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              >
                                {isUpdating ? "..." : "Revoke Access"}
                              </button>
                           </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* ID Viewer Modal */}
      <AnimatePresence>
        {viewingIdUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingIdUrl(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[32px] bg-white p-2 shadow-2xl"
            >
              <button
                onClick={() => setViewingIdUrl(null)}
                className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white backdrop-blur-md hover:bg-black/70"
              >
                <ChevronDown className="rotate-180" size={24} />
              </button>
              <div className="aspect-[4/3] w-full overflow-hidden rounded-[26px] bg-slate-100">
                <img 
                  src={viewingIdUrl} 
                  alt="Valid ID Document" 
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="p-6 text-center">
                <h3 className="text-lg font-bold text-slate-900">Valid ID Document</h3>
                <p className="text-sm font-medium text-slate-500">Please verify the photo matches the user's information.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
