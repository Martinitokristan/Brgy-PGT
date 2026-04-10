"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { AlertCircle } from "lucide-react";
import ImageLightbox from "@/app/components/ui/ImageLightbox";
import VideoLightbox from "@/app/components/ui/VideoLightbox";
import CommentDrawer from "@/app/components/ui/CommentDrawer";
import { PostCard } from "@/app/components/post/PostCard";
import { ReactionBar } from "@/app/components/post/ReactionBar";
import { ShareModal } from "@/app/components/post/ShareModal";
import { Post } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => { if (!res.ok) throw new Error('Failed to fetch'); return res.json(); });


export default function PostDetailPage() {
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const rawId = Number(params?.id);
  const postId = Number.isFinite(rawId) ? rawId : null;
  const highlightCommentId = (() => {
    const v = Number(searchParams?.get("comment_id"));
    return Number.isFinite(v) && v > 0 ? v : null;
  })();
  
  const { data: me } = useSWR("/api/profile?action=me", fetcher);
  const { data: post, isLoading, error, mutate } = useSWR<Post>(
    postId ? `/api/posts/${postId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const fromPolicyViolation = searchParams?.get("reason") === "policy_violation";

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [videoLightboxSrc, setVideoLightboxSrc] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showingEmojiFor, setShowingEmojiFor] = useState<number | null>(null);

  // Share modal state (same behavior as feed)
  const [sharePostId, setSharePostId] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [isSharingToFeed, setIsSharingToFeed] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Open comments automatically when coming from notifications
  useEffect(() => {
    if (searchParams?.get("focus") === "comments") {
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  const canInteract = !!(me?.is_verified || me?.role === "admin");

  const optimisticReact = async (idToReact: number, type: string) => {
    mutate((current) => {
      if (!current) return current;
      if (current.id !== idToReact) return current;

      const counts = { ...(current.reaction_counts ?? {}) } as Record<string, number>;
      const prev = current.my_reaction ?? null;

      if (prev) {
        counts[prev] = Math.max((counts[prev] ?? 1) - 1, 0);
        if (counts[prev] === 0) delete counts[prev];
      }

      const next = prev === type ? null : type;
      if (next) counts[next] = (counts[next] ?? 0) + 1;

      return { ...current, my_reaction: next, reaction_counts: counts };
    }, { revalidate: false });

    void fetch(`/api/posts/${idToReact}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reaction", type }),
    });
  };

  const handleShare = (pid: number) => {
    setSharePostId(pid);
    setShareCopied(false);
  };

  const handleShareToFeed = async () => {
    if (!sharePostId) return;
    setIsSharingToFeed(true);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original_post_id: sharePostId }),
      });
      if (response.ok) {
        setShareSuccess(true);
        setTimeout(() => {
          setSharePostId(null);
          setShareSuccess(false);
        }, 1500);
      }
    } finally {
      setIsSharingToFeed(false);
    }
  };

  const closeShareModal = () => {
    setSharePostId(null);
    setShareCopied(false);
    setShareSuccess(false);
  };

  if (isLoading) {
    return <div className="mx-auto w-full max-w-5xl px-0 sm:px-4 py-10" />;
  }

  if (error || !post) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 ring-1 ring-slate-200 dark:ring-slate-800">
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-bold">Failed to load this post.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      {videoLightboxSrc && <VideoLightbox src={videoLightboxSrc} onClose={() => setVideoLightboxSrc(null)} />}

      <div className="mx-auto w-full max-w-5xl space-y-4 px-0 sm:px-4">
        {fromPolicyViolation && (
          <div className="mx-4 sm:mx-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
            Your comment was flagged for prohibited words. This is the post where it happened.
          </div>
        )}

        <PostCard
          post={post}
          variant="resident"
          onImageClick={setLightboxSrc}
          onVideoClick={setVideoLightboxSrc}
          isOwn={post.user_id === me?.id}
          autoplayVideos={me?.autoplay_videos ?? true}
          onToggleAutoplayVideos={async (nextValue) => {
            const fd = new FormData();
            fd.append("autoplay_videos", String(nextValue));
            await fetch("/api/profile", { method: "PATCH", body: fd });
          }}
        >
          <ReactionBar
            post={post}
            onReact={optimisticReact}
            onComment={() => setIsDrawerOpen(true)}
            onShare={handleShare}
            isVerified={canInteract}
            variant="resident"
            showEmojiPicker={showingEmojiFor === post.id}
            onEmojiPickerToggle={setShowingEmojiFor}
          />
        </PostCard>
      </div>

      <CommentDrawer
        postId={postId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        me={me}
        highlightCommentId={highlightCommentId}
      />

      <ShareModal
        sharePostId={sharePostId}
        shareCopied={shareCopied}
        isSharingToFeed={isSharingToFeed}
        shareSuccess={shareSuccess}
        onClose={closeShareModal}
        onShareToFeed={handleShareToFeed}
      />
    </>
  );
}
