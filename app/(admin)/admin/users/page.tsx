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
  ExternalLink,
  Clock,
  FileText,
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

type VerificationRequest = {
  id: number;
  status: string;
  valid_id_type: string;
  valid_id_path: string;
  selfie_path: string;
  valid_id_url?: string;
  selfie_url?: string;
  submitted_at: string;
  rejection_reason: string | null;
  profiles: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    purok_address: string | null;
  } | null;
};


const ID_TYPE_LABELS: Record<string, string> = {
  national_id: "National ID",
  passport: "Passport",
  drivers_license: "Driver's License",
  voters_id: "Voter's ID",
  school_id: "School ID",
  senior_citizen_id: "Senior Citizen ID",
  pwd_id: "PWD ID",
  postal_id: "Postal ID",
  sss_id: "SSS ID",
  philhealth_id: "PhilHealth ID",
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
  const { data, isLoading, mutate } = useSWR<UserProfile[]>("/api/admin?action=users", fetcher);
  const { data: verRequests, isLoading: verLoading, mutate: mutateVer } = useSWR<VerificationRequest[]>(
    "/api/admin/verification",
    fetcher
  );

  const [activeTab, setActiveTab] = useState<"users" | "verification">("users");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [viewingIdUrl, setViewingIdUrl] = useState<string | null>(null);
  const [viewingModal, setViewingModal] = useState<{ url: string; title: string } | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_user", id: user.id, is_approved: !user.is_approved }),
    });
    await mutate();
    setUpdating(null);
  }

  async function toggleRole(user: UserProfile, newRole: string) {
    setUpdating(user.id);
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_user", id: user.id, role: newRole }),
    });
    await mutate();
    setUpdating(null);
  }

  const getStorageUrl = (bucket: string, path: string | null) => {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  };

  const getVerificationFileUrl = (bucket: string, path: string) => {
    // Private bucket â€” serve via API or signed URL. For now use service-level public path
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  };

  async function handleVerificationAction(id: number, action: "approve" | "reject", reason?: string) {
    setUpdating(String(id));
    await fetch("/api/admin/verification", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, reason }),
    });
    await mutateVer();
    setUpdating(null);
    setRejectId(null);
    setRejectReason("");
  }

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

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("users")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "users" ? "bg-blue-600 text-white shadow" : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          All Users
        </button>
        <button
          onClick={() => setActiveTab("verification")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "verification" ? "bg-blue-600 text-white shadow" : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Verification Requests
          {(verRequests?.length ?? 0) > 0 && (
            <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
              {verRequests?.length}
            </span>
          )}
        </button>
      </div>

      {/* â”€â”€ VERIFICATION REQUESTS TAB â”€â”€ */}
      {activeTab === "verification" && (
        <div className="flex flex-col gap-3">
          {verLoading && (
            <div className="flex flex-col gap-2">
              {[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />)}
            </div>
          )}
          {!verLoading && (verRequests ?? []).length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ShieldCheck className="mb-3 h-10 w-10 text-emerald-400" />
              <p className="text-sm font-semibold text-slate-400">No pending verification requests.</p>
            </div>
          )}
          {(verRequests ?? []).map((req) => (
            <div key={req.id} className="overflow-hidden rounded-[20px] bg-white shadow-sm">
              <div className="flex items-start gap-4 px-5 py-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-lg">
                  {(req.profiles?.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="truncate text-[15px] font-bold text-slate-900">{req.profiles?.name || "Unknown"}</h3>
                  <p className="truncate text-[13px] text-slate-400">{req.profiles?.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                      <FileText className="h-3 w-3" />
                      {ID_TYPE_LABELS[req.valid_id_type] ?? req.valid_id_type}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                      <Clock className="h-3 w-3" />
                      {new Date(req.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-50 px-6 pb-6 pt-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setViewingModal({ url: req.valid_id_url ?? "", title: "Valid ID" })}
                    className="flex items-center gap-2 rounded-xl border border-blue-600 px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
                  >
                    <ImageIcon className="h-4 w-4" /> View Valid ID
                  </button>
                  <button
                    onClick={() => setViewingModal({ url: req.selfie_url ?? "", title: "Selfie Photo" })}
                    className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <Camera className="h-4 w-4" /> View Selfie
                  </button>

                </div>
                {/* Reject reason input */}
                {rejectId === req.id && (
                  <div className="mb-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Reason for rejection (optional)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerificationAction(req.id, "reject", rejectReason)}
                        disabled={updating === String(req.id)}
                        className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" /> Confirm Reject
                      </button>
                      <button onClick={() => setRejectId(null)} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    disabled={updating === String(req.id)}
                    onClick={() => handleVerificationAction(req.id, "approve")}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    {updating === String(req.id) ? "Processingâ€¦" : "Approve & Verify"}
                  </button>
                  {rejectId !== req.id && (
                    <button
                      onClick={() => setRejectId(req.id)}
                      className="flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-200"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* â”€â”€ ALL USERS TAB â”€â”€ */}
      {activeTab === "users" && (
        <>
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
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[15px] font-bold text-slate-900">
                      {user.name || "Anonymous"}
                    </h3>
                    {(user as UserProfile & { is_verified?: boolean }).is_verified && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[13px] font-medium text-slate-400">
                    {user.email}
                  </p>
                </div>

                {/* Status Badge (Right Side) */}
                {(user as UserProfile & { is_verified?: boolean }).is_verified ? (
                  <div className="hidden sm:flex items-center gap-1 text-emerald-500">
                    <ShieldCheck size={16} />
                    <span className="text-[11px] font-black uppercase tracking-widest">Verified</span>
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-1 text-slate-400">
                    <span className="text-[11px] font-semibold uppercase tracking-widest">Unverified</span>
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
                              {user.barangays?.name || "Barangay Pagatpatan"} â€” {user.purok_address || "No address"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-slate-600">
                            <Calendar size={18} className="text-slate-400" />
                            <span className="text-sm font-bold">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Verification Status */}
                          <div className="flex items-center gap-3">
                            <ShieldCheck size={18} className="text-slate-400" />
                            {(user as UserProfile & { is_verified?: boolean }).is_verified ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Account Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                                Not Verified
                              </span>
                            )}
                          </div>

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

                        {/* View Profile link only */}
                        <div className="flex gap-3 pt-2">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-2.5 text-sm font-bold text-slate-900 transition-all hover:bg-slate-200"
                          >
                            <ExternalLink size={18} />
                            View Profile
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

        </>
      )}

      {/* Unified Image Viewer Modal */}
      <AnimatePresence>
        {viewingModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingModal(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[32px] bg-white p-2 shadow-2xl"
            >
              <button
                onClick={() => setViewingModal(null)}
                className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white backdrop-blur-md hover:bg-black/70"
              >
                <XCircle size={20} />
              </button>
              <div className="aspect-[4/3] w-full overflow-hidden rounded-[26px] bg-slate-100">
                <img
                  src={viewingModal.url}
                  alt={viewingModal.title}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="p-6 text-center">
                <h3 className="text-lg font-bold text-slate-900">{viewingModal.title}</h3>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
