"use client";

import useSWR from "swr";
import { useState, useRef, useCallback } from "react";
import { 
  ThumbsUp, 
  MessageCircle, 
  MoreHorizontal,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  X,
  Send,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import CommentDrawer from "@/app/components/ui/CommentDrawer";
import ImageLightbox from "@/app/components/ui/ImageLightbox";
import { supabase } from "@/lib/supabaseClient";
import { useEffect } from "react";

type Post = {
  id: number;
  user_id: string;
  title: string | null;
  description: string | null;
  purpose: string | null;
  urgency_level: string | null;
  status: string | null;
  created_at: string | null;
  image: string | null;
  profiles: { name: string } | null;
  reaction_counts: Record<string, number>;
  my_reaction: string | null;
  comment_count: number;
};

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

const ShareIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M14 9V5L22 12L14 19V14.9C8.5 14.9 4.7 16.6 2 20.4C3.1 14.9 6.4 9.5 14 9Z" />
  </svg>
);

export default function FeedPage() {
  const { data: me } = useSWR("/api/profile/me", fetcher);
  const { data, error, isLoading, mutate } = useSWR<Post[]>("/api/posts", fetcher);
  const [showingEmojiFor, setShowingEmojiFor] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Comment Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  // Lightbox state
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Post upload progress
  const [uploadProgress, setUploadProgress] = useState(0);

  // Real-time counts for comments
  useEffect(() => {
    const channel = supabase
      .channel("feed-comment-counts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
        },
        () => {
          mutate(); // Update counts in real-time
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);
  
  // Post Creation State
  const [isExpanding, setIsExpanding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("general");
  const [urgency, setUrgency] = useState("low");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("purpose", purpose);
    formData.append("urgency_level", urgency);
    if (selectedImage) formData.append("image", selectedImage);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/posts");

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploadProgress(100);
      if (xhr.status >= 200 && xhr.status < 300) {
        setTitle("");
        setDescription("");
        setPurpose("general");
        setUrgency("low");
        removeImage();
        setIsExpanding(false);
        mutate();
      }
      setIsSubmitting(false);
      setTimeout(() => setUploadProgress(0), 600);
    };

    xhr.onerror = () => { setIsSubmitting(false); setUploadProgress(0); };
    xhr.send(formData);
  };
  
  const handleReact = useCallback(async (postId: number, type: string) => {
    setShowingEmojiFor(null);
    await fetch(`/api/posts/${postId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    void mutate();
  }, [mutate]);

  const reactionEmojis: { type: string; emoji: string; label: string; color: string }[] = [
    { type: "like",    emoji: "👍", label: "Like",    color: "text-blue-600" },
    { type: "heart",   emoji: "❤️", label: "Love",    color: "text-red-500"  },
    { type: "support", emoji: "🤝", label: "Support", color: "text-yellow-600" },
    { type: "haha",    emoji: "😂", label: "Haha",    color: "text-amber-500" },
    { type: "sad",     emoji: "😢", label: "Sad",     color: "text-blue-400"  },
    { type: "angry",   emoji: "😡", label: "Angry",   color: "text-red-700"  },
  ];

  const suppressScrollRef = useRef(false);

  function startLongPress(postId: number) {
    suppressScrollRef.current = false;
    longPressTimer.current = setTimeout(() => {
      suppressScrollRef.current = true;
      setShowingEmojiFor(postId);
    }, 480);
  }

  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function handleTouchMove(e: React.TouchEvent) {
    // Prevent page scroll if emoji picker is open or long-press just fired
    if (suppressScrollRef.current) e.preventDefault();
    else cancelLongPress(); // finger moved before long-press: cancel
  }

  const handleShare = (postId: number) => {
    const url = `${window.location.origin}/posts/${postId}`;
    if (navigator.share) {
      void navigator.share({
        title: "Check out this post",
        url: url,
      });
    } else {
      void navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const openComments = (postId: number) => {
    setSelectedPostId(postId);
    setIsDrawerOpen(true);
  };

  const getStorageUrl = (path: string) => {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${path}`;
  };

  return (
    <>
    {/* Image Lightbox */}
    {lightboxSrc && (
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    )}

    {/* Create Post Modal */}
    {isExpanding && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Blur backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => { setIsExpanding(false); removeImage(); }}
        />
        <div className="relative z-10 w-full max-w-lg mx-0 sm:mx-4 overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-sm shadow">
                {me?.name?.charAt(0) || "U"}
              </div>
              <div>
                <p className="text-[14px] font-bold text-slate-900">{me?.name || "Resident"}</p>
                <p className="text-[11px] text-slate-400">Public Post</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setIsExpanding(false); removeImage(); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-5 py-4 space-y-3">
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your post a title..."
                className="w-full border-0 bg-transparent text-[18px] font-bold text-slate-900 focus:outline-none placeholder:text-slate-300"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                className="w-full resize-none border-0 bg-transparent text-[15px] text-slate-600 focus:outline-none placeholder:text-slate-300 leading-relaxed"
              />
              {imagePreview && (
                <div className="relative overflow-hidden rounded-2xl ring-1 ring-slate-200">
                  <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-56" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-sm hover:bg-slate-900/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Tags row */}
            <div className="flex items-center gap-2 px-5 py-2 border-t border-slate-50">
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 focus:outline-none border-0"
              >
                <option value="general">General</option>
                <option value="emergency">Emergency</option>
                <option value="complaint">Complaint</option>
                <option value="suggestion">Suggestion</option>
              </select>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold focus:outline-none border-0 ${
                  urgency === "high" ? "bg-red-50 text-red-600" : urgency === "medium" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Actions row */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
              <div className="flex items-center gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                >
                  <ImageIcon className="h-4 w-4" />
                  Photo
                </button>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <span>Post</span>
                    <Send className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
            {/* Upload progress bar */}
            {isSubmitting && (
              <div className="px-5 pb-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-center text-[11px] font-semibold text-slate-400">
                  Uploading… {uploadProgress}%
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    )}

    <div className="mx-auto w-full max-w-5xl space-y-6 px-0 sm:px-4">
      {/* What's on your mind? Card */}
      <div className="overflow-hidden rounded-none border-b border-slate-100 bg-white px-4 py-3 sm:rounded-2xl sm:border sm:shadow-sm sm:ring-1 sm:ring-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-sm shadow">
            {me?.name?.charAt(0) || "U"}
          </div>
          <button
            onClick={() => setIsExpanding(true)}
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-2 text-left text-sm text-slate-400 transition-all hover:bg-slate-100"
          >
            What&apos;s on your mind, {me?.name?.split(" ")[0] || ""}?
          </button>
        </div>
      </div>

      <section className="space-y-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm font-medium">Loading feed...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 p-6 text-center ring-1 ring-red-100">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-sm font-bold text-red-600">Failed to load posts</p>
          </div>
        )}

        <div className="grid gap-6">
          {(data ?? []).length === 0 && !isLoading && !error && (
            <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
              <p className="text-slate-500">No updates to show right now.</p>
            </div>
          )}

          {(data ?? []).map((post) => (
            <article
              key={post.id}
              className="group overflow-hidden rounded-none border-x-0 border-y border-slate-100 bg-white shadow-sm transition-all hover:bg-slate-50/50 sm:rounded-[20px] sm:border"
            >
              <div className="p-4 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex gap-4">
                    <Link href={`/profile/${post.user_id}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm shadow-md transition-transform hover:scale-105">
                      {(post.profiles?.name || "K").charAt(0)}
                    </Link>
                    <div>
                      <div className="flex flex-col leading-tight">
                        <Link 
                          href={`/profile/${post.user_id}`}
                          className="text-[16px] font-bold text-[#385898] transition-colors hover:underline"
                        >
                          {post.profiles?.name || "Anonymous Resident"}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-1.5 text-slate-400">
                          <AlertCircle className="h-3.5 w-3.5" /> 
                          <span className="text-[13px] font-medium">• {post.purpose || "General"}</span>
                        </div>
                        <p className="mt-0.5 text-[12px] font-medium text-slate-400">
                          {post.created_at ? new Date(post.created_at).toLocaleString() : "Recently"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {post.status === "resolved" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold text-white shadow-sm">
                        <CheckCircle2 className="h-3 w-3" />
                        Resolved
                      </span>
                    )}
                    <button className="text-slate-300 hover:text-slate-600">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mb-4 space-y-1">
                  <h2 className="text-[18px] font-extrabold text-slate-900 leading-tight tracking-tight">
                    {post.title || "No Title"}
                  </h2>
                  <p className="text-[15px] font-medium leading-relaxed text-slate-500/90">
                    {post.description}
                  </p>
                </div>

                {post.image && (
                  <div className="mb-4 mt-4 overflow-hidden rounded-xl ring-1 ring-slate-100 bg-slate-50">
                    <button
                      type="button"
                      className="block w-full focus:outline-none"
                      onClick={() => setLightboxSrc(getStorageUrl(post.image!) || "")}
                    >
                      <img
                        src={getStorageUrl(post.image) || ""}
                        alt={post.title || ""}
                        className="w-full object-contain"
                        style={{ maxHeight: "500px" }}
                      />
                    </button>
                  </div>
                )}
              </div>

              {post.status === "resolved" && (
                <div className="mx-4 mb-1 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 ring-1 ring-emerald-100">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-[12px] font-bold text-emerald-700">This issue has been resolved</p>
                    <p className="text-[11px] text-emerald-600/70">The barangay has addressed this concern.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col border-t border-slate-100 px-4 py-2 sm:px-6">
                {/* Count Row */}
                <div className="flex justify-end border-b border-slate-50 pb-2 px-1">
                  {post.comment_count > 0 && (
                    <button 
                      onClick={() => openComments(post.id)}
                      className="text-[12px] font-medium text-slate-500 hover:underline"
                    >
                      {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
                    </button>
                  )}
                </div>

                {/* Buttons Row */}
                <div className="relative grid grid-cols-3 gap-1 pt-1 sm:gap-2">
                  {/* Emoji picker popup */}
                  {showingEmojiFor === post.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowingEmojiFor(null)} />
                      <div className="absolute -top-14 left-0 z-20 flex items-center gap-1 rounded-full bg-white px-3 py-2 shadow-2xl ring-1 ring-slate-100">
                        {reactionEmojis.map((r) => (
                          <button
                            key={r.type}
                            onClick={() => handleReact(post.id, r.type)}
                            title={r.label}
                            className="group flex flex-col items-center transition-transform hover:-translate-y-2 hover:scale-125 active:scale-110"
                          >
                            <span className="text-[22px] leading-none">{r.emoji}</span>
                            <span className="mt-0.5 hidden text-[9px] font-bold text-slate-500 group-hover:block">{r.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Like button — tap = toggle, hold = emoji picker */}
                  <button
                    onMouseDown={() => startLongPress(post.id)}
                    onMouseUp={() => { cancelLongPress(); if (showingEmojiFor !== post.id) handleReact(post.id, "like"); }}
                    onMouseLeave={cancelLongPress}
                    onTouchStart={(e) => { e.stopPropagation(); startLongPress(post.id); }}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      cancelLongPress();
                      suppressScrollRef.current = false;
                      if (showingEmojiFor !== post.id) handleReact(post.id, "like");
                    }}
                    className={`flex min-w-0 select-none items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-bold transition-all hover:bg-slate-50 sm:gap-2 sm:text-[14px] ${
                      post.my_reaction ? "text-blue-600" : "text-[#65676B]"
                    }`}
                  >
                    {post.my_reaction ? (
                      <span className="text-[18px] leading-none">
                        {reactionEmojis.find(r => r.type === post.my_reaction)?.emoji ?? "👍"}
                      </span>
                    ) : (
                      <ThumbsUp size={18} className="shrink-0" />
                    )}
                    <span className="truncate capitalize">
                      {post.my_reaction ? (reactionEmojis.find(r => r.type === post.my_reaction)?.label ?? "Like") : "Like"}
                    </span>
                  </button>

                  <button
                    onClick={() => openComments(post.id)}
                    className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-bold text-[#65676B] transition-all hover:bg-slate-50 sm:gap-2 sm:text-[14px]"
                  >
                    <MessageCircle size={18} className="shrink-0" />
                    <span className="truncate">Comment</span>
                  </button>
                  <button
                    onClick={() => handleShare(post.id)}
                    className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-bold text-[#65676B] transition-all hover:bg-slate-50 sm:gap-2 sm:text-[14px]"
                  >
                    <ShareIcon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">Share</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
    <CommentDrawer
      postId={selectedPostId}
      isOpen={isDrawerOpen}
      onClose={() => setIsDrawerOpen(false)}
      me={me}
    />
    </>
  );
}
