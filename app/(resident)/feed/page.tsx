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
import { useT } from "@/lib/useT";
import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";

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
  profiles: { name: string; avatar?: string | null } | null;
  author_role: string | null;
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
  const { data: me } = useSWR("/api/profile?action=me", fetcher);
  const { t } = useT();
  const { data, error, isLoading, mutate } = useSWR<Post[]>("/api/posts", fetcher);
  const [showingEmojiFor, setShowingEmojiFor] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

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
    await fetch(`/api/posts/${postId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reaction", type }),
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

  // Track which emoji the user is hovering over during drag
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Register non-passive touchmove to allow preventDefault when emoji picker is open
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    function onTouchMove(e: TouchEvent) {
      if (suppressScrollRef.current) {
        e.preventDefault();
        // Detect which emoji button the finger is over
        const touch = e.touches[0];
        if (!touch) return;
        const els = document.elementsFromPoint(touch.clientX, touch.clientY);
        let found: string | null = null;
        for (const el of els) {
          const t = (el as HTMLElement).dataset?.reactionType;
          if (t) { found = t; break; }
        }
        setHoveredEmoji(found);
      }
    }
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  function startLongPress(postId: number) {
    suppressScrollRef.current = false;
    longPressTimer.current = setTimeout(() => {
      suppressScrollRef.current = true;
      setHoveredEmoji(null);
      setShowingEmojiFor(postId);
    }, 450);
  }

  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function handleTouchMoveReaction() {
    if (!suppressScrollRef.current) cancelLongPress();
  }

  function handleTouchEndReaction(e: React.TouchEvent, postId: number) {
    e.preventDefault();
    cancelLongPress();
    suppressScrollRef.current = false;
    if (showingEmojiFor === postId && hoveredEmoji) {
      // User dragged to an emoji and released
      handleReact(postId, hoveredEmoji);
      setHoveredEmoji(null);
    } else if (showingEmojiFor !== postId) {
      // Short tap = toggle like
      handleReact(postId, "like");
    } else {
      // Opened picker but released without selecting = close
      setShowingEmojiFor(null);
      setHoveredEmoji(null);
    }
  }

  const [sharePostId, setSharePostId] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = (postId: number) => {
    setSharePostId(postId);
    setShareCopied(false);
  };

  const shareUrl = sharePostId ? `${typeof window !== "undefined" ? window.location.origin : ""}/posts/${sharePostId}` : "";

  const copyShareLink = () => {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const openComments = (postId: number) => {
    setSelectedPostId(postId);
    setIsDrawerOpen(true);
  };

  const getStorageUrl = (path: string) => {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${path}`;
  };

  const getAvatarUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
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

    <div ref={feedRef} className="mx-auto w-full max-w-5xl space-y-6 px-0 sm:px-4">

      {/* What's on your mind? Card */}
      {me?.is_verified || me?.role === "admin" ? (
      <div className="overflow-hidden rounded-none border-b border-slate-100 bg-white dark:bg-slate-900 dark:border-slate-700 px-4 py-3 sm:rounded-2xl sm:border sm:shadow-sm sm:ring-1 sm:ring-slate-200 dark:sm:ring-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-sm shadow">
            {me?.name?.charAt(0) || "U"}
          </div>
          <button
            onClick={() => setIsExpanding(true)}
            className="flex-1 rounded-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-5 py-2 text-left text-sm text-slate-400 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {t("whats_on_your_mind")}, {me?.name?.split(" ")[0] || ""}?
          </button>
        </div>
      </div>
      ) : me && !me.is_verified ? (
        <div className="overflow-hidden rounded-none border-b border-amber-100 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 sm:rounded-2xl sm:border sm:border-amber-200 sm:shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-amber-800">Account not yet verified</p>
              <p className="text-[12px] text-amber-600">Verify your identity to post, react, and comment.</p>
            </div>
            <Link
              href="/verify-account"
              className="shrink-0 rounded-full bg-amber-500 px-3.5 py-1.5 text-[12px] font-bold text-white shadow hover:bg-amber-600 transition-colors"
            >
              Verify Now
            </Link>
          </div>
        </div>
      ) : null}

      <section className="space-y-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm font-medium">{t("loading_feed")}</p>
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
              className="group overflow-hidden rounded-none border-x-0 border-y border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/50 sm:rounded-[20px] sm:border"
            >
              <div className="p-4 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex gap-4">
                    {post.author_role === "admin" ? (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm shadow-md overflow-hidden">
                        {post.profiles?.avatar ? (
                          <img src={getAvatarUrl(post.profiles.avatar)!} alt="" className="h-full w-full object-cover" />
                        ) : (
                          (post.profiles?.name || "B").charAt(0)
                        )}
                      </div>
                    ) : (
                      <Link href={`/profile/${post.user_id}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm shadow-md transition-transform hover:scale-105 overflow-hidden">
                        {post.profiles?.avatar ? (
                          <img src={getAvatarUrl(post.profiles.avatar)!} alt="" className="h-full w-full object-cover" />
                        ) : (
                          (post.profiles?.name || "K").charAt(0)
                        )}
                      </Link>
                    )}
                    <div>
                      <div className="flex flex-col leading-tight">
                        {post.author_role === "admin" ? (
                          <span className="text-[16px] font-bold text-[#385898] flex items-center gap-1">
                            {post.profiles?.name || "Barangay Admin"}
                            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-blue-600">Admin</span>
                          </span>
                        ) : (
                          <Link 
                            href={`/profile/${post.user_id}`}
                            className="text-[16px] font-bold text-[#385898] transition-colors hover:underline"
                          >
                            {post.profiles?.name || "Anonymous Resident"}
                          </Link>
                        )}
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
                  <div className="flex items-center gap-2 shrink-0">
                    <button className="text-slate-300 hover:text-slate-600">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mb-3 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
                      {post.title || "No Title"}
                    </h2>
                    {post.status === "resolved" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm shrink-0">
                        <CheckCircle2 className="h-3 w-3" />Resolved
                      </span>
                    )}
                    {post.status === "in_progress" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm shrink-0">
                        <Loader2 className="h-3 w-3 animate-spin" />In Progress
                      </span>
                    )}
                    {post.status === "pending" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-400 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm shrink-0">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] font-medium leading-relaxed text-slate-500/90 dark:text-slate-400">
                    {post.description}
                  </p>
                </div>

                {post.image && (
                  <div
                    className="mb-4 mt-4 overflow-hidden rounded-xl ring-1 ring-slate-100 dark:ring-slate-600 bg-slate-50 dark:bg-slate-800 cursor-zoom-in"
                    onDoubleClick={() => setLightboxSrc(getStorageUrl(post.image!) || "")}
                    onClick={() => setLightboxSrc(getStorageUrl(post.image!) || "")}
                  >
                    <img
                      src={getStorageUrl(post.image) || ""}
                      alt={post.title || ""}
                      className="w-full object-contain pointer-events-none"
                    />
                  </div>
                )}
              </div>

              {post.status === "resolved" && (
                <div className="mx-4 mb-1 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 ring-1 ring-emerald-100">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-[12px] font-bold text-emerald-700">{t("issue_resolved")}</p>
                    <p className="text-[11px] text-emerald-600/70">{t("barangay_addressed")}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col border-t border-slate-100 dark:border-slate-700 px-4 py-2 sm:px-6">
                {/* Count Row */}
                <div className="flex justify-end border-b border-slate-50 pb-2 px-1">
                  {post.comment_count > 0 && (
                    <button 
                      onClick={() => openComments(post.id)}
                      className="text-[12px] font-medium text-slate-500 hover:underline"
                    >
                      {post.comment_count} {t("comments")}
                    </button>
                  )}
                </div>

                {/* Buttons Row */}
                <div className="relative grid grid-cols-3 gap-1 pt-1 sm:gap-2">
                  {/* Facebook-style emoji picker popup */}
                  {showingEmojiFor === post.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => { setShowingEmojiFor(null); setHoveredEmoji(null); }} />
                      <div
                        ref={emojiPickerRef}
                        className="absolute -top-16 left-0 z-20 flex items-end gap-1 rounded-full bg-white px-3 py-2.5 shadow-2xl ring-1 ring-slate-100"
                        style={{ animation: "scaleIn 0.15s ease-out" }}
                      >
                        {reactionEmojis.map((r) => (
                          <button
                            key={r.type}
                            data-reaction-type={r.type}
                            onClick={() => { handleReact(post.id, r.type); setHoveredEmoji(null); }}
                            onMouseEnter={() => setHoveredEmoji(r.type)}
                            onMouseLeave={() => setHoveredEmoji(null)}
                            title={r.label}
                            className="relative flex flex-col items-center transition-all duration-150"
                            style={{
                              transform: hoveredEmoji === r.type ? "translateY(-10px) scale(1.45)" : "translateY(0) scale(1)",
                            }}
                          >
                            <span className="text-[24px] leading-none select-none" data-reaction-type={r.type}>{r.emoji}</span>
                            {hoveredEmoji === r.type && (
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] font-bold text-white">{r.label}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Like button */}
                  {me?.is_verified || me?.role === "admin" ? (
                    <button
                      onMouseDown={() => startLongPress(post.id)}
                      onMouseUp={() => { cancelLongPress(); if (showingEmojiFor !== post.id) handleReact(post.id, "like"); }}
                      onMouseLeave={cancelLongPress}
                      onTouchStart={(e) => { e.stopPropagation(); startLongPress(post.id); }}
                      onTouchMove={handleTouchMoveReaction}
                      onTouchEnd={(e) => handleTouchEndReaction(e, post.id)}
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
                  ) : (
                    <Link href="/verify-account" className="flex min-w-0 select-none items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-bold text-slate-300 sm:gap-2 sm:text-[14px]" title="Verify your account to react">
                      <ThumbsUp size={18} className="shrink-0" />
                      <span className="truncate">Like</span>
                    </Link>
                  )}

                  {/* Comment button */}
                  {me?.is_verified || me?.role === "admin" ? (
                    <button
                      onClick={() => openComments(post.id)}
                      className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-bold text-[#65676B] transition-all hover:bg-slate-50 sm:gap-2 sm:text-[14px]"
                    >
                      <MessageCircle size={18} className="shrink-0" />
                      <span className="truncate">{t("comment")}</span>
                    </button>
                  ) : (
                    <Link href="/verify-account" className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-bold text-slate-300 sm:gap-2 sm:text-[14px]" title="Verify your account to comment">
                      <MessageCircle size={18} className="shrink-0" />
                      <span className="truncate">{t("comment")}</span>
                    </Link>
                  )}

                  <button
                    onClick={() => handleShare(post.id)}
                    className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-bold text-[#65676B] transition-all hover:bg-slate-50 sm:gap-2 sm:text-[14px]"
                  >
                    <ShareIcon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{t("share")}</span>
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

    {/* Share Modal */}
    {sharePostId !== null && (
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSharePostId(null)} />
        <div className="relative z-10 w-full max-w-sm mx-4 overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-[15px] font-bold text-slate-900">Share Post</h3>
            <button onClick={() => setSharePostId(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            {/* Copy Link */}
            <button
              onClick={copyShareLink}
              className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 text-left transition-colors hover:bg-slate-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              </div>
              <span className="text-[14px] font-semibold text-slate-700">{shareCopied ? "Link copied!" : "Copy Link"}</span>
            </button>
            {/* Share on Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => setSharePostId(null)}
              className="flex w-full items-center gap-3 rounded-2xl bg-[#1877F2]/10 px-4 py-3.5 text-left transition-colors hover:bg-[#1877F2]/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <span className="text-[14px] font-semibold text-[#1877F2]">Share on Facebook</span>
            </a>
            {/* Share on Messenger */}
            <a
              href={`fb-messenger://share?link=${encodeURIComponent(shareUrl)}`}
              onClick={() => setSharePostId(null)}
              className="flex w-full items-center gap-3 rounded-2xl bg-[#0084FF]/10 px-4 py-3.5 text-left transition-colors hover:bg-[#0084FF]/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#0084FF] to-[#A334FA] text-white">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.683V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/></svg>
              </div>
              <span className="text-[14px] font-semibold text-[#0084FF]">Send via Messenger</span>
            </a>
            {/* Share on TikTok */}
            <a
              href={`https://www.tiktok.com/share?url=${encodeURIComponent(shareUrl)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => setSharePostId(null)}
              className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 text-left transition-colors hover:bg-slate-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.53V6.76a4.85 4.85 0 01-1.02-.07z"/></svg>
              </div>
              <span className="text-[14px] font-semibold text-slate-700">Share on TikTok</span>
            </a>
          </div>
        </div>
      </div>
    )}
    <style>{`
      @keyframes scaleIn {
        from { transform: scale(0.7); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `}</style>
    </>
  );
}
