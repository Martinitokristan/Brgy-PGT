import { useEffect, useRef, useState } from "react";
import { AlertCircle, MoreHorizontal, Trash2, Pencil, CheckCircle, Volume2, VolumeX, Play } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./UserAvatar";
import { PostStatusBadge } from "./PostStatusBadge";
import { UrgencyBadge } from "./UrgencyBadge";
import { SharedPostContent } from "./SharedPostContent";
import { getStorageUrl, getAvatarUrl, getPostVideoUrl } from "@/lib/utils/storage";
import { Post, PostVariant, ReactionEmoji } from "@/lib/types";

interface PostCardProps {
  post: Post;
  variant: PostVariant;
  onImageClick?: (src: string) => void;
  onVideoClick?: (src: string) => void;
  children?: React.ReactNode;
  isOwn?: boolean;
  isAdmin?: boolean;
  onDelete?: (postId: number) => void;
  onEdit?: (post: Post) => void;
  onStatusUpdate?: (post: Post) => void;
  autoplayVideos?: boolean;
  onToggleAutoplayVideos?: (nextValue: boolean) => void;
}

export function PostCard({ post, variant, onImageClick, onVideoClick, children, isOwn, isAdmin, onDelete, onEdit, onStatusUpdate, autoplayVideos, onToggleAutoplayVideos }: PostCardProps) {
  const isAdminPost = post.author_role === "admin";
  const isProfileView = variant === "profile";
  const [menuOpen, setMenuOpen] = useState(false);
  const canManage = isOwn || isAdmin;
  const canShowMenu = canManage || !!onToggleAutoplayVideos;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const resumeTimeRef = useRef<number>(0);
  const resumeWasPlayingRef = useRef<boolean>(false);

  // Auto pause/resume videos in feed while scrolling (Facebook-like)
  useEffect(() => {
    if (!post.video) return;
    if (!(autoplayVideos ?? true)) return;
    const el = videoRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          // Try to resume (muted autoplay should be allowed on iOS/Android)
          el.muted = true;
          const p = el.play();
          if (p && typeof (p as any).catch === "function") (p as Promise<void>).catch(() => {});
        } else {
          // Pause when mostly out of view to save CPU/battery
          el.pause();
        }
      },
      { threshold: [0, 0.2, 0.6, 1] }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [post.video, autoplayVideos]);

  // When fullscreen lightbox closes, resume inline playback without restarting
  useEffect(() => {
    if (!post.video) return;
    const mySrc = getPostVideoUrl(post.video);
    if (!mySrc) return;

    const onClose = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { src?: string; currentTime?: number } | undefined;
      if (!detail?.src || detail.src !== mySrc) return;

      const el = videoRef.current;
      if (!el) return;

      // Restore time from fullscreen (or the last known inline time)
      const t = typeof detail.currentTime === "number" ? detail.currentTime : resumeTimeRef.current;
      if (Number.isFinite(t) && t >= 0) {
        try {
          el.currentTime = t;
        } catch {}
      }

      // Never resume with unexpected sound: follow the in-feed mute state
      el.muted = isMuted;

      if ((autoplayVideos ?? true) && resumeWasPlayingRef.current) {
        const p = el.play();
        if (p && typeof (p as any).catch === "function") (p as Promise<void>).catch(() => {});
      }
    };

    window.addEventListener("video-lightbox-close", onClose as EventListener);
    return () => window.removeEventListener("video-lightbox-close", onClose as EventListener);
  }, [post.video, autoplayVideos, isMuted]);

  const getAuthorLink = () => {
    if (variant === "admin") {
      return `/admin/users/${post.user_id}`;
    }
    if (!isAdminPost) {
      return `/profile/${post.user_id}`;
    }
    return null;
  };

  const authorLink = getAuthorLink();

  return (
    <Card className="group overflow-hidden transition-all bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 ring-slate-200 dark:ring-slate-700/60">
      <CardContent className="p-4 pb-4 sm:p-6 sm:pb-4">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex gap-4">
            {isAdminPost ? (
              <UserAvatar
                name={post.profiles?.name || "Barangay Admin"}
                avatar={post.profiles?.avatar}
                isAdmin={true}
              />
            ) : authorLink ? (
              <UserAvatar
                name={post.profiles?.name || "Anonymous Resident"}
                avatar={post.profiles?.avatar}
                href={authorLink}
              />
            ) : (
              <UserAvatar
                name={post.profiles?.name || "Anonymous Resident"}
                avatar={post.profiles?.avatar}
              />
            )}
            <div>
              <div className="flex flex-col leading-tight">
                {isAdminPost ? (
                  <span className="text-[16px] font-bold text-[#385898] dark:text-blue-400 flex items-center gap-1">
                    {post.profiles?.name || "Barangay Admin"}
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-blue-600">Admin</span>
                  </span>
                ) : authorLink ? (
                  <Link 
                    href={authorLink}
                    className="text-[16px] font-bold text-[#385898] dark:text-blue-400 transition-colors hover:underline"
                  >
                    {post.profiles?.name || "Anonymous Resident"}
                  </Link>
                ) : (
                  <span className="text-[16px] font-bold text-[#385898] dark:text-blue-400">
                    {post.profiles?.name || "Anonymous Resident"}
                  </span>
                )}
                <div className="mt-0.5 flex items-center gap-1.5 text-slate-400">
                  <AlertCircle className="h-3.5 w-3.5" /> 
                  <span className="text-[13px] font-medium">
                    • {post.purpose === "shared_post" ? "Share a post" : post.purpose || "General"}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] font-medium text-slate-400">
                  {post.created_at ? new Date(post.created_at).toLocaleString() : "Recently"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isProfileView && <PostStatusBadge status={post.status} />}
            {canShowMenu && (
              <div className="relative">
                <Button variant="ghost" size="sm" onClick={() => setMenuOpen(v => !v)}>
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
                      {onToggleAutoplayVideos && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            onToggleAutoplayVideos(!(autoplayVideos ?? true));
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          {autoplayVideos ?? true ? "Disable autoplay" : "Enable autoplay"}
                        </button>
                      )}
                      {isAdmin && onStatusUpdate && (
                        <button
                          onClick={() => { setMenuOpen(false); onStatusUpdate(post); }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <CheckCircle className="h-4 w-4" /> Update Status
                        </button>
                      )}
                      {isOwn && onEdit && (
                        <button
                          onClick={() => { setMenuOpen(false); onEdit(post); }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          <Pencil className="h-4 w-4" /> Edit Post
                        </button>
                      )}
                      {(isOwn || isAdmin) && onDelete && (
                        <button
                          onClick={() => { setMenuOpen(false); onDelete(post.id); }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" /> Delete Post
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mb-3 space-y-1">
          {post.purpose === "shared_post" && post.metadata ? (
            <SharedPostContent 
              metadata={post.metadata} 
              onImageClick={onImageClick}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
                  {post.title || "No Title"}
                </h2>
                {isProfileView && <PostStatusBadge status={post.status} />}
                {post.urgency_level && post.urgency_level !== "low" && <UrgencyBadge level={post.urgency_level} />}
              </div>
              <p className="text-[15px] font-medium leading-relaxed text-slate-500/90 dark:text-slate-400">
                {post.description}
              </p>

              {(post.video || post.image) && (
                <div
                  className="relative mb-4 mt-4 overflow-hidden rounded-xl border cursor-zoom-in bg-slate-100 dark:bg-slate-800"
                  onClick={() => {
                    if (post.image) onImageClick?.(getStorageUrl(post.image!) || "");
                  }}
                >
                  {post.video ? (
                    <>
                      <video
                        ref={videoRef}
                        src={getPostVideoUrl(post.video) || undefined}
                        className="w-full max-h-[520px] object-contain"
                        muted={isMuted}
                        autoPlay={autoplayVideos ?? true}
                        loop={autoplayVideos ?? true}
                        playsInline
                        controls={false}
                        preload="metadata"
                        onClick={(e) => {
                          // Tap video to open fullscreen (where native controls/time are visible)
                          e.stopPropagation();
                          // Prevent duplicate playback: pause inline video before opening lightbox
                          if (videoRef.current) {
                            resumeTimeRef.current = videoRef.current.currentTime || 0;
                            resumeWasPlayingRef.current = !videoRef.current.paused;
                            videoRef.current.pause();
                          }
                          const src = getPostVideoUrl(post.video);
                          if (src) onVideoClick?.(src);
                        }}
                      />

                      {/* Volume toggle (only control visible in-feed) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = !isMuted;
                          setIsMuted(next);
                          if (videoRef.current) videoRef.current.muted = next;
                        }}
                        className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/55 transition-colors"
                        aria-label={isMuted ? "Unmute video" : "Mute video"}
                      >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>

                      {/* Play icon overlay when paused (Facebook-like) */}
                      {!autoplayVideos && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const el = videoRef.current;
                            if (!el) return;
                            void el.play();
                          }}
                          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm hover:bg-black/55 transition-colors"
                          aria-label="Play"
                        >
                          <Play size={22} className="translate-x-[1px]" />
                        </button>
                      )}
                    </>
                  ) : (
                    <img
                      src={getStorageUrl(post.image) || ""}
                      alt={post.title || ""}
                      className="w-full max-h-[520px] object-contain pointer-events-none"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Status Alert for resolved posts */}
        {post.status === "resolved" && (
          <div className="mx-4 mb-1">
            <div className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Issue resolved</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">Barangay has addressed this issue</p>
            </div>
          </div>
        )}

        {/* Children (ReactionBar) */}
        {children && (
          <div className="flex flex-col border-t border-slate-100 dark:border-slate-700/60 px-4 py-2 sm:px-6">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
