"use client";

import useSWR from "swr";
import { useState } from "react";
import { 
  Eye, 
  Check, 
  X, 
  User as UserIcon,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  Search,
  ExternalLink
} from "lucide-react";

type AdminUser = {
  id: string;
  role: string;
  is_approved: boolean;
  barangay_id: number | null;
  phone: string | null;
  purok_address: string | null;
  sex: string | null;
  birth_date: string | null;
  age: number | null;
  valid_id_path: string | null;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminUsersPage() {
  const { data, error, isLoading, mutate } = useSWR<AdminUser[]>(
    "/api/admin/users",
    fetcher
  );

  const [viewingId, setViewingId] = useState<string | null>(null);

  const getValidIdUrl = (path: string | null) => {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/valid-ids/${path}`;
  };

  async function updateUser(id: string, updates: Partial<AdminUser>) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    void mutate();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 sm:py-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users & Approvals</h1>
          <p className="text-sm font-medium text-slate-500">Approve new residents and manage barangay roles.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search residents..." 
              className="h-10 rounded-xl border-0 bg-white pl-10 pr-4 text-xs font-medium ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600/10"
            />
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] ring-1 ring-slate-200">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm font-bold text-slate-600">Loading user database...</p>
        </div>
      )}

      {error && (
        <div className="rounded-[32px] border border-red-200 bg-red-50 p-8 text-center ring-1 ring-red-100">
          <ShieldCheck className="mx-auto h-12 w-12 text-red-500 opacity-20" />
          <p className="mt-4 text-sm font-bold text-red-700">Failed to load users. Admin privileges required.</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="overflow-hidden rounded-[32px] border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/60">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50/50 text-[10px] uppercase font-bold tracking-widest text-slate-400">
              <tr>
                <th className="px-6 py-4">Resident</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Verification ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data ?? []).map((u) => (
                <tr key={u.id} className="group transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {u.role === 'admin' ? <ShieldCheck className="h-5 w-5" /> : u.id.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <code className="block text-[10px] font-bold text-slate-400 mb-0.5 uppercase">ID: {u.id.slice(0, 8)}</code>
                        <span className="font-bold text-slate-900">{u.role === 'admin' ? 'System Administrator' : 'Resident'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-blue-600" />
                        {u.phone ?? "-"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {u.purok_address ?? "-"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {u.valid_id_path ? (
                      <button 
                        onClick={() => setViewingId(getValidIdUrl(u.valid_id_path))}
                        className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition-all hover:bg-blue-600 hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Document
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 italic">No document uploaded</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {u.is_approved ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-100">
                        <Check className="h-3 w-3" />
                        Approved
                      </span>
                    ) : ( u.valid_id_path ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-600 ring-1 ring-amber-100">
                        Waiting Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-400 ring-1 ring-slate-100">
                        Incomplete
                      </span>
                    ))}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {!u.is_approved && u.valid_id_path && (
                        <button
                          onClick={() => void updateUser(u.id, { is_approved: true })}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => void updateUser(u.id, { role: u.role === "admin" ? "resident" : "admin" })}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        Toggle Role
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && (
            <div className="px-6 py-20 text-center">
              <UserIcon className="mx-auto h-12 w-12 text-slate-200" />
              <p className="mt-4 text-sm font-bold text-slate-400">No registered residents found.</p>
            </div>
          )}
        </div>
      )}

      {/* ID Viewer Modal */}
      {viewingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-full w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-8 py-4">
              <h3 className="text-sm font-bold text-slate-900">Verification Document Preview</h3>
              <button 
                onClick={() => setViewingId(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-auto p-4 bg-slate-50 text-center">
              <img 
                src={viewingId} 
                className="mx-auto max-h-[70vh] rounded-2xl shadow-lg ring-1 ring-slate-200" 
                alt="Valid ID" 
                onError={() => {
                  alert("Failed to load verification document. Please check storage bucket permissions.");
                  setViewingId(null);
                }}
              />
            </div>
            <div className="flex justify-center border-t border-slate-100 bg-white p-6">
              <button 
                onClick={() => setViewingId(null)}
                className="rounded-2xl bg-slate-900 px-8 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

