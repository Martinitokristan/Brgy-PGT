"use client";

import useSWR from "swr";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Search,
  PlusCircle,
  User as UserIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit3,
  ShieldCheck
} from "lucide-react";

type Post = {
  id: number;
  title: string | null;
  description: string | null;
  purpose: string | null;
  urgency_level: string | null;
  status: string | null;
  created_at: string | null;
  image: string | null;
  user_name?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPostsPage() {
  const { data, error, isLoading } = useSWR<Post[]>("/api/posts", fetcher);

  const getStorageUrl = (path: string | null) => {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${path}`;
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Posts</h1>
          <p className="text-sm font-medium text-slate-500">Review and moderate barangay activity.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search posts..." 
              className="h-10 rounded-xl border-0 bg-white pl-10 pr-4 text-xs font-medium ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600/10"
            />
          </div>
        </div>
      </div>

      {/* "What's on your mind?" - In Admin, this might be for making official announcements */}
      <div className="overflow-hidden rounded-[32px] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/60 transition-all hover:ring-blue-200/60">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Post an official announcement..."
                className="w-full rounded-[24px] border-0 bg-slate-50 px-6 py-4 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/10 ring-1 ring-slate-100"
              />
              <div className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full text-blue-600">
                <PlusCircle className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm font-medium">Loading posts...</p>
          </div>
        )}

        {error && (
          <div className="rounded-3xl bg-red-50 p-6 text-center ring-1 ring-red-100">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-sm font-bold text-red-600">Failed to load posts</p>
          </div>
        )}

        <div className="grid gap-6">
          {(data ?? []).map((post) => (
            <article
              key={post.id}
              className="group overflow-hidden rounded-[32px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/60 transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:ring-slate-300/60"
            >
              <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 text-lg">
                      {(post.user_name || "K").charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{post.user_name || "Kit Riley Sagusay"}</h3>
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          • <AlertCircle className="h-3 w-3" /> {post.purpose || "Emergency"}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-400">
                        {post.created_at ? new Date(post.created_at).toLocaleString() : "3/13/2026, 12:58:42 PM"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  <div className="flex gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold ring-1 ${
                      post.status === "resolved" 
                        ? "bg-emerald-50 text-emerald-600 ring-emerald-100" 
                        : "bg-amber-50 text-amber-600 ring-amber-100"
                    }`}>
                      {post.status === "resolved" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {post.status?.charAt(0).toUpperCase() + (post.status?.slice(1) || "Pending")}
                    </span>
                    {post.urgency_level === "high" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-[10px] font-bold text-red-600 ring-1 ring-red-100 animate-pulse">
                        Urgent
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {post.title || "Naay Kawatan"}
                  </h2>
                  <p className="text-sm font-medium leading-relaxed text-slate-600">
                    {post.description || "Nawad-an mig manok diris among purok"}
                  </p>
                  
                  {post.image && (
                    <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-100">
                      <img 
                        src={getStorageUrl(post.image) || ""} 
                        alt={post.title || ""} 
                        className="w-full object-cover max-h-96"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 bg-slate-50/30 px-6 py-4">
                <div className="flex gap-6">
                  <button className="flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-rose-500">
                    <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
                    <span>Heart</span>
                  </button>
                  <button className="flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-blue-500">
                    <MessageCircle className="h-5 w-5" />
                    <span>Comment</span>
                  </button>
                </div>
                <button className="flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-indigo-500">
                  <Share2 className="h-5 w-5" />
                  <span>Share</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
