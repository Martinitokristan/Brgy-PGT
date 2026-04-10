"use client";

import { useState } from "react";
import useSWR from "swr";
import { AlertCircle, AlertCircle as AlertCircleIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getAvatarUrl } from "@/lib/utils/storage";
import { useT } from "@/lib/useT";
import CommentDrawer from "@/app/components/ui/CommentDrawer";
import ImageLightbox from "@/app/components/ui/ImageLightbox";
import VideoLightbox from "@/app/components/ui/VideoLightbox";
import { REACTION_EMOJIS, Post, PostVariant } from "@/lib/types";

// New shared components
import { PostCard } from "@/app/components/post/PostCard";
import { ReactionBar } from "@/app/components/post/ReactionBar";
import { PostForm } from "@/app/components/post/PostForm";
import { ShareModal } from "@/app/components/post/ShareModal";

// New shared hooks
import { useReactions } from "@/hooks/useReactions";
import { useFeedRealtime } from "@/hooks/useFeedRealtime";
import { usePostForm } from "@/hooks/usePostForm";

const fetcher = (url: string) => fetch(url).then((res) => { if (!res.ok) throw new Error('Failed to fetch'); return res.json(); });


export default function FeedPage() {
  const { data: me, mutate: mutateMe } = useSWR("/api/profile?action=me", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });
  const { data: posts = [], isLoading, error, mutate } = useSWR<Post[]>("/api/posts", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 5000,
  });

  // Shared hooks
  const reactions = useReactions({ mutate, userId: me?.id });
  const realtime = useFeedRealtime({ mutate });
  const postForm = usePostForm();

  // Local state
  const [isExpanding, setIsExpanding] = useState(false);
  const [showingEmojiFor, setShowingEmojiFor] = useState<number | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [videoLightboxSrc, setVideoLightboxSrc] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  
  // Share modal state
  const [sharePostId, setSharePostId] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [isSharingToFeed, setIsSharingToFeed] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const { t } = useT();

  const handleToggleAutoplay = async (nextValue: boolean) => {
    const fd = new FormData();
    fd.append("autoplay_videos", String(nextValue));
    await fetch("/api/profile", { method: "PATCH", body: fd });
    void mutateMe();
  };

  // Post management handlers
  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    void mutate();
  };

  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const handleEditSubmit = async (postId: number, data: { title: string; description: string; purpose: string; urgency_level: string }) => {
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setEditingPost(null);
      void mutate();
    }
  };

  // Event handlers
  const openComments = (postId: number) => {
    setSelectedPostId(postId);
    setIsDrawerOpen(true);
  };

  const handleShare = (postId: number) => {
    setSharePostId(postId);
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
        await mutate();
        setTimeout(() => {
          setSharePostId(null);
          setShareSuccess(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Error sharing to feed:", error);
    } finally {
      setIsSharingToFeed(false);
    }
  };

  const copyShareLink = () => {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/posts/${sharePostId}`;
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const closeShareModal = () => {
    setSharePostId(null);
    setShareCopied(false);
    setShareSuccess(false);
  };

  return (
    <>
      {/* Image Lightbox */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
      {videoLightboxSrc && (
        <VideoLightbox src={videoLightboxSrc} onClose={() => setVideoLightboxSrc(null)} />
      )}

      {/* Create Post Modal */}
      <PostForm
        isOpen={isExpanding && !editingPost}
        onClose={() => setIsExpanding(false)}
        onSubmit={async (formData) => {
          await postForm.handleSubmit(formData);
          setIsExpanding(false);
          void mutate();
        }}
        userName={me?.name || ""}
        variant="resident"
        formState={postForm}
        onMediaSelect={postForm.handleMediaSelect}
        onRemoveMedia={postForm.removeMedia}
        fileInputRef={postForm.fileInputRef}
      />

      {/* Edit Post Modal */}
      <PostForm
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onSubmit={async () => {}}
        userName={me?.name || ""}
        variant="resident"
        formState={postForm}
        onMediaSelect={postForm.handleMediaSelect}
        onRemoveMedia={postForm.removeMedia}
        fileInputRef={postForm.fileInputRef}
        editPost={editingPost}
        onEditSubmit={handleEditSubmit}
      />

      <div className="mx-auto w-full max-w-5xl space-y-6 px-0 sm:px-4">
        {/* What's on your mind? Card */}
        {me?.is_verified || me?.role === "admin" ? (
          <Card className="border-0 bg-white dark:bg-slate-900 sm:rounded-2xl sm:border sm:border-slate-200 sm:dark:border-slate-700 sm:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {me?.avatar ? (
                  <img
                    src={getAvatarUrl(me.avatar) || ""}
                    alt={me.name || ""}
                    className="h-9 w-9 shrink-0 rounded-full object-cover shadow"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow">
                    {me?.name?.charAt(0) || "U"}
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => setIsExpanding(true)}
                  className="flex-1 justify-start rounded-2xl border border-slate-900/20 dark:border-white/15 bg-white/70 dark:bg-slate-800/60 px-4 py-3 text-[14px] font-semibold text-slate-600 dark:text-slate-200 shadow-sm hover:bg-white dark:hover:bg-slate-800"
                >
                  {t("whats_on_your_mind")}, {me?.name?.split(" ")[0] || ""}?
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : me && !me.is_verified ? (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
            <ShieldCheck className="h-5 w-5" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-amber-800">Account not yet verified</p>
                <p className="text-xs text-amber-600">Verify your identity to post, react, and comment.</p>
              </div>
              <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600">
                <Link href="/verify-account">Verify Now</Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="mt-4 text-sm font-medium">{t("loading_feed")}</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-8 w-8" />
              <AlertDescription className="text-sm font-bold">Failed to load posts</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6">
            {posts.length === 0 && !isLoading && !error && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No updates to show right now.</p>
                </CardContent>
              </Card>
            )}

            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                variant="resident"
                onImageClick={setLightboxSrc}
                onVideoClick={setVideoLightboxSrc}
                isOwn={post.user_id === me?.id}
                autoplayVideos={me?.autoplay_videos ?? true}
                onToggleAutoplayVideos={handleToggleAutoplay}
                onDelete={handleDeletePost}
                onEdit={setEditingPost}
              >
                <ReactionBar
                  post={post}
                  onReact={reactions.handleReact}
                  onComment={openComments}
                  onShare={handleShare}
                  isVerified={!!(me?.is_verified || me?.role === "admin")}
                  variant="resident"
                  showEmojiPicker={showingEmojiFor === post.id}
                  onEmojiPickerToggle={setShowingEmojiFor}
                />
              </PostCard>
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
