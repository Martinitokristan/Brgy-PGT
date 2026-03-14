"use client";

import { useState, useMemo, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { 
  ArrowLeft, 
  MessageCircle, 
  Share2, 
  ThumbsUp, 
  Smile, 
  Send, 
  Loader2,
  AlertCircle,
  MapPin,
  Calendar,
  MoreHorizontal
} from "lucide-react";
import CommentItem from "./components/CommentItem";

type Post = {
  id: number;
  user_id: string;
  title: string | null;
  description: string | null;
  purpose: string | null;
  urgency_level: string | null;
  status: string | null;
  image: string | null;
  profiles: { name: string } | null;
  created_at: string | null;
};

type Comment = {
  id: number;
  post_id: number;
  user_id: string;
  parent_id: number | null;
  body: string;
  liked_by: string[];
  profiles: { name: string } | null;
  created_at: string;
};

type ReactionSummary = {
  counts: Record<string, number>;
  myReaction: string | null;
};

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  
  const { data: me } = useSWR("/api/profile/me", fetcher);
  const { data: post, error: postError, isLoading: postLoading } = useSWR<Post>(id ? `/api/posts/${id}` : null, fetcher);
  const { data: comments, mutate: mutateComments } = useSWR<Comment[]>(id ? `/api/posts/${id}/comments` : null, fetcher);
  const { data: reactions, mutate: mutateReactions } = useSWR<ReactionSummary>(id ? `/api/posts/${id}/reactions` : null, fetcher);

  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: number; name: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const thread = useMemo(() => {
    const byParent: Record<string, Comment[]> = {};
    (comments ?? []).forEach(c => {
      const key = String(c.parent_id ?? "root");
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(c);
    });
    return byParent;
  }, [comments]);

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          body: newComment.trim(),
          parent_id: replyTarget?.id ?? null 
        }),
      });

      if (res.ok) {
        setNewComment("");
        setReplyTarget(null);
        mutateComments();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: number, body: string) => {
    const res = await fetch(`/api/posts/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) mutateComments();
  };

  const handleDeleteComment = async (commentId: number) => {
    const res = await fetch(`/api/posts/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) mutateComments();
  };

  const handleLikeComment = async (commentId: number) => {
    await fetch(`/api/posts/${id}/comments/${commentId}/like`, { method: "POST" });
    mutateComments();
  };

  const handleReact = async (type: string) => {
    await fetch(`/api/posts/${id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    mutateReactions();
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: post?.title || "Post", url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  };

  const reactionEmojis: Record<string, string> = {
    like: "👍",
    heart: "❤️",
    support: "🤝",
    sad: "😢"
  };

  if (postLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 bg-slate-50/30">
      {/* Navigation */}
      <button 
        onClick={() => router.back()}
        className="mb-8 flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-900 group"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-transform group-hover:-translate-x-1">
          <ArrowLeft size={16} />
        </div>
        Back to Feed
      </button>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Post Content */}
        <div className="lg:col-span-2 space-y-6">
          <article className="overflow-hidden rounded-[32px] bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-200">
            {post?.image && (
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                <img 
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${post.image}`}
                  alt={post.title || "Post image"}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="p-8 sm:p-10">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-lg font-bold text-white shadow-lg shadow-blue-500/20">
                    {post?.profiles?.name?.charAt(0).toUpperCase() || "B"}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-none">
                      {post?.profiles?.name || "Barangay Resident"}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {post?.created_at ? new Date(post.created_at).toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' }) : "Recently"}
                    </p>
                  </div>
                </div>
                
                <button className="rounded-xl p-2 text-slate-300 hover:bg-slate-50 hover:text-slate-600">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {post?.title}
              </h1>
              
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                {post?.description}
              </p>

              {/* Urgency & Status Badges */}
              <div className="mt-8 flex flex-wrap gap-3">
                 {post?.urgency_level && (
                   <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ring-1 ${
                     post.urgency_level === 'high' ? 'bg-red-50 text-red-600 ring-red-100' : 'bg-amber-50 text-amber-600 ring-amber-100'
                   }`}>
                     <AlertCircle size={14} />
                     <span className="uppercase tracking-wider">{post.urgency_level} Priority</span>
                   </div>
                 )}
                 {post?.status && (
                   <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-600 ring-1 ring-emerald-100">
                     <span className="uppercase tracking-wider">{post.status}</span>
                   </div>
                 )}
              </div>

              {/* Big Interaction Buttons */}
              <div className="mt-10 flex items-center gap-3 border-t border-slate-100 pt-8">
                <div className="flex grow items-center gap-2 overflow-x-auto rounded-2xl bg-slate-50 p-2 no-scrollbar">
                  {Object.entries(reactionEmojis).map(([type, emoji]) => {
                    const count = reactions?.counts?.[type] ?? 0;
                    const active = reactions?.myReaction === type;
                    return (
                      <button
                        key={type}
                        onClick={() => handleReact(type)}
                        className={`flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl p-3 transition-all ${
                          active ? "bg-white text-blue-600 shadow-md ring-1 ring-blue-100" : "text-slate-400 hover:bg-white hover:text-slate-600"
                        }`}
                      >
                        <span className="text-xl">{emoji}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{count}</span>
                      </button>
                    );
                  })}
                </div>
                
                <button 
                  onClick={handleShare}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 transition-all hover:bg-indigo-700 active:scale-95"
                >
                  <Share2 size={24} />
                </button>
              </div>
            </div>
          </article>

          {/* Comments Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <h2 className="flex items-center gap-3 text-xl font-black text-slate-900">
                <MessageCircle size={24} className="text-blue-600" />
                Comments
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                  {comments?.length || 0}
                </span>
              </h2>
            </div>

            <div className="rounded-[32px] bg-white p-6 shadow-lg shadow-slate-200/40 ring-1 ring-slate-200 sm:p-8">
              {/* Comment Input */}
              <div className="mb-10">
                {replyTarget && (
                  <div className="mb-3 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600">
                     <span>Replying to <span className="font-black underline">{replyTarget.name}</span></span>
                     <button onClick={() => setReplyTarget(null)} className="rounded-full p-1 hover:bg-blue-100">
                       <ArrowLeft size={14} className="rotate-90" />
                     </button>
                  </div>
                )}
                <form onSubmit={handleAddComment} className="relative flex items-center gap-4">
                  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 sm:flex">
                     {me?.profile?.name?.charAt(0).toUpperCase() || me?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="relative flex-1">
                    <input 
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={replyTarget ? `Write a reply...` : "Add a comment..."}
                      className="w-full rounded-2xl border-0 bg-slate-50 px-6 py-4 text-sm font-medium text-slate-900 shadow-inner ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="absolute right-14 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Smile size={20} />
                    </button>
                    <button 
                      type="submit"
                      disabled={!newComment.trim() || isSubmitting}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-90 disabled:opacity-50 disabled:shadow-none"
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} />}
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full right-0 mb-4 flex gap-2 rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-slate-200 z-50">
                        {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(e => (
                          <button key={e} onClick={() => { setNewComment(p => p + e); setShowEmojiPicker(false); }} className="text-xl transition-transform hover:scale-125">{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Comments List */}
              <div className="space-y-2">
                {(thread["root"] ?? []).map(comment => (
                  <CommentItem 
                    key={comment.id}
                    comment={comment}
                    me={me}
                    replies={thread[String(comment.id)]}
                    onReply={(cid, name) => {
                      setReplyTarget({ id: cid, name });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onLike={handleLikeComment}
                    onDelete={handleDeleteComment}
                    onUpdate={handleUpdateComment}
                  />
                ))}
                
                {(!comments || comments.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-200">
                      <MessageCircle size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">Be the first to comment on this post.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="rounded-[32px] bg-white p-8 shadow-lg shadow-slate-200/40 ring-1 ring-slate-200">
            <h3 className="mb-6 text-xs font-black uppercase tracking-[0.2em] text-blue-600">Post Info</h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Posted On</p>
                  <p className="text-sm font-bold text-slate-900">
                    {post?.created_at ? new Date(post.created_at).toLocaleString() : "Recently"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</p>
                  <p className="text-sm font-bold text-slate-900">Brgy. Pagatpatan</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Post ID</p>
                  <p className="text-sm font-bold text-slate-900">#{post?.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
